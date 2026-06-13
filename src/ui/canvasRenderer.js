export class CanvasRenderer {
  /**
   * Initializes the CanvasRenderer
   * @param {HTMLCanvasElement} canvas - The target canvas element
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    
    // Set up resize listener
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    
    // Initial setup
    this.resize();
  }

  /**
   * Handles canvas resizing to match display size for sharp rendering.
   */
  resize() {
    const parent = this.canvas.parentElement;
    if (!parent || parent.clientWidth === 0 || parent.clientHeight === 0) return;

    // Set actual size in memory (scaled to account for extra pixel density)
    const dpr = window.devicePixelRatio || 1;
    this.width = parent.clientWidth;
    this.height = parent.clientHeight;
    
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    
    // Use setTransform (not scale) so repeated resize calls don't compound the DPR.
    // ctx.scale() is cumulative; setTransform resets the matrix each time.
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /**
   * Clears the canvas and draws the airfoil.
   * @param {{upper: Array<{x: number, y: number}>, lower: Array<{x: number, y: number}>}} coordinates 
   */
  drawAirfoil(coordinates) {
    this.ctx.clearRect(0, 0, this.width, this.height);

    if (!coordinates || !coordinates.upper.length || !coordinates.lower.length) {
      return;
    }

    const padding = 60;
    // Airfoil is from x=0 to x=1
    const availableWidth = this.width - (padding * 2);
    // Maintain aspect ratio, but x runs 0 to 1, y usually -0.2 to 0.2
    const scale = availableWidth; 
    
    // Center vertically, offset horizontally by padding
    const xOffset = padding;
    const yOffset = this.height / 2;

    this.ctx.save();
    
    // Draw the grid
    this.drawGrid(scale, xOffset, yOffset);

    // Combine upper and lower to form a single continuous path
    // Upper points: TE to LE (reversed from 0 to 1)
    // Lower points: LE to TE (0 to 1)
    const path = [...coordinates.upper].reverse().concat(coordinates.lower);

    this.ctx.beginPath();
    
    // Move to the first point (Trailing Edge Upper)
    this.ctx.moveTo(
      xOffset + path[0].x * scale,
      yOffset - path[0].y * scale // y inverted because canvas y grows downwards
    );

    // Draw lines to all other points
    for (let i = 1; i < path.length; i++) {
      this.ctx.lineTo(
        xOffset + path[i].x * scale,
        yOffset - path[i].y * scale
      );
    }

    this.ctx.closePath();

    // Styling
    
    // Create a beautiful modern gradient for the airfoil fill
    const fillGradient = this.ctx.createLinearGradient(xOffset, yOffset - scale * 0.2, xOffset, yOffset + scale * 0.2);
    fillGradient.addColorStop(0, 'rgba(83, 107, 120, 0.4)');   // Primary color with alpha
    fillGradient.addColorStop(1, 'rgba(83, 107, 120, 0.1)');   // Primary color more transparent
    
    this.ctx.fillStyle = fillGradient;
    this.ctx.fill();

    // Draw the stroke
    this.ctx.lineWidth = 3;
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = '#cee5f2'; // Primary FG color
    
    // Add glow effect
    this.ctx.shadowColor = '#cee5f2';
    this.ctx.shadowBlur = 15;
    this.ctx.stroke();

    // Reset shadow for the camber line
    this.ctx.shadowBlur = 0;

    // Draw camber line (average of upper and lower y at each x)
    this.drawCamberLine(coordinates.upper, coordinates.lower, scale, xOffset, yOffset);

    this.ctx.restore();
  }

  /**
   * Draws a coordinate grid behind the airfoil.
   */
  drawGrid(scale, xOffset, yOffset) {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();

    // Draw vertical lines (every 0.1 of chord)
    for(let x = 0; x <= 1.0; x += 0.1) {
      const px = xOffset + x * scale;
      this.ctx.moveTo(px, 0);
      this.ctx.lineTo(px, this.height);
    }
    
    // Draw horizontal lines
    const yMax = this.height / 2 / scale;
    for(let y = -0.3; y <= 0.3; y += 0.1) {
      const py = yOffset - y * scale;
      this.ctx.moveTo(0, py);
      this.ctx.lineTo(this.width, py);
    }

    this.ctx.stroke();
    
    // Draw chord line
    this.ctx.beginPath();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.setLineDash([5, 5]);
    this.ctx.moveTo(xOffset, yOffset);
    this.ctx.lineTo(xOffset + scale, yOffset);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  /**
   * Draws the mean camber line based on upper and lower coordinates.
   */
  drawCamberLine(upper, lower, scale, xOffset, yOffset) {
    this.ctx.beginPath();
    
    // Both upper and lower run LE -> TE (index 0 is LE)
    const len = upper.length;
    
    // Start at Leading edge (lower[0])
    this.ctx.moveTo(
      xOffset + lower[0].x * scale,
      yOffset - ((upper[0].y + lower[0].y) / 2) * scale
    );

    for (let i = 1; i < len; i++) {
      // Find matching points directly (index matching)
      const uPoint = upper[i];
      const lPoint = lower[i];
      
      const meanX = (uPoint.x + lPoint.x) / 2;
      const meanY = (uPoint.y + lPoint.y) / 2;
      
      this.ctx.lineTo(
        xOffset + meanX * scale,
        yOffset - meanY * scale
      );
    }

    this.ctx.strokeStyle = '#ffffff'; // Accent Contrast
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  /**
   * Cleans up event listeners
   */
  dispose() {
    window.removeEventListener('resize', this.resize);
  }
}
