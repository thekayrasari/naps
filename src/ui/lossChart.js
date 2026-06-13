export class LossChart {
  /**
   * Initializes a zero-dependency minimalist line chart for AI training loss.
   * @param {HTMLCanvasElement} canvas The canvas element to draw on
   */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.history = [];
    this.maxLoss = 0;
    
    // Set up resize handling
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  resize() {
    const parent = this.canvas.parentElement;
    if (!parent || parent.clientWidth === 0 || parent.clientHeight === 0) return;
    
    const dpr = window.devicePixelRatio || 1;
    this.width = parent.clientWidth;
    this.height = parent.clientHeight;
    
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    // Use setTransform (not scale) so repeated resize calls don't compound the DPR.
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    
    // Redraw if data exists
    if (this.history.length > 0) {
      this.draw();
    }
  }

  /**
   * Adds a new data point and redraws the chart.
   * @param {number} loss The MSE loss value
   */
  addPoint(loss) {
    this.history.push(loss);
    if (loss > this.maxLoss) {
      this.maxLoss = loss;
    }
    this.draw();
  }

  /**
   * Resets the chart for a new training session.
   */
  reset() {
    this.history = [];
    this.maxLoss = 0;
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  /**
   * Renders the chart
   */
  draw() {
    if (this.width === 0 || this.height === 0 || this.history.length === 0) return;
    
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    const padding = 5;
    const graphWidth = this.width - padding * 2;
    const graphHeight = this.height - padding * 2;
    
    // Safety check for maxLoss
    const mLoss = this.maxLoss || 1; 

    this.ctx.beginPath();
    this.history.forEach((loss, index) => {
      // Scale x to match array length
      const x = padding + (index / Math.max(1, this.history.length - 1)) * graphWidth;
      // Invert Y because canvas Y goes down
      const y = padding + graphHeight - (loss / mLoss) * graphHeight;
      
      if (index === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    });

    // Styling the line
    this.ctx.strokeStyle = '#cee5f2'; // Primary FG color
    this.ctx.lineWidth = 2;
    this.ctx.lineJoin = 'round';
    
    // Glow
    this.ctx.shadowColor = '#cee5f2';
    this.ctx.shadowBlur = 8;
    this.ctx.stroke();
    
    this.ctx.shadowBlur = 0; // Reset
  }

  dispose() {
    window.removeEventListener('resize', this.resize);
  }
}
