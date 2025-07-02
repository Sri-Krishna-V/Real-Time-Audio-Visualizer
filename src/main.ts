/**
 * Main Application Entry Point
 * Real-Time Audio Visualizer with Three.js and Web Audio API
 */

import { AudioAnalyzer } from './AudioAnalyzer';
import { VisualizerEngine } from './VisualizerEngine';
import { UIController } from './UIController';
import { PerformanceMonitor } from './PerformanceMonitor';

class AudioVisualizerApp {
  private audioAnalyzer: AudioAnalyzer;
  private visualizer: VisualizerEngine;
  private uiController: UIController;
  private performanceMonitor: PerformanceMonitor;
  private animationFrameId: number | null = null;
  private isRunning = false;

  constructor() {
    // Initialize core components
    this.audioAnalyzer = new AudioAnalyzer({
      fftSize: 2048,
      smoothingTimeConstant: 0.8
    });

    const canvasContainer = document.getElementById('canvas-container');
    if (!canvasContainer) {
      throw new Error('Canvas container not found');
    }

    this.visualizer = new VisualizerEngine(canvasContainer, {
      geometrySegments: 32,
      particleCount: 1000,
      morphingIntensity: 1.0,
      colorSaturation: 0.8,
      enableWireframe: false
    });

    this.uiController = new UIController(this.audioAnalyzer, this.visualizer);

    // Initialize performance monitor (enable in development)
    this.performanceMonitor = new PerformanceMonitor(true);
  }

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    try {
      // Check browser compatibility
      this.uiController.checkCompatibility();
      
      // Note: Audio context will be initialized on first user interaction
      // This is required by modern browser policies
      console.log('Audio Visualizer ready - click microphone or upload file to start');
      
      // Start the render loop (will show static scene until audio is connected)
      this.startRenderLoop();
      
    } catch (error) {
      console.error('Failed to initialize Audio Visualizer:', error);
      throw error;
    }
  }

  /**
   * Start the main render loop
   */
  private startRenderLoop(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.renderLoop();
  }

  /**
   * Main render loop - runs at 60fps
   */
  private renderLoop = (): void => {
    if (!this.isRunning) return;

    // Start performance measurement
    this.performanceMonitor.startFrame();
    this.performanceMonitor.startAudioProcessing();

    // Get current audio frequency data
    const audioData = this.audioAnalyzer.getFrequencyData();
    
    // End audio processing measurement
    this.performanceMonitor.endAudioProcessing();
    
    // Update visualization based on audio data
    this.visualizer.updateVisualization(audioData);
    
    // Render the scene
    this.visualizer.render();
    
    // End performance measurement
    this.performanceMonitor.endFrame();
    
    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(this.renderLoop);
  };

  /**
   * Stop the render loop
   */
  private stopRenderLoop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopRenderLoop();
    this.uiController.dispose();
    this.visualizer.dispose();
    this.audioAnalyzer.dispose();
    this.performanceMonitor.dispose();
  }
}

/**
 * Application initialization
 */
async function initializeApp(): Promise<void> {
  try {
    const app = new AudioVisualizerApp();
    await app.initialize();
    
    // Handle page unload cleanup
    window.addEventListener('beforeunload', () => {
      app.dispose();
    });
    
    // Handle visibility changes for performance
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page is hidden, could pause rendering for performance
        console.log('Page hidden - visualizer continues running');
      } else {
        // Page is visible again
        console.log('Page visible - visualizer active');
      }
    });
    
  } catch (error) {
    // Show error to user
    const errorElement = document.getElementById('error-message');
    const errorTextElement = document.getElementById('error-text');
    
    if (errorElement && errorTextElement) {
      errorTextElement.textContent = `Failed to initialize: ${error}`;
      errorElement.style.display = 'block';
    }
    
    console.error('Application initialization failed:', error);
  }
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Handle global errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});
