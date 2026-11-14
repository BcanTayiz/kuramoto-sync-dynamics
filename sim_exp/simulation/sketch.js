/**
 * DataCollector & Automated Scientific Evaluator
 * Measures order parameter trajectory r(t), compares with Ott-Antonsen theory,
 * computes stationary mean/variance, and generates automated diagnostic commentary.
 */
class DataCollector {
  constructor(maxHistory = 450) {
    this.maxHistory = maxHistory;
    this.history = []; // Stores { t, r, r_theory, psi, omega_std }
    this.startTime = 0;
  }

  reset(currentTime = 0) {
    this.history = [];
    this.startTime = currentTime;
  }

  record(t, r, psi, K, delta, velocities) {
    const Kc = 2.0 * delta; // Exact critical threshold for Cauchy-Lorentz distribution
    const rTheory = K > Kc ? Math.sqrt(1.0 - Kc / K) : 0.0;

    // Standard deviation of instantaneous frequencies (measures frequency entrainment)
    const meanVel = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const varianceVel =
      velocities.reduce((acc, v) => acc + (v - meanVel) ** 2, 0) / velocities.length;
    const omegaStd = Math.sqrt(varianceVel);

    this.history.push({
      t: Number((t - this.startTime).toFixed(3)),
      r: Number(r.toFixed(4)),
      rTheory: Number(rTheory.toFixed(4)),
      psi: Number(psi.toFixed(4)),
      omegaStd: Number(omegaStd.toFixed(4)),
      K,
      delta
    });

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  getLatest() {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  getStationaryStats() {
    if (this.history.length < 30) return null;
    const windowSize = Math.min(80, Math.floor(this.history.length * 0.3));
    const slice = this.history.slice(-windowSize);
    const meanR = slice.reduce((acc, d) => acc + d.r, 0) / slice.length;
    const stdR = Math.sqrt(
      slice.reduce((acc, d) => acc + (d.r - meanR) ** 2, 0) / slice.length
    );
    return { meanR, stdR };
  }

  evaluateExperiment(K, delta, topology) {
    const latest = this.getLatest();
    if (!latest) return "Initializing data collector...";

    const Kc = 2.0 * delta;
    const r = latest.r;
    const rTheory = latest.rTheory;
    const stats = this.getStationaryStats();
    const error = Math.abs(r - rTheory);

    let regime = "";
    let commentary = "";

    if (K < Kc * 0.95) {
      regime = "SUBCRITICAL REGIME (Incoherent Disorder)";
      commentary =
        `Coupling K=${K.toFixed(2)} is below critical threshold Kc=${Kc.toFixed(2)}. ` +
        `Phase coherence decays toward finite-size fluctuation floor (r ≈ ${r.toFixed(3)}). ` +
        `Oscillators drift independently at their natural Cauchy-Lorentz frequencies.`;
    } else if (K >= Kc * 0.95 && K <= Kc * 1.1) {
      regime = "CRITICAL BIFURCATION ZONE (Phase Transition Onset)";
      commentary =
        `K=${K.toFixed(2)} sits near critical threshold Kc=${Kc.toFixed(2)}. ` +
        `Critical slowing down occurs: relaxation time τ diverges and r(t) exhibits large fluctuations.`;
    } else {
      regime = "SUPERCRITICAL REGIME (Global Synchronization)";
      if (topology === "all-to-all") {
        const matchQuality = error < 0.06 ? "closely matches" : "is still converging toward";
        commentary =
          `K=${K.toFixed(2)} > Kc=${Kc.toFixed(2)}. Empirical r=${r.toFixed(3)} ${matchQuality} ` +
          `Ott-Antonsen prediction r∞=${rTheory.toFixed(3)} (Δr=${error.toFixed(3)}). ` +
          `Frequency spread dropped to σ(ω)=${latest.omegaStd.toFixed(3)}, confirming phase-locking.`;
      } else {
        commentary =
          `Non-trivial topology (${topology}) active. Empirical r=${r.toFixed(3)} vs Mean-Field r∞=${rTheory.toFixed(3)}. ` +
          `Sparse connectivity alters effective coupling strength and delays transient convergence.`;
      }
    }

    if (stats && stats.stdR < 0.015 && latest.t > 4.0) {
      commentary += ` [Steady-state equilibrium verified: σ_r=${stats.stdR.toFixed(4)}]`;
    } else {
      commentary += ` [Transient relaxation in progress...]`;
    }

    return { regime, commentary, Kc, rTheory };
  }

  exportJSON(metadata) {
    const payload = {
      experimentMetadata: metadata,
      evaluation: this.evaluateExperiment(metadata.K, metadata.delta, metadata.topology),
      timeSeries: this.history
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kuramoto_experiment_K${metadata.K}_D${metadata.delta}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// ============================================================================
// SIMULATION PARAMETERS & STATE
// ============================================================================
const N = 120; // Number of oscillators
let theta = new Float64Array(N);
let baseOmega = new Float64Array(N); // Standard Cauchy samples (scale = 1)
let omega = new Float64Array(N);     // Scaled natural frequencies
let velocities = new Float64Array(N);
let adjMatrix = [];

let K = 2.5;
let delta = 1.0;
let topology = "all-to-all";
let simTime = 0;
const dt = 0.025;

let collector = new DataCollector(480);

// UI Elements
let sliderK, sliderDelta, selectTopo;

function setup() {
  const canvas = createCanvas(960, 560);
  canvas.parent("canvas-container");

  sliderK = document.getElementById("slider-k");
  sliderDelta = document.getElementById("slider-delta");
  selectTopo = document.getElementById("select-topo");

  sliderK.addEventListener("input", () => {
    K = parseFloat(sliderK.value);
    document.getElementById("val-k").textContent = K.toFixed(2);
  });

  sliderDelta.addEventListener("input", () => {
    delta = parseFloat(sliderDelta.value);
    document.getElementById("val-delta").textContent = delta.toFixed(2);
    updateFrequencies();
  });

  selectTopo.addEventListener("change", () => {
    topology = selectTopo.value;
    buildTopology(topology);
    resetSimulation();
  });

  document.getElementById("btn-reset").addEventListener("click", resetSimulation);
  document.getElementById("btn-export").addEventListener("click", () => {
    collector.exportJSON({ N, K, delta, topology, dt, simTime });
  });

  generateBaseFrequencies();
  buildTopology(topology);
  resetSimulation();
}

// Generate Cauchy-Lorentz distributed natural frequencies via inverse transform sampling
function generateBaseFrequencies() {
  for (let i = 0; i < N; i++) {
    // Deterministic stratified sampling + slight jitter avoids extreme outliers while preserving Cauchy tails
    const u = (i + 0.5) / N;
    baseOmega[i] = Math.tan(Math.PI * (u - 0.5));
  }
  updateFrequencies();
}

function updateFrequencies() {
  for (let i = 0; i < N; i++) {
    omega[i] = delta * baseOmega[i];
  }
}

function buildTopology(type) {
  adjMatrix = Array.from({ length: N }, () => new Float32Array(N));

  if (type === "all-to-all") {
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        if (i !== j) adjMatrix[i][j] = 1.0 / N;
      }
    }
  } else if (type === "erdos-renyi") {
    const p = 0.15;
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        if (Math.random() < p) {
          adjMatrix[i][j] = 1.0 / (N * p);
          adjMatrix[j][i] = 1.0 / (N * p);
        }
      }
    }
  } else if (type === "watts-strogatz") {
    const kNeighbors = 6;
    const rewireProb = 0.15;
    for (let i = 0; i < N; i++) {
      for (let step = 1; step <= kNeighbors / 2; step++) {
        let target = (i + step) % N;
        if (Math.random() < rewireProb) {
          target = Math.floor(Math.random() * N);
        }
        if (target !== i) {
          adjMatrix[i][target] = 1.0 / kNeighbors;
          adjMatrix[target][i] = 1.0 / kNeighbors;
        }
      }
    }
  }
}

function resetSimulation() {
  for (let i = 0; i < N; i++) {
    theta[i] = Math.random() * TWO_PI;
  }
  simTime = 0;
  collector.reset(0);
}

// ============================================================================
// NUMERICAL INTEGRATION (RK4)
// ============================================================================
function computeDerivatives(stateTheta) {
  const dTheta = new Float64Array(N);

  if (topology === "all-to-all") {
    // O(N) Mean-Field exact reduction: (K/N) sum sin(theta_j - theta_i) = K * r * sin(psi - theta_i)
    let sumCos = 0;
    let sumSin = 0;
    for (let j = 0; j < N; j++) {
      sumCos += Math.cos(stateTheta[j]);
      sumSin += Math.sin(stateTheta[j]);
    }
    const rCos = sumCos / N;
    const rSin = sumSin / N;

    for (let i = 0; i < N; i++) {
      // Im(r * e^{i*psi} * e^{-i*theta_i}) = rSin * cos(theta_i) - rCos * sin(theta_i)
      const coupling = K * (rSin * Math.cos(stateTheta[i]) - rCos * Math.sin(stateTheta[i]));
      dTheta[i] = omega[i] + coupling;
    }
  } else {
    // O(N^2) General Network Adjacency Coupling
    for (let i = 0; i < N; i++) {
      let sum = 0;
      const row = adjMatrix[i];
      const ti = stateTheta[i];
      for (let j = 0; j < N; j++) {
        if (row[j] !== 0) {
          sum += row[j] * Math.sin(stateTheta[j] - ti);
        }
      }
      dTheta[i] = omega[i] + K * sum;
    }
  }
  return dTheta;
}

function stepRK4() {
  const k1 = computeDerivatives(theta);

  const t2 = new Float64Array(N);
  for (let i = 0; i < N; i++) t2[i] = theta[i] + 0.5 * dt * k1[i];
  const k2 = computeDerivatives(t2);

  const t3 = new Float64Array(N);
  for (let i = 0; i < N; i++) t3[i] = theta[i] + 0.5 * dt * k2[i];
  const k3 = computeDerivatives(t3);

  const t4 = new Float64Array(N);
  for (let i = 0; i < N; i++) t4[i] = theta[i] + dt * k3[i];
  const k4 = computeDerivatives(t4);

  for (let i = 0; i < N; i++) {
    velocities[i] = (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6.0;
    theta[i] = (theta[i] + dt * velocities[i]) % TWO_PI;
    if (theta[i] < 0) theta[i] += TWO_PI;
  }
  simTime += dt;
}

function computeOrderParameter() {
  let sumCos = 0;
  let sumSin = 0;
  for (let i = 0; i < N; i++) {
    sumCos += Math.cos(theta[i]);
    sumSin += Math.sin(theta[i]);
  }
  const x = sumCos / N;
  const y = sumSin / N;
  return {
    r: Math.hypot(x, y),
    psi: Math.atan2(y, x)
  };
}

// ============================================================================
// RENDERING & VISUALIZATION
// ============================================================================
function draw() {
  background("#0b0e14");

  // Perform 2 sub-steps per frame for smooth, accurate integration
  for (let s = 0; s < 2; s++) {
    stepRK4();
  }

  const { r, psi } = computeOrderParameter();
  collector.record(simTime, r, psi, K, delta, velocities);

  drawUnitCirclePanel(210, 210, 145, r, psi);
  drawTimeSeriesPanel(420, 45, 510, 290);
  drawDiagnosticPanel(30, 385, 900, 150);
}

function drawUnitCirclePanel(cx, cy, radius, r, psi) {
  push();
  translate(cx, cy);

  // Panel title
  fill("#94a3b8");
  noStroke();
  textSize(13);
  textAlign(CENTER);
  text("Phase Unit Circle & Order Vector", 0, -radius - 28);

  // Outer ring & axes
  noFill();
  stroke("#1e293b");
  strokeWeight(2);
  ellipse(0, 0, radius * 2);

  stroke("#1e293b");
  strokeWeight(1);
  line(-radius - 10, 0, radius + 10, 0);
  line(0, -radius - 10, 0, radius + 10);

  // Draw individual oscillators
  for (let i = 0; i < N; i++) {
    const px = radius * Math.cos(theta[i]);
    const py = radius * Math.sin(theta[i]);

    // Color based on natural frequency sign (blue = slow/negative, amber = fast/positive)
    const normOmega = constrain(baseOmega[i] / 3.0, -1, 1);
    const col = lerpColor(color("#38bdf8"), color("#f59e0b"), (normOmega + 1) * 0.5);
    col.setAlpha(190);

    fill(col);
    noStroke();
    ellipse(px, py, 7, 7);
  }

  // Draw Centroid Order Parameter Vector r * e^(i*psi)
  const vx = radius * r * Math.cos(psi);
  const vy = radius * r * Math.sin(psi);

  stroke("#10b981");
  strokeWeight(3);
  line(0, 0, vx, vy);

  fill("#10b981");
  noStroke();
  ellipse(vx, vy, 10, 10);

  // Readout below circle
  fill("#e2e8f0");
  textSize(13);
  text(`r(t) = ${r.toFixed(3)}   |   ψ(t) = ${psi.toFixed(2)} rad`, 0, radius + 32);
  pop();
}

function drawTimeSeriesPanel(x, y, w, h) {
  push();
  translate(x, y);

  // Frame
  fill("#111620");
  stroke("#1e293b");
  strokeWeight(1.5);
  rect(0, 0, w, h, 6);

  // Title
  fill("#94a3b8");
  noStroke();
  textSize(13);
  textAlign(LEFT);
  text("Transient Evolution: Empirical r(t) vs. Ott-Antonsen Theory r∞", 12, -12);

  // Grid lines (0.0, 0.5, 1.0)
  stroke("#1e293b");
  strokeWeight(1);
  for (let val of [0.25, 0.5, 0.75]) {
    const gy = map(val, 0, 1, h - 20, 20);
    line(35, gy, w - 15, gy);
    fill("#64748b");
    noStroke();
    textSize(10);
    text(val.toFixed(2), 6, gy + 3);
    stroke("#1e293b");
  }

  const hist = collector.history;
  if (hist.length > 1) {
    // 1. Theoretical Stationary Line r_infinity (Dashed Amber)
    const rTheory = hist[hist.length - 1].rTheory;
    const ty = map(rTheory, 0, 1, h - 20, 20);
    stroke("#f59e0b");
    strokeWeight(1.5);
    drawingContext.setLineDash([6, 6]);
    line(35, ty, w - 15, ty);
    drawingContext.setLineDash([]);

    // 2. Empirical r(t) Curve (Solid Emerald)
    noFill();
    stroke("#10b981");
    strokeWeight(2.2);
    beginShape();
    for (let i = 0; i < hist.length; i++) {
      const px = map(i, 0, collector.maxHistory - 1, 35, w - 15);
      const py = map(hist[i].r, 0, 1, h - 20, 20);
      vertex(px, py);
    }
    endShape();
  }

  // Legend
  noStroke();
  fill("#10b981");
  rect(w - 210, 12, 10, 10, 2);
  fill("#cbd5e1");
  textSize(11);
  text("Empirical r(t)", w - 194, 21);

  fill("#f59e0b");
  rect(w - 110, 12, 10, 10, 2);
  fill("#cbd5e1");
  text("OA Theory r∞", w - 94, 21);

  pop();
}

function drawDiagnosticPanel(x, y, w, h) {
  push();
  translate(x, y);

  fill("#111620");
  stroke("#1e293b");
  strokeWeight(1.5);
  rect(0, 0, w, h, 8);

  const report = collector.evaluateExperiment(K, delta, topology);
  const latest = collector.getLatest();

  // Header Badge
  fill("#38bdf8");
  noStroke();
  textSize(12);
  textStyle(BOLD);
  text("DATA COLLECTOR & AUTOMATED EXPERIMENT ANALYSIS", 18, 26);

  if (typeof report === "object" && latest) {
    fill("#10b981");
    text(`REGIME: ${report.regime}`, 420, 26);

    textStyle(NORMAL);
    fill("#94a3b8");
    textSize(12);
    text(
      `Sim Time: ${latest.t.toFixed(1)}s   |   Critical Threshold Kc = 2Δ = ${report.Kc.toFixed(2)}   |   ` +
      `Theoretical r∞ = ${report.rTheory.toFixed(3)}   |   Velocity Spread σ(ω) = ${latest.omegaStd.toFixed(3)}`,
      18,
      52
    );

    // Automated Commentary Box
    fill("#e2e8f0");
    textSize(13);
    text(report.commentary, 18, 76, w - 36, 65);
  }
  pop();
}