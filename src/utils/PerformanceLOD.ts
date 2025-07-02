/**
 * PerformanceLOD - Level of Detail management for performance scaling
 * Automatically adjusts visual quality based on device performance
 */

export interface LODLevel {
  name: string;
  particleCount: number;
  geometrySegments: number;
  enableComplexShaders: boolean;
  enablePostProcessing: boolean;
  targetFPS: number;
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  audioLatency: number;
}

export class PerformanceLOD {
  private currentLOD: LODLevel;
  private lodLevels: LODLevel[];
  private performanceHistory: number[] = [];
  private readonly maxHistoryLength = 60; // 1 second at 60fps
  private lodChangeCallback?: (newLOD: LODLevel) => void;

  constructor(lodChangeCallback?: (newLOD: LODLevel) => void) {
    this.lodChangeCallback = lodChangeCallback;
    
    // Define LOD levels from lowest to highest quality
    this.lodLevels = [
      {
        name: 'Potato',
        particleCount: 100,
        geometrySegments: 8,
        enableComplexShaders: false,
        enablePostProcessing: false,
        targetFPS: 30
      },
      {
        name: 'Low',
        particleCount: 300,
        geometrySegments: 16,
        enableComplexShaders: false,
        enablePostProcessing: false,
        targetFPS: 45
      },
      {
        name: 'Medium',
        particleCount: 600,
        geometrySegments: 24,
        enableComplexShaders: true,
        enablePostProcessing: false,
        targetFPS: 55
      },
      {
        name: 'High',
        particleCount: 1000,
        geometrySegments: 32,
        enableComplexShaders: true,
        enablePostProcessing: true,
        targetFPS: 58
      },
      {
        name: 'Ultra',
        particleCount: 2000,
        geometrySegments: 48,
        enableComplexShaders: true,
        enablePostProcessing: true,
        targetFPS: 60
      }
    ];

    // Start with medium quality
    this.currentLOD = this.lodLevels[2];
  }

  /**
   * Update performance metrics and potentially adjust LOD
   */
  updatePerformance(metrics: PerformanceMetrics): void {
    this.performanceHistory.push(metrics.fps);
    
    if (this.performanceHistory.length > this.maxHistoryLength) {
      this.performanceHistory.shift();
    }

    // Only evaluate LOD changes after we have enough data
    if (this.performanceHistory.length >= 30) {
      this.evaluateLODChange();
    }
  }

  /**
   * Get the current LOD level
   */
  getCurrentLOD(): LODLevel {
    return this.currentLOD;
  }

  /**
   * Manually set LOD level (for user preferences)
   */
  setLOD(lodName: string): void {
    const newLOD = this.lodLevels.find(lod => lod.name === lodName);
    if (newLOD && newLOD !== this.currentLOD) {
      this.currentLOD = newLOD;
      this.lodChangeCallback?.(this.currentLOD);
    }
  }

  /**
   * Get all available LOD levels
   */
  getLODLevels(): LODLevel[] {
    return [...this.lodLevels];
  }

  /**
   * Evaluate if LOD should change based on performance history
   */
  private evaluateLODChange(): void {
    const recentFPS = this.performanceHistory.slice(-30);
    const avgFPS = recentFPS.reduce((sum, fps) => sum + fps, 0) / recentFPS.length;
    
    const currentIndex = this.lodLevels.indexOf(this.currentLOD);
    let newLODIndex = currentIndex;

    // Check if we should decrease quality (performance too low)
    if (avgFPS < this.currentLOD.targetFPS - 5 && currentIndex > 0) {
      newLODIndex = Math.max(0, currentIndex - 1);
    }
    // Check if we can increase quality (performance is good)
    else if (avgFPS > this.currentLOD.targetFPS + 3 && currentIndex < this.lodLevels.length - 1) {
      newLODIndex = Math.min(this.lodLevels.length - 1, currentIndex + 1);
    }

    // Apply LOD change if needed
    if (newLODIndex !== currentIndex) {
      const newLOD = this.lodLevels[newLODIndex];
      console.log(`LOD changed: ${this.currentLOD.name} -> ${newLOD.name} (avg FPS: ${avgFPS.toFixed(1)})`);
      this.currentLOD = newLOD;
      this.lodChangeCallback?.(this.currentLOD);
    }
  }

  /**
   * Get performance recommendations
   */
  getRecommendations(): string[] {
    const recommendations: string[] = [];
    const avgFPS = this.getAverageFPS();
    
    if (avgFPS < 30) {
      recommendations.push('Consider using "Potato" or "Low" quality settings');
    } else if (avgFPS < 45) {
      recommendations.push('Consider using "Low" or "Medium" quality settings');
    } else if (avgFPS > 58 && this.currentLOD.name !== 'Ultra') {
      recommendations.push('Your device can handle higher quality settings');
    }

    return recommendations;
  }

  private getAverageFPS(): number {
    if (this.performanceHistory.length === 0) return 60;
    return this.performanceHistory.reduce((sum, fps) => sum + fps, 0) / this.performanceHistory.length;
  }
}
