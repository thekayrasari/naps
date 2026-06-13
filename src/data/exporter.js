/**
 * Exports airfoil coordinates to standard Selig (.dat) format and triggers a download.
 * 
 * @param {string} airfoilName The name of the airfoil (e.g., "NACA 2412")
 * @param {{upper: Array<{x: number, y: number}>, lower: Array<{x: number, y: number}>}} coordinates 
 */
export function exportToDat(airfoilName, coordinates) {
  if (!coordinates || !coordinates.upper || !coordinates.lower) {
    console.error("Invalid coordinates provided for export.");
    return;
  }

  // Selig format starts with the airfoil name on the first line
  let content = `${airfoilName}\n`;
  
  // Upper surface points: Trailing Edge -> Leading Edge (reversed to match Selig format)
  [...coordinates.upper].reverse().forEach(pt => {
    // Format to 6 decimal places with consistent spacing
    content += ` ${pt.x.toFixed(6).padStart(9, ' ')}  ${pt.y.toFixed(6).padStart(9, ' ')}\n`;
  });

  // Lower surface points: Leading Edge -> Trailing Edge
  // Skip the first lower point (LE) if it exactly matches the last upper point to avoid duplicates,
  // but usually they are both exactly [0,0] in the analytical generator.
  for (let i = 1; i < coordinates.lower.length; i++) {
    const pt = coordinates.lower[i];
    content += ` ${pt.x.toFixed(6).padStart(9, ' ')}  ${pt.y.toFixed(6).padStart(9, ' ')}\n`;
  }

  // Create a blob and trigger download
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `${airfoilName.replace(/\s+/g, '_')}.dat`;
  document.body.appendChild(a);
  a.click();
  
  // Cleanup
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
