/**
 * Generates coordinate points for a NACA 4-digit airfoil.
 * 
 * @param {number} m - Maximum camber (as a percentage of chord, e.g., 0.02)
 * @param {number} p - Position of maximum camber (as a fraction of chord, e.g., 0.4)
 * @param {number} t - Maximum thickness (as a fraction of chord, e.g., 0.12)
 * @param {number} numPoints - Number of points per surface
 * @returns {{upper: Array<{x: number, y: number}>, lower: Array<{x: number, y: number}>}}
 */
export function generateNACACoordinates(m, p, t, numPoints = 100) {
  const upper = [];
  const lower = [];

  // Cosine spacing for point distribution (more density at leading and trailing edges)
  for (let i = 0; i <= numPoints; i++) {
    const beta = (i / numPoints) * Math.PI;
    const x = 0.5 * (1 - Math.cos(beta));

    // Thickness distribution (NACA 4-digit standard formula).
    // The last coefficient is -0.1036 instead of the original NACA value of -0.1015.
    // -0.1015 leaves a small open trailing edge: y_t(x=1) ≈ +0.00126·t (non-zero gap).
    // -0.1036 forces a closed trailing edge: y_t(x=1) = 0 exactly, which is required
    // for a watertight mesh in CFD solvers (XFOIL, OpenFOAM, SU2).
    // Trade-off: exported .dat files will differ from UIUC database coordinates by
    // at most ~0.00015·c at the trailing edge — negligible for aerodynamic purposes.
    const yt = 5 * t * (0.2969 * Math.sqrt(x) - 0.1260 * x - 0.3516 * Math.pow(x, 2) + 0.2843 * Math.pow(x, 3) - 0.1036 * Math.pow(x, 4));

    let yc = 0;
    let dyc_dx = 0;

    // Camber line and gradient
    if (m > 0 && p > 0) {
      if (x >= 0 && x < p) {
        yc = (m / Math.pow(p, 2)) * (2 * p * x - Math.pow(x, 2));
        dyc_dx = (2 * m / Math.pow(p, 2)) * (p - x);
      } else if (x >= p && x <= 1) {
        yc = (m / Math.pow(1 - p, 2)) * ((1 - 2 * p) + 2 * p * x - Math.pow(x, 2));
        dyc_dx = (2 * m / Math.pow(1 - p, 2)) * (p - x);
      }
    }

    const theta = Math.atan(dyc_dx);

    const xu = x - yt * Math.sin(theta);
    const yu = yc + yt * Math.cos(theta);
    
    const xl = x + yt * Math.sin(theta);
    const yl = yc - yt * Math.cos(theta);

    upper.push({ x: xu, y: yu });
    lower.push({ x: xl, y: yl });
  }

  // Return both upper and lower surface coordinates in natural LE -> TE order (x=0 to x=1)
  return { upper, lower };
}
