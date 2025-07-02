/**
 * PerformanceHUD - Real-time performance metrics display
 * Shows FPS, memory usage, and audio processing stats
 */

export interface PerformanceStats {
  fps: number;
  frameTime: number;
  memoryUsed: number;
  audioLatency: number;
  particleCount: number;
  geometryVertices: number;
}

export class PerformanceHUD {
  private container!: HTMLElement;
  private statsElement!: HTMLElement;
  private isVisible = false;
  private updateInterval: number;
  
  constructor() {
    this.createHUD();
    this.updateInterval = setInterval(() => this.updateDisplay(), 100);
  }

  private createHUD(): void {
    // Create HUD container
    this.container = document.createElement('div');
    this.container.id = 'performance-hud';
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: #00ff00;
      padding: 10px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      z-index: 1000;
      min-width: 200px;
      display: none;
      user-select: none;
    `;

    this.statsElement = document.createElement('div');
    this.container.appendChild(this.statsElement);

    // Add toggle button
    const toggleButton = document.createElement('button');
    toggleButton.textContent = 'Performance';
    toggleButton.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
      border: 1px solid #333;
      padding: 5px 10px;
      border-radius: 3px;
      font-size: 11px;
      cursor: pointer;
      z-index: 1001;
      user-select: none;
    `;
    
    toggleButton.addEventListener('click', () => this.toggle());
    
    document.body.appendChild(this.container);
    document.body.appendChild(toggleButton);
  }

  public updateStats(stats: PerformanceStats): void {
    if (!this.isVisible) return;

    const fpsColor = stats.fps >= 55 ? '#00ff00' : stats.fps >= 30 ? '#ffff00' : '#ff0000';
    const memoryMB = (stats.memoryUsed / (1024 * 1024)).toFixed(1);
    
    this.statsElement.innerHTML = `
      <div style="color: ${fpsColor}">FPS: ${stats.fps.toFixed(1)}</div>
      <div>Frame: ${stats.frameTime.toFixed(2)}ms</div>
      <div>Memory: ${memoryMB}MB</div>
      <div>Audio Latency: ${stats.audioLatency.toFixed(1)}ms</div>
      <div>Particles: ${stats.particleCount}</div>
      <div>Vertices: ${stats.geometryVertices}</div>
      <div style="margin-top: 5px; font-size: 10px; color: #888;">
        Press Ctrl+P to toggle
      </div>
    `;
  }

  public toggle(): void {
    this.isVisible = !this.isVisible;
    this.container.style.display = this.isVisible ? 'block' : 'none';
  }

  public show(): void {
    this.isVisible = true;
    this.container.style.display = 'block';
  }

  public hide(): void {
    this.isVisible = false;
    this.container.style.display = 'none';
  }

  private updateDisplay(): void {
    // This will be called by the main app with current stats
  }

  public dispose(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
