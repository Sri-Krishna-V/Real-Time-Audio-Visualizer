/**
 * Main Application Entry Point
 * Real-Time Audio Visualizer with Three.js and Web Audio API
 */

import { AudioAnalyzer } from './AudioAnalyzer';
import { VisualizerEngine } from './VisualizerEngine';
import { UIController } from './UIController';
import { PerformanceMonitor } from './PerformanceMonitor';
import { PerformanceHUD } from './utils/PerformanceHUD';
import { ErrorHandler } from './utils/ErrorHandler';

class AudioVisualizerApp {
  private audioAnalyzer: AudioAnalyzer;
  private visualizer: VisualizerEngine;
  private uiController: UIController;
  private performanceMonitor: PerformanceMonitor;
  private performanceHUD: PerformanceHUD;
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

    // Initialize performance monitoring
    this.performanceMonitor = new PerformanceMonitor(true);
    this.performanceHUD = new PerformanceHUD();
  }

  /**
   * Initialize the application with error handling
   */
  async initialize(): Promise<void> {
    const errorHandler = ErrorHandler.getInstance();
    
    try {
      // Check browser compatibility first
      this.checkBrowserSupport();
      
      // Check browser compatibility
      this.uiController.checkCompatibility();
      
      // Note: Audio context will be initialized on first user interaction
      // This is required by modern browser policies
      console.log('Audio Visualizer ready - click microphone or upload file to start');
      
      // Start the render loop (will show static scene until audio is connected)
      this.startRenderLoop();
      
      // Setup keyboard shortcuts
      this.setupKeyboardShortcuts();
      
    } catch (error) {
      console.error('Failed to initialize Audio Visualizer:', error);
      
      errorHandler.handleError({
        code: 'INITIALIZATION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown initialization error',
        severity: 'critical',
        userMessage: 'Failed to start the audio visualizer',
        suggestions: [
          'Refresh the page and try again',
          'Update your browser to the latest version',
          'Ensure hardware acceleration is enabled'
        ]
      });
      
      throw error;
    }
  }

  /**
   * Check if browser supports required features
   */
  private checkBrowserSupport(): void {
    const errorHandler = ErrorHandler.getInstance();
    
    // Check WebGL support
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      throw new Error('WebGL not supported');
    }
    
    // Check Web Audio API support
    if (!AudioAnalyzer.isSupported()) {
      errorHandler.handleError(ErrorHandler.getAudioError('NO_WEBAUDIO'));
      throw new Error('Web Audio API not supported');
    }
    
    console.log('Browser compatibility check passed');
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
    
    // Update performance HUD with current stats
    this.updatePerformanceHUD();
    
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
    this.performanceHUD.dispose();
  }

  /**
   * Update performance HUD with current metrics
   */
  private updatePerformanceHUD(): void {
    const performance = this.performanceMonitor.getStats();
    const memoryInfo = (performance as any).memory || { usedJSHeapSize: 0 };
    
    this.performanceHUD.updateStats({
      fps: performance.fps || 0,
      frameTime: performance.frameTime || 0,
      memoryUsed: memoryInfo.usedJSHeapSize || 0,
      audioLatency: performance.audioLatency || 0,
      particleCount: this.visualizer.getParticleCount(),
      geometryVertices: this.visualizer.getVertexCount()
    });
  }

  /**
   * Setup keyboard shortcuts for performance monitoring and debugging
   */
  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (event) => {
      // Ctrl+Shift+P: Toggle Performance HUD
      if (event.ctrlKey && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        this.performanceHUD.toggle();
        console.log('Performance HUD toggled');
      }
      
      // Ctrl+Shift+E: Clear all errors
      if (event.ctrlKey && event.shiftKey && event.key === 'E') {
        event.preventDefault();
        ErrorHandler.getInstance().clearAllErrors();
        console.log('All errors cleared');
      }
      
      // Ctrl+Shift+D: Toggle development mode
      if (event.ctrlKey && event.shiftKey && event.key === 'D') {
        event.preventDefault();
        this.toggleDevelopmentMode();
      }
    });
  }

  /**
   * Toggle development mode with enhanced debugging
   */
  private toggleDevelopmentMode(): void {
    const isDevMode = localStorage.getItem('audiovis-dev-mode') === 'true';
    const newDevMode = !isDevMode;
    
    localStorage.setItem('audiovis-dev-mode', newDevMode.toString());
    
    if (newDevMode) {
      this.performanceHUD.show();
      console.log('Development mode enabled - Performance HUD visible');
      console.log('Keyboard shortcuts:');
      console.log('  Ctrl+Shift+P: Toggle Performance HUD');
      console.log('  Ctrl+Shift+E: Clear errors');
      console.log('  Ctrl+Shift+D: Toggle development mode');
    } else {
      this.performanceHUD.hide();
      console.log('Development mode disabled');
    }
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
