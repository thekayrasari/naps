import './style.css';
import { generateNACACoordinates } from './math/nacaGenerator.js';
import { generateTrainingData } from './data/datasetBuilder.js';
import { AirfoilSurrogateModel } from './ai/surrogateModel.js';
import { CanvasRenderer } from './ui/canvasRenderer.js';
import { exportToDat } from './data/exporter.js';
import { LossChart } from './ui/lossChart.js';

// DOM Elements
const elements = {};

// Global State

const appState = {
  model: new AirfoilSurrogateModel(),
  renderer: null,
  lossChart: null,
  isTraining: false,
  currentCoords: null,
  currentName: "NAPS 0000"
};

let debounceTimeout = null;

/**
 * Updates the UI with the inferred NACA parameters and draws the new airfoil.
 */
function updateAirfoil() {
  if (appState.isTraining) return;

  const targetCl = parseFloat(elements.clSlider.value) || 0.8;
  elements.clValue.textContent = targetCl.toFixed(2);

  const t = parseFloat(elements.tSlider.value) || 0.12;
  elements.tValue.textContent = t.toFixed(2);

  // 1. Ask AI to predict required parameters (Synchronous & memory safe)
  const [m, p] = appState.model.predict(targetCl);

  // Format as percentages/fractions for UI and naming
  // m is max 0.06 (NACA 6xxx)
  // p is 0.2 to 0.6 (NACA x2xx to x6xx)
  // t is manual thickness 0.05 to 0.15 (NACA xx05 to xx15)
  const mDigit = Math.round(m * 100);
  const pDigit = mDigit === 0 ? 0 : Math.max(2, Math.min(6, Math.round(p * 10)));
  const tDigits = Math.round(t * 100).toString().padStart(2, '0');

  const nacaString = `NAPS ${mDigit}${pDigit}${tDigits}`;
  
  // 2. Update UI
  elements.paramM.textContent = m.toFixed(4);
  elements.paramP.textContent = p.toFixed(4);
  elements.paramT.textContent = t.toFixed(4);
  elements.nacaName.textContent = nacaString;

  // 3. Generate geometric coordinates based on strict math
  const coords = generateNACACoordinates(m, p, t, 150);
  
  // Save to state for exporting
  appState.currentCoords = coords;
  appState.currentName = nacaString;

  // 4. Render to Canvas
  if (appState.renderer) {
    appState.renderer.drawAirfoil(coords);
  }
}

/**
 * Handles the Export button click
 */
function handleExport() {
  if (appState.currentCoords && !appState.isTraining) {
    exportToDat(appState.currentName, appState.currentCoords);
  }
}

/**
 * Handles the training process
 */
async function trainModel() {
  if (appState.isTraining) return;
  
  appState.isTraining = true;
  elements.trainBtn.disabled = true;
  elements.clSlider.disabled = true;
  elements.tSlider.disabled = true;
  
  elements.status.textContent = 'Generating Dataset...';
  elements.status.style.backgroundColor = '#0ea5e9';
  elements.exportBtn.disabled = true;

  if (appState.lossChart) {
    appState.lossChart.reset();
  }

  // Allow UI to update before heavy computation
  await new Promise(resolve => setTimeout(resolve, 50));

  const dataset = generateTrainingData(1000);

  // Reset the model to fresh random weights before every training run.
  // model.fit() on existing weights would continue from the previous session,
  // not perform a true retrain.
  if (appState.model) {
    appState.model.dispose();
  }
  appState.model = new AirfoilSurrogateModel();

  elements.status.textContent = 'Training Model...';

  try {
    await appState.model.train(dataset, (epoch, logs) => {
      // Update UI every 10 epochs
      if (epoch % 10 === 0) {
        elements.status.textContent = `Training: Epoch ${epoch}/100 (Loss: ${logs.loss.toFixed(4)})`;
      }
      // Update loss chart every epoch
      if (appState.lossChart) {
        appState.lossChart.addPoint(logs.loss);
      }
    });

    // Dynamically clamp slider range to the actual training Cl range.
    // Prevents the user from requesting a Cl the model was never trained on.
    elements.clSlider.min = dataset.minCl.toFixed(2);
    elements.clSlider.max = dataset.maxCl.toFixed(2);
    // Clamp current value into range
    const currentCl = parseFloat(elements.clSlider.value);
    if (currentCl < dataset.minCl) elements.clSlider.value = dataset.minCl.toFixed(2);
    if (currentCl > dataset.maxCl) elements.clSlider.value = dataset.maxCl.toFixed(2);

    elements.status.textContent = 'Ready';
    elements.status.style.backgroundColor = '#10b981';
  } catch (error) {
    console.error("Training failed:", error);
    elements.status.textContent = 'Training Failed';
    elements.status.style.backgroundColor = '#ef4444';
  } finally {
    appState.isTraining = false;
    elements.trainBtn.disabled = false;
    elements.clSlider.disabled = false;
    elements.tSlider.disabled = false;
    elements.exportBtn.disabled = false;
    
    // Trigger initial render with trained model
    updateAirfoil();
  }
}

/**
 * Initializes the application
 */
function init() {
  // Populate DOM Elements
  elements.clSlider = document.getElementById('cl-slider');
  elements.clValue = document.getElementById('cl-value');
  elements.tSlider = document.getElementById('t-slider');
  elements.tValue = document.getElementById('t-value');
  elements.paramM = document.getElementById('param-m');
  elements.paramP = document.getElementById('param-p');
  elements.paramT = document.getElementById('param-t');
  elements.nacaName = document.getElementById('naca-name');
  elements.status = document.getElementById('model-status');
  elements.trainBtn = document.getElementById('train-btn');
  elements.exportBtn = document.getElementById('export-btn');
  elements.canvas = document.getElementById('airfoil-canvas');
  elements.lossCanvas = document.getElementById('loss-canvas');

  // Setup Renderer
  appState.renderer = new CanvasRenderer(elements.canvas);
  appState.lossChart = new LossChart(elements.lossCanvas);

  // Bind Events
  elements.clSlider.addEventListener('input', () => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(updateAirfoil, 10); // 10ms debounce for smoothness
  });
  elements.tSlider.addEventListener('input', () => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(updateAirfoil, 10); // 10ms debounce for smoothness
  });
  elements.trainBtn.addEventListener('click', trainModel);
  elements.exportBtn.addEventListener('click', handleExport);
  
  // Handle window resize for canvas redraw
  window.addEventListener('resize', () => {
    if (!appState.isTraining) {
      updateAirfoil();
    }
  });

  // Start initial training
  trainModel();
}

// Bootstrap
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
