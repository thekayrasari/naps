/**
 * Evaluates the zero-lift angle (alpha_L0) for a given NACA 4-digit camber profile
 * using Thin Airfoil Theory numerical integration.
 */
function calculateAlphaL0(m, p) {
  if (m === 0 || p === 0) return 0;

  const numSteps = 100;
  let integral = 0;
  const dTheta = Math.PI / numSteps;
  
  for (let i = 0; i <= numSteps; i++) {
    const weight = (i === 0 || i === numSteps) ? 0.5 : 1.0;
    const theta = (i / numSteps) * Math.PI;
    const x = 0.5 * (1 - Math.cos(theta));
    
    let dyc_dx = 0;
    if (x < p) {
      dyc_dx = (2 * m / Math.pow(p, 2)) * (p - x);
    } else {
      dyc_dx = (2 * m / Math.pow(1 - p, 2)) * (p - x);
    }
    
    // Trapezoidal rule integration element for (-1/pi) * int( dyc_dx * (1 + cos(theta)) dtheta )
    integral += weight * dyc_dx * (1 + Math.cos(theta)) * dTheta;
  }
  
  return - (1 / Math.PI) * integral;
}

/**
 * Computes the theoretical Lift Coefficient (Cl) at a fixed angle-of-attack of 4°.
 *
 * NOTE: This uses pure Thin Airfoil Theory (TAT), which is an inviscid,
 * zero-thickness approximation. Expect Cl to be ~10-15% lower than XFOIL panel-method
 * results for the same geometry. For NACA 2412 at α=4°, TAT gives Cl≈0.72
 * while XFOIL (Re=1e6) gives Cl≈1.03. This is physically correct for TAT.
 * The fixed α=4° is intentional: the slider controls target Cl at this one
 * design condition only, not an arbitrary (α, Cl) pair.
 */
function computeCl(m, p) {
  const alphaDeg = 4;
  const alphaRad = alphaDeg * (Math.PI / 180);
  const alphaL0 = calculateAlphaL0(m, p);
  
  // Cl = 2 * pi * (alpha - alpha_L0)
  return 2 * Math.PI * (alphaRad - alphaL0);
}

/**
 * Generates training dataset for the surrogate model.
 * @param {number} sampleCount - target number of samples
 */
export function generateTrainingData(sampleCount = 500) {
  const data = [];
  
  // Create a 2D grid of points (m, p) to reach approximate sample count
  const steps = Math.ceil(Math.sqrt(sampleCount));
  
  for (let i = 0; i < steps; i++) {
    const m = 0.0 + (i / (steps - 1 || 1)) * 0.06;
    for (let j = 0; j < steps; j++) {
      const p = 0.2 + (j / (steps - 1 || 1)) * 0.4;
      
      const cl = computeCl(m, p);
      
      data.push({
        inputCl: cl,
        m: m,
        p: p
      });
    }
  }

  // Remove duplicate Cl inputs: when m=0, all p values produce the same Cl.
  // Keeping all of them creates an ill-posed one-to-many mapping for that Cl value.
  // We keep exactly ONE representative row per unique Cl value (the first occurrence).
  const seen = new Map();
  const deduped = [];
  for (const d of data) {
    const key = d.inputCl.toFixed(8); // 8 decimal places is enough to detect true duplicates
    if (!seen.has(key)) {
      seen.set(key, true);
      deduped.push(d);
    }
  }

  // Find the exact min and max Cl in the deduplicated dataset for dynamic normalization
  const maxCl = Math.max(...deduped.map(d => d.inputCl));
  const minCl = Math.min(...deduped.map(d => d.inputCl));
  
  // Normalize inputs to [0, 1] using min-max scaling.
  // Using cl/maxCl would leave a dead zone [0, minCl/maxCl) ≈ [0, 0.26)
  // that the network is never trained on, wasting ~26% of input capacity.
  const inputs = deduped.map(d => (d.inputCl - minCl) / (maxCl - minCl));
  
  // Normalize targets to 0-1 for Sigmoid output
  // Max ranges: m [0.0, 0.06], p [0.2, 0.6]
  const outputs = deduped.map(d => [
    d.m / 0.06,
    (d.p - 0.2) / 0.4
  ]);

  return { inputs, outputs, raw: deduped, maxCl, minCl };
}
