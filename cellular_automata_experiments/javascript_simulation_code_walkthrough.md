# Step-by-Step Code Walkthrough: `sketch.js`

This document provides a technical, step-by-step breakdown of how the **Non-Markovian Physics & Online System Identification Testbed** works in JavaScript using **p5.js**.

---

## 1. Global State & Hidden Physics Parameters
At the top of `sketch.js`, we define the spatial grid dimensions (`40x40`), state matrices, and the **ground-truth physics parameters** that govern the environment:

* `s[x][y]`: The current energy/state value at grid cell $(x, y)$.
* `M[x][y]`: The accumulated historical memory field at grid cell $(x, y)$.
* `trueAlpha` ($\alpha$): Memory retention factor ($0.00$ to $0.90$). Controls how strongly past states persist.
* `trueBeta` ($\beta$): Memory coupling strength. Controls how much the memory field influences the current state.
* `trueNu` ($\nu$): Spatial diffusion coefficient.
* `decay` ($d$): Global energy dissipation factor ($0.96$) to prevent unbounded energy accumulation.

> **Key Concept:** The observer models (`markovObserver` and `memoryObserver`) do **not** have direct access to `trueAlpha` or `trueBeta`. They must infer them purely from observing `s`.

---

## 2. Initialization (`setup()` & `initSystem()`)
1. **Canvas Creation:** `setup()` creates a $650 \times 650$ pixel canvas and attaches it to the `#canvas-container` HTML element so the control buttons remain cleanly positioned above it.
2. **System Reset (`initSystem()`):**
   * Initializes `s` and `M` as zero-filled $40 \times 40$ 2D arrays.
   * Spawns **8 active particle agents** at random coordinates.
   * Instantiates two competing observers (`useMemory = false` and `useMemory = true`), the mathematical diagnostics engine (`SystemDiagnostics`), and the automated scientific verdict engine (`ExperimentInterpreter`).

---

## 3. The Main Simulation Loop (`draw()`)
Executed at ~60 frames per second, `draw()` orchestrates the entire scientific experiment in **5 sequential phases**:

### Phase A: Forward Prediction (Before Physics Update)
Before advancing the world forward, both observers look at the current grid `s` and generate a 1-step-ahead prediction:
```javascript
let predMarkov = markovObserver.predict(s);
let predMemory = memoryObserver.predict(s);
```

### Phase B: Ground-Truth Physics Update (`updateTrueGrid()`)
The actual environment advances one time step using a discretized **Generalized Langevin Equation (GLE)**:
1. **Spatial Diffusion:** Computes the discrete 2D Laplacian $\nabla^2 s$ using periodic boundary conditions (`getLaplacian()`).
2. **Recursive Memory Update:** Updates the hidden memory field in $\mathcal{O}(1)$ time per cell:
   $$M_{t+1}(x,y) = \alpha M_t(x,y) + s_t(x,y)$$
3. **Non-Linear Saturation:** Combines current state, diffusion, and memory, then applies a hyperbolic tangent (`Math.tanh`) bounding function to keep the system physically stable.

### Phase C: Evaluation & Online Learning (`evaluateAndLearn()`)
Now that the true next state `s` is known, both observers compare their predictions (`predMarkov`, `predMemory`) against reality:
1. **Mean Squared Error (MSE):** Calculates the average squared error across all $1,600$ grid cells.
2. **Online Gradient Descent:** The `memoryObserver` computes gradients with respect to $\hat{\alpha}$ and $\hat{\beta}$ and takes a learning step (`lr = 0.005`) toward minimizing error.
3. **Exponential Moving Average (EMA) Filtering:** Because active particles inject continuous stochastic noise, raw gradient updates oscillate. An EMA low-pass filter (`emaFactor = 0.93`) smooths out high-frequency jitter:
   $$\theta_{\text{new}} = 0.93 \cdot \theta_{\text{old}} + 0.07 \cdot \theta_{\text{target}}$$

### Phase D: Diagnostics & Automated Verdict (`SystemDiagnostics` & `ExperimentInterpreter`)
1. **`SystemDiagnostics.compute()`:**
   * **Non-Markovianity Index:** Computes the error ratio $\text{MSE}_{\text{Markov}} / \text{MSE}_{\text{Memory}}$. Values $> 1.4$ indicate strong historical dependence.
   * **Memory Horizon ($\tau$):** Calculates the characteristic memory timescale $\tau = -1 / \ln(\hat{\alpha})$.
2. **`ExperimentInterpreter.analyze()`:** Evaluates parameter velocity (`alphaVelocity`) and relative MSEs to classify the live experiment into one of four scientific states:
   * *Phase: Active Learning (Transient)*
   * *Warning: Overfitting / Noise Trap* (when $\alpha$ is small and the complex model performs worse than the simple Markovian baseline)
   * *Verdict: Strong Non-Markovian Regime*
   * *Verdict: Markovian (Memoryless) Regime*

### Phase E: Rendering (`Particle` & `drawTelemetryHUD()`)
1. **Field Heatmap:** Renders grid cell energy levels as a purple intensity field.
2. **Active Particles:** Each particle senses local spatial gradients, updates its velocity with slight thermal noise, and injects `+0.4` energy into its current cell—keeping the system in a **driven non-equilibrium state**.
3. **Telemetry HUD:** Draws the live metrics overlay, plots the rolling convergence curves (`alphaHistory` and `indexHistory`), and displays the automated scientific verdict box.

---

## 4. User Interaction (`setScenario()` & `mousePressed()`)
* **`setScenario(type, btnElement)`:** Dynamically alters `trueAlpha` and `trueBeta` on the fly without resetting the observers' learned weights, allowing you to watch the observers adapt in real time to regime shifts.
* **`mousePressed()`:** Injects an immediate `+3.5` energy spike at the clicked grid coordinate to test impulse response and recovery.