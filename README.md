# NAPS — Neural Airfoil Profile Synthesizer

A professional-grade aerodynamic section synthesizer and computational surrogate model. 

NAPS dynamically generates and visualizes standard NACA 4-digit aerodynamic profiles. Unlike traditional static airfoil plotters, this engine utilizes an integrated **TensorFlow.js** artificial neural network to solve the inverse design problem: synthesizing the required geometric parameters based on a target theoretical lift coefficient ($C_L$).

## Features

- **Inverse Aerodynamic Design**: Specify a target $C_L$ and let the neural network infer the exact camber ($m$), camber position ($p$), and thickness ($t$) required to achieve it.
- **Strict Mathematical Foundation**: Implements exact analytical equations for NACA 4-digit profiles and rigorous numerical integration (trapezoidal rule) for Thin Airfoil Theory $C_L$ calculations.
- **CFD-Ready Export**: Generates Selig `.dat` format coordinate files with guaranteed closed trailing edges for watertight meshing in solvers like OpenFOAM, XFOIL, and SU2.
- **High-Performance UI**: Real-time `<canvas>` visualizations with resolution-independent (DPR-aware) scaling and modern aerospace-grade aesthetics.
- **Client-Side ML**: The entire dataset generation, min-max scaling, training, and inference pipeline executes securely in-browser via TensorFlow.js. 

## Mathematical Architecture

### Thin Airfoil Theory (TAT)
The underlying dataset relies on classical Thin Airfoil Theory to compute the zero-lift angle ($\alpha_{L0}$) for arbitrary camber distributions via the integral:

$$ \alpha_{L0} = -\frac{1}{\pi} \int_{0}^{\pi} \frac{dy_c}{dx} (1 + \cos\theta) d\theta $$

*Note on limits:* TAT represents an inviscid, zero-thickness approximation. Therefore, theoretical $C_L$ values for highly cambered airfoils will evaluate roughly 10-15% lower than empirical viscous solvers (e.g., panel methods like XFOIL) at identical geometries. This divergence is mathematically intentional.

### Surrogate Neural Network
To bypass iterative inverse solvers, the engine trains a lightweight Multi-Layer Perceptron (MLP) on a continuously generated 2D grid of valid profile spaces.
- **Input:** Target $C_L$ (dynamically clamped and normalized via min-max scaling to maximize sigmoid resolution).
- **Architecture:** `1 -> 32 -> 32 -> 2`
- **Output:** Predicted Maximum Camber ($m$) and Position ($p$).
- **Degeneracy Handling:** Purely symmetric profiles ($m=0$) result in identical $C_L$ outputs across all $p$ values. The dataset builder explicitly deduplicates these degenerate states to prevent ill-posed weight averaging.

### Watertight Geometry Construction
Standard NACA profiles leave a finite gap at the trailing edge. This engine adjusts the 4th-order polynomial coefficient from `-0.1015` to `-0.1036`. This geometric trade-off (sacrificing $\approx 0.00015c$ accuracy at the trailing edge) guarantees $y_t(x=1) = 0$, ensuring exported coordinates are watertight for immediate CFD meshing.

## Tech Stack

- **Core Logic:** Vanilla ES6+ JavaScript
- **Machine Learning:** `@tensorflow/tfjs`
- **Styling:** CSS (Custom aerospace design tokens)
- **Bundler:** Vite 

## Installation & Usage

Ensure you have [Node.js](https://nodejs.org/) installed, then run the following commands:

```bash
# Clone the repository and navigate into the project directory
git clone <repository-url>
cd naps

# Install dependencies
npm install

# Start the Vite development server
npm run dev

# Build for production
npm run build
```

## License

This project is open-source and distributed under the **MIT License**. See the `LICENSE` file for details.
