/**
 * PerformanceMonitor - Development tool for monitoring real-time performance
 * Tracks FPS, memory usage, and audio processing metrics
 */

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  audioLatency: number;
  particleCount: number;
  vertexCount: number;
}

export class PerformanceMonitor {
  private isEnabled: boolean;
  private frameCount = 0;
  private lastTime = performance.now();
  private fpsHistory: number[] = [];
  private frameTimeHistory: number[] = [];
  private maxHistoryLength = 60; // Keep 1 second of history at 60fps
  
  // Performance display element
  private displayElement: HTMLElement | null = null;
  
  // Audio timing
  private audioProcessingStart = 0;
  private audioLatencyHistory: number[] = [];

  constructor(enabled = false) {
    this.isEnabled = enabled && typeof performance !== 'undefined';
    
    if (this.isEnabled) {
      this.createDisplay();
    }
  }

  /**
   * Create performance display overlay
   */
  private createDisplay(): void {
    if (typeof document === 'undefined') return;
    
    this.displayElement = document.createElement('div');
    this.displayElement.id = 'performance-monitor';
    this.displayElement.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: #00ff00;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      padding: 10px;
      border-radius: 5px;
      z-index: 9999;
      min-width: 200px;
      backdrop-filter: blur(5px);
      border: 1px solid rgba(0, 255, 0, 0.3);
    `;
    
    document.body.appendChild(this.displayElement);
  }

  /**
   * Start frame timing
   */
  startFrame(): void {
    if (!this.isEnabled) return;
    this.frameCount++;
  }

  /**
   * End frame timing and calculate metrics
   */
  endFrame(): PerformanceMetrics {
    if (!this.isEnabled) {
      return {
        fps: 60,
        frameTime: 16.67,
        memoryUsage: 0,
        audioLatency: 0,
        particleCount: 0,
        vertexCount: 0
      };
    }

    const currentTime = performance.now();
    const frameTime = currentTime - this.lastTime;
    
    // Calculate FPS
    const fps = 1000 / frameTime;
    
    // Update histories
    this.fpsHistory.push(fps);
    this.frameTimeHistory.push(frameTime);
    
    // Limit history length
    if (this.fpsHistory.length > this.maxHistoryLength) {
      this.fpsHistory.shift();
      this.frameTimeHistory.shift();
    }
    
    const metrics: PerformanceMetrics = {
      fps: this.getAverageFPS(),
      frameTime: this.getAverageFrameTime(),
      memoryUsage: this.getMemoryUsage(),
      audioLatency: this.getAverageAudioLatency(),
      particleCount: this.lastParticleCount,
      vertexCount: this.lastVertexCount
    };
    
    this.updateDisplay(metrics);
    this.lastTime = currentTime;
    
    return metrics;
  }

  /**
   * Start audio processing timing
   */
  startAudioProcessing(): void {
    if (!this.isEnabled) return;
    this.audioProcessingStart = performance.now();
  }

  /**
   * End audio processing timing
   */
  endAudioProcessing(): void {
    if (!this.isEnabled) return;
    
    const latency = performance.now() - this.audioProcessingStart;
    this.audioLatencyHistory.push(latency);
    
    if (this.audioLatencyHistory.length > this.maxHistoryLength) {
      this.audioLatencyHistory.shift();
    }
  }

  /**
   * Get average FPS over recent history
   */
  private getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 0;
    
    const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.fpsHistory.length);
  }

  /**
   * Get average frame time over recent history
   */
  private getAverageFrameTime(): number {
    if (this.frameTimeHistory.length === 0) return 0;
    
    const sum = this.frameTimeHistory.reduce((a, b) => a + b, 0);
    return Math.round((sum / this.frameTimeHistory.length) * 100) / 100;
  }

  /**
   * Get current memory usage (if available)
   */
  private getMemoryUsage(): number {
    if (typeof (performance as any).memory !== 'undefined') {
      const memory = (performance as any).memory;
      return Math.round(memory.usedJSHeapSize / 1024 / 1024); // MB
    }
    return 0;
  }

  /**
   * Get average audio processing latency
   */
  private getAverageAudioLatency(): number {
    if (this.audioLatencyHistory.length === 0) return 0;
    
    const sum = this.audioLatencyHistory.reduce((a, b) => a + b, 0);
    return Math.round((sum / this.audioLatencyHistory.length) * 100) / 100;
  }

  /**
   * Update performance display
   */
  private updateDisplay(metrics: PerformanceMetrics): void {
    if (!this.displayElement) return;
    
    // Color code FPS for quick visual feedback
    let fpsColor = '#00ff00'; // Green
    if (metrics.fps < 30) fpsColor = '#ff0000'; // Red
    else if (metrics.fps < 50) fpsColor = '#ffff00'; // Yellow
    
    this.displayElement.innerHTML = `
      <div><strong>Performance Monitor</strong></div>
      <div>FPS: <span style="color: ${fpsColor}">${metrics.fps}</span></div>
      <div>Frame: ${metrics.frameTime}ms</div>
      <div>Memory: ${metrics.memoryUsage}MB</div>
      <div>Audio: ${metrics.audioLatency}ms</div>
      <div>Particles: ${metrics.particleCount}</div>
      <div>Vertices: ${metrics.vertexCount}</div>
      <div>Frame #${this.frameCount}</div>
    `;
  }

  /**
   * Update external metrics (particles, vertices)
   */
  updateExternalMetrics(particleCount: number, vertexCount: number): void {
    // Store these metrics to be included in the next endFrame() call
    this.lastParticleCount = particleCount;
    this.lastVertexCount = vertexCount;
  }

  // Add these properties to store the metrics
  private lastParticleCount = 0;
  private lastVertexCount = 0;

  /**
   * Check if performance is acceptable
   */
  isPerformanceGood(): boolean {
    const avgFPS = this.getAverageFPS();
    const avgFrameTime = this.getAverageFrameTime();
    
    return avgFPS >= 55 && avgFrameTime <= 18; // Allow some tolerance
  }

  /**
   * Get performance recommendations
   */
  getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];
    const avgFPS = this.getAverageFPS();
    const memoryUsage = this.getMemoryUsage();
    
    if (avgFPS < 30) {
      recommendations.push('FPS too low - reduce particle count or geometry detail');
    } else if (avgFPS < 50) {
      recommendations.push('FPS borderline - consider optimizations');
    }
    
    if (memoryUsage > 200) {
      recommendations.push('High memory usage - check for memory leaks');
    }
    
    const avgAudioLatency = this.getAverageAudioLatency();
    if (avgAudioLatency > 20) {
      recommendations.push('Audio processing slow - optimize frequency analysis');
    }
    
    return recommendations;
  }

  /**
   * Export performance data for analysis
   */
  exportData(): any {
    return {
      fpsHistory: [...this.fpsHistory],
      frameTimeHistory: [...this.frameTimeHistory],
      audioLatencyHistory: [...this.audioLatencyHistory],
      averageFPS: this.getAverageFPS(),
      averageFrameTime: this.getAverageFrameTime(),
      averageAudioLatency: this.getAverageAudioLatency(),
      memoryUsage: this.getMemoryUsage(),
      frameCount: this.frameCount,
      timestamp: Date.now()
    };
  }

  /**
   * Toggle performance monitor display
   */
  toggle(): void {
    this.isEnabled = !this.isEnabled;
    
    if (this.isEnabled && !this.displayElement) {
      this.createDisplay();
    } else if (!this.isEnabled && this.displayElement) {
      this.displayElement.style.display = 'none';
    } else if (this.isEnabled && this.displayElement) {
      this.displayElement.style.display = 'block';
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.displayElement) {
      document.body.removeChild(this.displayElement);
      this.displayElement = null;
    }
    
    this.fpsHistory = [];
    this.frameTimeHistory = [];
    this.audioLatencyHistory = [];
  }
}
