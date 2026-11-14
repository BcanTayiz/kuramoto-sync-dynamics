# Simulation Test Protocol & Numerical Analysis Plan
**Project:** Kuramoto Synchronization & Transient Dynamics  
**Framework:** Network-coupled Phase Oscillators & Ott-Antonsen Validation

---

## 1. Experimental Objectives & Hypotheses (Deney Beklentileri)

The numerical simulations are designed to test three core theoretical hypotheses derived from the analytical framework:

*   **Hypothesis 1 (Critical Threshold Behavior):** For coupling strengths below the theoretical critical value ($K < K_c$), the system remains in an incoherent state where the macroscopic order parameter vanishes in the thermodynamic limit ($r(t) \to 0$ as $t \to \infty$). For $K > K_c$, the system undergoes a second-order phase transition, yielding a non-zero stationary state $r_\infty = \sqrt{1 - K_c/K}$ (for Lorentzian frequency distributions).
*   **Hypothesis 2 (Network Topology Effects):** Replacing uniform all-to-all coupling with heterogeneous networks (e.g., Barabási-Albert scale-free networks) will lower the effective critical coupling threshold $K_c$ due to high-degree hubs acting as pacemaker synchronization centers.
*   **Hypothesis 3 (Ott-Antonsen Transient Validity):** The finite-particle microscopic simulation ($N = 1000$) averaged over an ensemble of realizations will closely match the deterministic Ott-Antonsen reduced ODE trajectory $dr/dt = -\Delta r + \frac{K}{2}r(1-r^2)$, particularly during the sigmoidal transient growth phase.

---

## 2. Parameter Space & Test Matrix

| Parameter | Symbol | Test Range / Values | Description |
| :--- | :---: | :--- | :--- |
| **Oscillator Count** | $N$ | $100, 500, 1000, 2000$ | System size for finite-size scaling analysis |
| **Coupling Strength** | $K$ | $[0.0, 5.0]$ with $\delta K = 0.1$ | Sürüş parametresi (Driving parameter across $K_c$) |
| **Frequency Spread** | $\Delta$ | $0.5, 1.0, 2.0$ | Half-width at half-maximum of Cauchy-Lorentz distribution |
| **Network Models** | $G$ | All-to-All, Erdős–Rényi ($p=0.1$), Barabási–Albert ($m=2$) | Topoloji genelleştirmesi |
| **Integration Time** | $T_{\max}$ | $50.0$ time units ($\delta t = 0.01$) | Transient ve steady-state gözlem süresi |

---

## 3. Numerical Integration Scheme

The system of ordinary differential equations (ODEs):
$$\dot{\theta}_i = \omega_i + K \sum_{j=1}^{N} A_{ij} \sin(\theta_j - \theta_i)$$
will be integrated using the **Runge-Kutta 4th Order (RK4)** method or SciPy's adaptive `solve_ivp` (`RK45`) solver to ensure numerical stability and bound phase drift errors.

---

## 4. Output Analysis & Validation Metrics

To quantitatively evaluate simulation results against analytical predictions, the following metrics will be computed and logged:

### A. Macroscopic Order Parameter Trajectory $r(t)$
*   **Metric:** Time-series of amplitude $r(t) = \left| \frac{1}{N} \sum_{j=1}^{N} e^{i\theta_j(t)} \right|$.
*   **Expected Output:** An initial exponential growth from disorder ($r_0 \approx 0$) saturating into a stable plateau $r_\infty$. 
*   **Validation:** Fit numerical $r(t)$ to the logistic solution derived from the Ott-Antonsen reduction and extract the empirical relaxation rate $\lambda_{\text{emp}}$.

### B. Stationary Phase Diagram $r_\infty(K)$
*   **Metric:** Final stationary value of $r$ as a function of coupling $K$, averaged over the last $20\%$ of the simulation time window.
*   **Expected Output:** A sharp bifurcation curve rising smoothly from $K_c$ according to mean-field scaling laws.

### C. Frequency Entrainment Histogram
*   **Metric:** Distribution of effective frequencies $\dot{\theta}_i$ at steady state.
*   **Expected Output:** A sharp Dirac delta-like peak at the collective mean frequency $\Omega$ for entrained oscillators, flanked by continuous tails for drifting oscillators.