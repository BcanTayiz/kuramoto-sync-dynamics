# Co-Evolutionary Adaptive Kuramoto Model

[![Python Version](https://img.shields.io/badge/python-3.8%2B-blue.svg)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status: Active Research](https://img.shields.io/badge/status-active%20research-success.svg)]()

Numerical simulation framework and parameter sweep pipeline investigating **plasticity-induced synchronization** and functional regimes in co-evolutionary complex networks.

---

## 📌 Overview
Classical models of synchronization (e.g., the Kuramoto model) typically assume a static, time-invariant network topology ($A_{ij}$). This repository implements a **co-evolutionary extension** where network connection weights ($W_{ij}$) and oscillator phases ($\theta_i$) evolve simultaneously through a Hebbian-like adaptive plasticity feedback loop. 

By running systematic parameter sweeps over the phase coherence threshold ($\theta_c$), this framework maps out operational windows, steady-state order parameters ($r_\infty$), and global synchronization transitions.

---

## 🔬 Mathematical Framework

### 1. Phase Dynamics
The evolution of phase $\theta_i$ for oscillator $i$ is governed by:
$$\dot{\theta}_i = \omega_i + \frac{1}{N} \sum_{j=1}^{N} W_{ij}(t) \sin(\theta_j - \theta_i)$$
where $\omega_i$ represents natural frequencies and $W_{ij}(t)$ is the dynamic adjacency/weight matrix.

### 2. Adaptive Weight Evolution (Hebbian Plasticity)
Network topology evolves according to local phase alignment:
$$\frac{dW_{ij}}{dt} = -\alpha W_{ij} + \nu \, \Theta \Big( \cos(\theta_j - \theta_i) - \cos(\theta_c) \Big) W_{ij}$$
* $\alpha$: Intrinsic weight decay / forgetting rate.
* $\nu$: Plasticity learning rate.
* $\theta_c$: Critical phase coherence threshold angle.
* $\Theta(\cdot)$: Heaviside step function.

---

## 📊 Key Findings & Functional Window

Our automated parameter sweep pipeline across varying phase thresholds revealed the following steady-state metrics:

| Metric / Parameter | Quantitative Result |
| :--- | :--- |
| **Functional Synchronization Window** | $[70^\circ, 290^\circ]$ |
| **Optimal Phase Threshold ($\theta_c$)** | $185^\circ$ |
| **Steady-State Coherence ($r_\infty$)** | $0.9762$ |
| **Mean Network Weight ($\langle W \rangle$)** | $3.9600$ |
| **Dynamical Regime** | Global Synchronization |

---

## ⚙️ Quickstart

### Prerequisites
* Python 3.8+
* NumPy



### Repository Structure
```
├── LICENSE.txt
├── README.md
├── final_results/
│   ├── article/
│   │   ├── article.pdf
├── research/
│   ├── new_theory/
│   │   ├── Co-evolutionary Adaptive Kuramoto Model.md
│   │   ├── experiment/
│   │   │   ├── code.ipynb
│   ├── theory/
│   │   ├── kuramoto_model_mathematical_formulation.pdf
├── sim_exp/
│   ├── experiment_detials.md
│   ├── experiment_test.ipynb
│   ├── simulation/
│   │   ├── index.html
│   │   ├── sketch.js
```

### Running the Parameter Sweep
Clone the repository and run the simulation engine:

```bash
git clone [https://github.com/your-username/adaptive-kuramoto.git](https://github.com/your-username/adaptive-kuramoto.git)
cd adaptive-kuramoto
python simulator.py
```

---

## 📄 Citation

If you use this framework or code in your research, please cite our paper draft:

```bibtex
@software{kuramoto-sync-dynamics,
  title={Co-Evolutionary Adaptive Kuramoto Model},
  author={Barış Can Tayiz},
  year={2026},
  publisher={Zenodo},
  doi={10.5281/zenodo.24258716},
  url={https://doi.org/10.5281/zenodo.24258716}
}
```
