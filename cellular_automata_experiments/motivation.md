# Theoretical Background: Non-Markovian Operator Learning and Thermodynamic Consistency in Complex Systems

## 1. Introduction: From Markovian Assumptions to Temporal Memory
Traditional physical modeling and standard Physics-Informed Neural Networks (PINNs) rely heavily on **Markovian assumptions**. In a Markovian system, the future state $u(t + \Delta t)$ depends solely on the current state $u(t)$ and instantaneous spatial derivatives:

$$\frac{\partial u}{\partial t} = \mathcal{L}[u(t)]$$

However, complex non-equilibrium systems—such as glassy polymers, active matter, turbulence, and dense cellular automata with feedback—exhibit **temporal memory and non-locality**. The system's past history directly dictates its future evolution through fading echoes of previous states, requiring an integral over past trajectories rather than an instantaneous derivative.

---

## 2. The Mori-Zwanzig Formalism and Generalized Langevin Equations
To rigorously derive where memory comes from, statistical mechanics utilizes projection operator techniques pioneered by Robert Zwanzig (the **Mori-Zwanzig Formalism**). 

When a high-dimensional microscopic system is projected onto a lower-dimensional macro-variable subspace (retaining only slow variables while "projecting out" fast, unobserved degrees of freedom), the exact equation of motion splits into three distinct components:

1. **Markovian Streaming Term:** The immediate response driven by the current state.
2. **Volterra Memory Integral:** A history-dependent damping term accounting for the feedback of unresolved fast variables:
   $$\int_{0}^{t} K(t - \tau) \mathcal{N}[u(\tau)] \, d\tau$$
3. **Random Noise (Fluctuations):** Stochastic forces arising from initial microscopic fluctuations.

This yields the **Generalized Langevin Equation (GLE)**, where the memory kernel $K(t - \tau)$ links past history to current acceleration or evolution rates.

---

## 3. Mathematical Parameterization of Memory Kernels
Inverting Volterra integral equations from discrete time-series data is notoriously ill-posed. To ensure physical validity and numerical stability without exploding computational complexity ($\mathcal{O}(T^2)$), memory kernels must satisfy physical decay properties.

* **Completely Monotone Functions:** According to Bernstein's theorem, physical dissipation kernels can be represented as a positive superposition of decaying exponentials (a **Prony series**):
  $$K(\Delta t) = \sum_{i=1}^{M} w_i e^{-\lambda_i \Delta t}, \quad w_i > 0, \; \lambda_i > 0$$
* **State-Space Embedding:** By parameterizing the kernel as a sum of exponentials, the computationally expensive history integral can be rewritten as a local set of coupled ordinary differential equations, reducing complexity from $\mathcal{O}(T^2)$ to $\mathcal{O}(T)$.

---

## 4. Thermodynamic Consistency and Dissipation Bounds
Unconstrained machine learning models often drift during long autoregressive rollouts, violating fundamental physical laws (e.g., creating energy out of nothing or violating entropy bounds). 

To enforce **thermodynamic consistency**, models must respect a Lyapunov functional (such as a discrete Free Energy $F[u]$):

* **Free Energy Functional:** For a relaxational field, free energy is defined by spatial gradients and magnitude:
  $$F^{(t)} = \frac{1}{2} \sum_{i,j} \left( (s_{i,j}^{(t)})^2 + (\nabla_x s_{i,j}^{(t)})^2 + (\nabla_y s_{i,j}^{(t)})^2 \right)$$
* **The Second Law Constraint:** The dissipation rate must be non-positive to prevent unphysical energy growth:
  $$\frac{dF}{dt} \approx \frac{F^{(t+1)} - F^{(t)}}{\Delta t} \le 0$$
  This constraint is embedded either as a hard architectural constraint or as a targeted regularization penalty in the loss landscape ($\mathcal{L}_{\text{thermo}} = \text{ReLU}(\Delta F)$).

---