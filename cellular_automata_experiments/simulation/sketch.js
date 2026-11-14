let cols = 40, rows = 40;
let resolution;
let s, M;

// Hidden True Physics Parameters (Unknown to Observers)
let trueNu = 0.14;
let trueBeta = 0.02;
let trueAlpha = 0.90;
let decay = 0.96;

let particles = [];
let markovObserver, memoryObserver, systemDiagnostics, experimentInterpreter;

// Live Telemetry History Buffers
let alphaHistory = [];
let indexHistory = [];
const maxHistoryLength = 120;

function setup() {
    let canvas = createCanvas(650, 650);
    canvas.parent('canvas-container');
    resolution = width / cols;
    initSystem();
}

function initSystem() {
    s = createMatrix(cols, rows);
    M = createMatrix(cols, rows);
    particles = [];

    for (let i = 0; i < 8; i++) {
        particles.push(new Particle(random(100, width - 100), random(100, height - 100)));
    }

    markovObserver = new ObserverOperator(false);
    memoryObserver = new ObserverOperator(true);
    systemDiagnostics = new SystemDiagnostics();
    experimentInterpreter = new ExperimentInterpreter();

    alphaHistory = [];
    indexHistory = [];
}

function setScenario(type, btnElement) {
    if (type === 'short')  { trueAlpha = 0.40; trueBeta = 0.03; }
    if (type === 'long')   { trueAlpha = 0.90; trueBeta = 0.02; }
    if (type === 'markov') { trueAlpha = 0.00; trueBeta = 0.00; }

    alphaHistory = [];
    indexHistory = [];

    // Update active button state in DOM
    if (btnElement) {
        document.querySelectorAll('.controls button').forEach(b => b.classList.remove('active'));
        btnElement.classList.add('active');
    }
}

function resetSimulation() {
    initSystem();
}

function draw() {
    background(9, 9, 18);

    // 1. Prediction & Ground-Truth Physics Step
    let predMarkov = markovObserver.predict(s);
    let predMemory = memoryObserver.predict(s);

    updateTrueGrid();

    markovObserver.evaluateAndLearn(s, predMarkov);
    memoryObserver.evaluateAndLearn(s, predMemory);

    // 2. Mathematical Diagnostics & Automated Scientific Interpretation
    systemDiagnostics.compute(markovObserver, memoryObserver, memoryObserver.learnedAlpha);
    experimentInterpreter.analyze(markovObserver, memoryObserver, systemDiagnostics);

    if (frameCount % 2 === 0) {
        alphaHistory.push(memoryObserver.learnedAlpha);
        indexHistory.push(systemDiagnostics.nonMarkovianIndex);
        if (alphaHistory.length > maxHistoryLength) {
            alphaHistory.shift();
            indexHistory.shift();
        }
    }

    // 3. Visualization: Recursive Memory Field
    noStroke();
    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            let val = constrain(s[x][y] * 130, 0, 255);
            if (val > 4) {
                fill(val * 0.45, val * 0.2, val);
                rect(x * resolution, y * resolution, resolution, resolution);
            }
        }
    }

    // 4. Active Particle Agents
    for (let p of particles) {
        p.update();
        p.display();
    }

    // 5. Telemetry HUD & Automated Verdict Panel
    drawTelemetryHUD();
}

function updateTrueGrid() {
    let nextS = createMatrix(cols, rows);
    for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
            let lap = getLaplacian(s, x, y);
            M[x][y] = trueAlpha * M[x][y] + s[x][y];
            let raw = (s[x][y] + trueNu * lap + trueBeta * M[x][y]) * decay;
            nextS[x][y] = 5.0 * Math.tanh(raw / 5.0);
        }
    }
    s = nextS;
}

class ObserverOperator {
    constructor(useMemory) {
        this.useMemory = useMemory;
        this.estM = createMatrix(cols, rows);
        this.learnedAlpha = 0.50;
        this.learnedBeta = 0.01;
        this.prevAlpha = 0.50;
        this.alphaVelocity = 0;
        this.mse = 0;

        // Exponential Moving Average (EMA) Low-Pass Smoothing Factor
        this.emaFactor = 0.93;
    }

