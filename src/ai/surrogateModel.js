import * as tf from '@tensorflow/tfjs';

/**
 * Surrogate AI model to predict NACA parameters from a target Lift Coefficient (Cl)
 */
export class AirfoilSurrogateModel {
  constructor() {
    this.model = tf.sequential();
    
    // Input layer: 1 node (Target Cl)
    this.model.add(tf.layers.dense({
      inputShape: [1],
      units: 32,
      activation: 'relu'
    }));
    
    // Hidden layer
    this.model.add(tf.layers.dense({
      units: 32,
      activation: 'relu'
    }));
    
    // Output layer: 2 nodes (m, p)
    this.model.add(tf.layers.dense({
      units: 2,
      activation: 'sigmoid'
    }));
    
    this.isTrained = false;
    this.maxCl = 2.0;  // Default fallback normalization divisor
    this.minCl = 0.0;  // Default fallback minimum
  }

  /**
   * Trains the neural network on the generated dataset.
   * @param {Object} dataset - Object containing inputs and outputs arrays and maxCl
   * @param {Function} onEpochEnd - Callback to report training progress
   */
  async train(dataset, onEpochEnd) {
    this.maxCl = dataset.maxCl || 2.0;
    this.minCl = (dataset.minCl !== undefined) ? dataset.minCl : 0.0;

    this.model.compile({
      optimizer: tf.train.adam(0.01),
      loss: 'meanSquaredError'
    });

    const xs = tf.tensor2d(dataset.inputs, [dataset.inputs.length, 1]);
    const ys = tf.tensor2d(dataset.outputs, [dataset.outputs.length, 2]);

    await this.model.fit(xs, ys, {
      epochs: 100,
      batchSize: 32,
      shuffle: true,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (onEpochEnd) onEpochEnd(epoch, logs);
        }
      }
    });

    xs.dispose();
    ys.dispose();
    
    this.isTrained = true;
  }

  /**
   * Predicts the required NACA parameters (m, p) to achieve the target Cl.
   * Synchronous execution to prevent blocking the UI loop, properly tidied.
   * @param {number} targetCl - The desired Lift Coefficient
   * @returns {number[]} Array containing [m, p] in absolute values
   */
  predict(targetCl) {
    if (!this.isTrained) {
      // Return a default symmetric airfoil (m=0, p=0) if untrained.
      // Returning early here is safe and prevents allocating unnecessary tensors.
      return [0, 0];
    }

    // Use tf.tidy to automatically clean up all intermediate tensors
    return tf.tidy(() => {
      // Clamp targetCl to the training range before normalizing.
      // Values outside [minCl, maxCl] are out-of-distribution and would cause extrapolation.
      const clampedCl = Math.max(this.minCl, Math.min(this.maxCl, targetCl));
      // IMPORTANT: must use the same min-max formula as training in datasetBuilder.js:
      //   normalized = (cl - minCl) / (maxCl - minCl)
      // Using cl/maxCl here would create a train/inference mismatch.
      const normalizedCl = (clampedCl - this.minCl) / (this.maxCl - this.minCl);
      const inputTensor = tf.tensor2d([[normalizedCl]]);
      
      const prediction = this.model.predict(inputTensor);
      const data = prediction.dataSync(); // Synchronously download tensor data to JS array
      
      // Denormalize predictions based on datasetBuilder logic
      // m / 0.06, (p - 0.2) / 0.4
      const m = data[0] * 0.06;
      let p = data[1] * 0.4 + 0.2;

      // Handle edge case where model predicts p outside bounds when m is 0.
      // If camber is very small, position p is conventionally set to 0.
      if (m < 0.001) {
          p = 0;
      }
      
      return [m, p];
    });
  }

  /**
   * Releases all TF.js tensors and GPU memory held by this model.
   * Must be called before discarding the model instance to prevent memory leaks.
   */
  dispose() {
    this.model.dispose();
  }
}