    predict(currentS) {
        let prediction = createMatrix(cols, rows);
        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                let lap = getLaplacian(currentS, x, y);
                if (this.useMemory) {
                    this.estM[x][y] = this.learnedAlpha * this.estM[x][y] + currentS[x][y];
                    let raw = (currentS[x][y] + trueNu * lap + this.learnedBeta * this.estM[x][y]) * decay;
                    prediction[x][y] = 5.0 * Math.tanh(raw / 5.0);
                } else {
                    let raw = (currentS[x][y] + trueNu * lap) * decay;
                    prediction[x][y] = 5.0 * Math.tanh(raw / 5.0);
                }
            }
        }
        return prediction;
    }

    evaluateAndLearn(actualS, predictedS) {
        let totalSqErr = 0;
        let gradBeta = 0;
        let gradAlpha = 0;

        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                let err = actualS[x][y] - predictedS[x][y];
                totalSqErr += err * err;
                if (this.useMemory) {
                    gradBeta += err * this.estM[x][y];
                    gradAlpha += err * this.learnedBeta * this.estM[x][y];
                }
            }
        }

        this.mse = totalSqErr / (cols * rows);

        if (this.useMemory) {
            this.prevAlpha = this.learnedAlpha;
            let lr = 0.005;

            // 1. Raw Online Gradient Descent Update
            let targetAlpha = constrain(this.learnedAlpha + lr * 2.0 * gradAlpha, 0, 0.99);
            let targetBeta  = constrain(this.learnedBeta + lr * gradBeta, 0, 0.15);

            // 2. Apply EMA Smoothing Filter to Suppress Non-Equilibrium Jitter
            this.learnedAlpha = this.emaFactor * this.learnedAlpha + (1 - this.emaFactor) * targetAlpha;
            this.learnedBeta  = this.emaFactor * this.learnedBeta + (1 - this.emaFactor) * targetBeta;

            this.alphaVelocity = Math.abs(this.learnedAlpha - this.prevAlpha);
        }
    }
}

class SystemDiagnostics {
    constructor() {
        this.nonMarkovianIndex = 1.0;
        this.memoryHorizon = 0;
        this.alphaError = 0;
    }

    compute(markov, memory, currentAlpha) {
        if (memory.mse > 0.000001) {
            this.nonMarkovianIndex = markov.mse / memory.mse;
        }

        if (currentAlpha > 0.01 && currentAlpha < 0.99) {
            this.memoryHorizon = -1.0 / Math.log(currentAlpha);
        } else if (currentAlpha >= 0.99) {
            this.memoryHorizon = 100.0;
        } else {
            this.memoryHorizon = 0.0;
        }

        this.alphaError = Math.abs(trueAlpha - currentAlpha);
    }
}

class ExperimentInterpreter {
    constructor() {
        this.regimeTitle = "INITIALIZING...";
        this.explanation = "";
        this.verdictColor = [255, 255, 255];
    }

    analyze(markov, memory, diag) {
        if (memory.alphaVelocity > 0.002) {
            this.regimeTitle = "PHASE: ACTIVE LEARNING (TRANSIENT)";
            this.explanation = "Observer is discovering the underlying physics law; EMA filter smoothing trajectory.";
            this.verdictColor = [100, 200, 255];
            return;
        }

        if (memory.mse > markov.mse * 1.15) {
            this.regimeTitle = "WARNING: OVERFITTING / NOISE TRAP";
            this.explanation = "Environment is near-Markovian. Complex memory model injects estimation noise. Prefer simple model.";
            this.verdictColor = [255, 160, 50];
            return;
        }

        if (diag.nonMarkovianIndex > 1.4) {
            this.regimeTitle = "VERDICT: STRONG NON-MARKOVIAN REGIME";
            this.explanation = `Historical memory dominates (Horizon: ${diag.memoryHorizon.toFixed(1)} steps). Memory observer captured true physics.`;
            this.verdictColor = [0, 255, 180];
            return;
        }

        this.regimeTitle = "VERDICT: MARKOVIAN (MEMORYLESS) REGIME";
        this.explanation = "Past states have negligible influence. By Occam's Razor, the simple Markovian model suffices.";
        this.verdictColor = [220, 220, 220];
    }
}

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = random(-2, 2);
        this.vy = random(-2, 2);
    }

    update() {
        this.x = (this.x + width) % width;
        this.y = (this.y + height) % height;
        let gx = floor(this.x / resolution);
        let gy = floor(this.y / resolution);

        let fieldX = s[(gx + 1) % cols][gy] - s[(gx - 1 + cols) % cols][gy];
        let fieldY = s[gx][(gy + 1) % rows] - s[gx][(gy - 1 + rows) % rows];

        this.vx = constrain(this.vx * 0.98 - 0.08 * fieldX + random(-0.05, 0.05), -4, 4);
        this.vy = constrain(this.vy * 0.98 - 0.08 * fieldY + random(-0.05, 0.05), -4, 4);
        this.x += this.vx;
        this.y += this.vy;

        s[gx][gy] += 0.4;
    }

    display() {
        fill(255, 210, 60);
        circle(this.x, this.y, 9);
    }
}

function drawTelemetryHUD() {
    fill(10, 12, 24, 235);
    stroke(40, 45, 70);
    rect(10, 10, 470, 235, 6);
    noStroke();

    textSize(11);
    fill(255);
    text(`TRUE PHYSICS -> True α: ${trueAlpha.toFixed(2)} | True β: ${trueBeta.toFixed(2)}`, 20, 30);

    fill(255, 90, 90);
    text(`Markovian MSE              : ${(markovObserver.mse * 1000).toFixed(4)}`, 20, 50);

    fill(0, 255, 180);
    text(`Memory Observer MSE        : ${(memoryObserver.mse * 1000).toFixed(4)}`, 20, 68);
    text(`Learned α (α_hat) [EMA]    : ${memoryObserver.learnedAlpha.toFixed(3)} (Error: ${systemDiagnostics.alphaError.toFixed(3)})`, 20, 86);

    fill(220, 220, 100);
    text(`Non-Markovianity Index     : ${systemDiagnostics.nonMarkovianIndex.toFixed(2)}x | Horizon (τ): ${systemDiagnostics.memoryHorizon.toFixed(1)} steps`, 20, 108);

    // Live Convergence Plot
    let gx = 20, gy = 120, gw = 450, gh = 35;
    fill(15, 18, 32);
    rect(gx, gy, gw, gh, 4);

    noFill();
    stroke(0, 255, 180, 200);
    strokeWeight(1.5);
    beginShape();
    for (let i = 0; i < alphaHistory.length; i++) {
        let px = map(i, 0, maxHistoryLength, gx, gx + gw);
        let py = map(alphaHistory[i], 0, 1, gy + gh, gy);
        vertex(px, py);
    }
    endShape();

    stroke(220, 220, 100, 150);
    beginShape();
    for (let i = 0; i < indexHistory.length; i++) {
        let px = map(i, 0, maxHistoryLength, gx, gx + gw);
        let py = map(constrain(indexHistory[i], 0, 5), 0, 5, gy + gh, gy);
        vertex(px, py);
    }
    endShape();
    noStroke();

    // Automated Scientific Verdict Box
    fill(20, 24, 42);
    rect(20, 165, 450, 68, 4);

    fill(experimentInterpreter.verdictColor[0], experimentInterpreter.verdictColor[1], experimentInterpreter.verdictColor[2]);
    textStyle(BOLD);
    text(experimentInterpreter.regimeTitle, 30, 183);

    textStyle(NORMAL);
    fill(210);
    text(experimentInterpreter.explanation, 30, 199, 430, 42);
}

function getLaplacian(grid, x, y) {
    let above = grid[x][(y - 1 + rows) % rows];
    let below = grid[x][(y + 1) % rows];
    let left  = grid[(x - 1 + cols) % cols][y];
    let right = grid[(x + 1) % cols][y];
    return above + below + left + right - 4 * grid[x][y];
}

function mousePressed() {
    let gx = floor(mouseX / resolution);
    let gy = floor(mouseY / resolution);
    if (gx >= 0 && gx < cols && gy >= 0 && gy < rows) {
        s[gx][gy] += 3.5;
    }
}

function createMatrix(c, r) {
    return Array.from({ length: c }, () => new Array(r).fill(0));
}