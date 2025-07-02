/**
 * UIController - Handles user interface interactions and state management
 * Connects audio controls with     // Visualizer controls
    this.geometryModeBtn.addEventListener('click', this.handleGeometryModeToggle.bind(this));
    this.particleToggleBtn.addEventListener('click', this.handleParticleToggle.bind(this));
    this.wireframeToggleBtn.addEventListener('click', this.handleWireframeToggle.bind(this));
    
    // Help modal
    this.helpBtn.addEventListener('click', this.showHelpModal.bind(this));
    this.helpClose.addEventListener('click', this.hideHelpModal.bind(this));
    this.helpModal.addEventListener('click', (e) => {
      if (e.target === this.helpModal) this.hideHelpModal();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));visualization engine
 */

import { AudioAnalyzer } from './AudioAnalyzer';
import { VisualizerEngine } from './VisualizerEngine';

export class UIController {
  private audioAnalyzer: AudioAnalyzer;
  private visualizer: VisualizerEngine;
  
  // UI Elements
  private micBtn!: HTMLButtonElement;
  private fileInput!: HTMLInputElement;
  private playBtn!: HTMLButtonElement;
  private pauseBtn!: HTMLButtonElement;
  private stopBtn!: HTMLButtonElement;
  private volumeSlider!: HTMLInputElement;
  private volumeValue!: HTMLSpanElement;
  private sensitivitySlider!: HTMLInputElement;
  private sensitivityValue!: HTMLSpanElement;
  private geometryModeBtn!: HTMLButtonElement;
  private particleToggleBtn!: HTMLButtonElement;
  private wireframeToggleBtn!: HTMLButtonElement;
  private audioStatus!: HTMLElement;
  private errorMessage!: HTMLElement;
  private errorText!: HTMLElement;
  private helpBtn!: HTMLButtonElement;
  private helpModal!: HTMLElement;
  private helpClose!: HTMLButtonElement;

  // State
  private currentAudioMode: 'none' | 'microphone' | 'file' = 'none';
  private isPlaying = false;

  constructor(audioAnalyzer: AudioAnalyzer, visualizer: VisualizerEngine) {
    this.audioAnalyzer = audioAnalyzer;
    this.visualizer = visualizer;
    
    this.initializeElements();
    this.bindEvents();
    this.updateUI();
  }

  /**
   * Initialize DOM element references
   */
  private initializeElements(): void {
    // Audio input controls
    this.micBtn = document.getElementById('mic-btn') as HTMLButtonElement;
    this.fileInput = document.getElementById('file-input') as HTMLInputElement;
    
    // Playback controls
    this.playBtn = document.getElementById('play-btn') as HTMLButtonElement;
    this.pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement;
    this.stopBtn = document.getElementById('stop-btn') as HTMLButtonElement;
    
    // Sliders
    this.volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
    this.volumeValue = document.getElementById('volume-value') as HTMLSpanElement;
    this.sensitivitySlider = document.getElementById('sensitivity-slider') as HTMLInputElement;
    this.sensitivityValue = document.getElementById('sensitivity-value') as HTMLSpanElement;
    
    // Visual controls
    this.geometryModeBtn = document.getElementById('geometry-mode') as HTMLButtonElement;
    this.particleToggleBtn = document.getElementById('particle-toggle') as HTMLButtonElement;
    this.wireframeToggleBtn = document.getElementById('wireframe-toggle') as HTMLButtonElement;
    
    // Status elements
    this.audioStatus = document.getElementById('audio-status') as HTMLElement;
    this.errorMessage = document.getElementById('error-message') as HTMLElement;
    this.errorText = document.getElementById('error-text') as HTMLElement;
    
    // Help modal elements
    this.helpBtn = document.getElementById('help-btn') as HTMLButtonElement;
    this.helpModal = document.getElementById('help-modal') as HTMLElement;
    this.helpClose = document.getElementById('help-close') as HTMLButtonElement;

    // Validate all elements exist
    const elements = [
      this.micBtn, this.fileInput, this.playBtn, this.pauseBtn, this.stopBtn,
      this.volumeSlider, this.volumeValue, this.sensitivitySlider, this.sensitivityValue,
      this.geometryModeBtn, this.particleToggleBtn, this.wireframeToggleBtn,
      this.audioStatus, this.errorMessage, this.errorText,
      this.helpBtn, this.helpModal, this.helpClose
    ];

    const missingElements = elements.filter(el => !el);
    if (missingElements.length > 0) {
      throw new Error('Some UI elements are missing from the DOM');
    }
  }

  /**
   * Bind event listeners to UI elements
   */
  private bindEvents(): void {
    // Audio input controls
    this.micBtn.addEventListener('click', this.handleMicrophoneToggle.bind(this));
    this.fileInput.addEventListener('change', this.handleFileUpload.bind(this));
    
    // Playback controls
    this.playBtn.addEventListener('click', this.handlePlay.bind(this));
    this.pauseBtn.addEventListener('click', this.handlePause.bind(this));
    this.stopBtn.addEventListener('click', this.handleStop.bind(this));
    
    // Volume control
    this.volumeSlider.addEventListener('input', this.handleVolumeChange.bind(this));
    
    // Sensitivity control
    this.sensitivitySlider.addEventListener('input', this.handleSensitivityChange.bind(this));
    
    // Visual controls
    this.geometryModeBtn.addEventListener('click', this.handleGeometryModeToggle.bind(this));
    this.particleToggleBtn.addEventListener('click', this.handleParticleToggle.bind(this));
    this.wireframeToggleBtn.addEventListener('click', this.handleWireframeToggle.bind(this));

    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  /**
   * Handle microphone toggle with proper user interaction
   */
  private async handleMicrophoneToggle(): Promise<void> {
    if (this.currentAudioMode === 'microphone') {
      this.stopCurrentAudio();
      return;
    }

    try {
      this.showLoading('Checking microphone access...');
      
      // First check if microphone access is possible
      const permissionCheck = await this.audioAnalyzer.checkMicrophonePermissions();
      if (!permissionCheck.available) {
        throw new Error(permissionCheck.error!);
      }
      
      this.showLoading('Requesting microphone access...');
      
      // Ensure audio context is initialized (requires user interaction)
      await this.audioAnalyzer.initialize();
      
      // Connect to microphone with enhanced error handling
      await this.audioAnalyzer.connectMicrophone();
      
      this.currentAudioMode = 'microphone';
      this.isPlaying = true;
      this.visualizer.startAnimation();
      
      this.updateAudioStatus('Microphone active', true);
      this.hideLoading();
      
      // Show success message briefly
      this.showSuccessMessage('Microphone connected successfully!');
      
    } catch (error: any) {
      console.error('Microphone access error:', error);
      
      let userMessage = error.message || 'Unknown error occurred';
      
      // Add browser-specific help if needed
      if (userMessage.includes('denied')) {
        userMessage += this.getBrowserSpecificHelp();
      }
      
      this.showError(userMessage);
      this.hideLoading();
    }
    
    this.updateUI();
  }

  /**
   * Get browser-specific help for microphone permissions
   */
  private getBrowserSpecificHelp(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('chrome')) {
      return '\n\n🔧 Chrome users:\n1. Look for the microphone icon in the address bar\n2. Click it and select "Always allow"\n3. Refresh the page';
    } else if (userAgent.includes('firefox')) {
      return '\n\n🔧 Firefox users:\n1. Click the shield icon in the address bar\n2. Turn off "Enhanced Tracking Protection" for this site\n3. Refresh and allow microphone access';
    } else if (userAgent.includes('safari')) {
      return '\n\n🔧 Safari users:\n1. Go to Safari > Preferences > Websites > Microphone\n2. Set this website to "Allow"\n3. Refresh the page';
    } else if (userAgent.includes('edge')) {
      return '\n\n🔧 Edge users:\n1. Click the lock icon in the address bar\n2. Set microphone to "Allow"\n3. Refresh the page';
    }
    
    return '\n\n🔧 General help:\n1. Look for microphone/camera icons in your browser\n2. Click to allow microphone access\n3. Refresh the page and try again';
  }

  /**
   * Show success message briefly
   */
  private showSuccessMessage(message: string): void {
    // Create temporary success element if it doesn't exist
    let successElement = document.getElementById('success-message') as HTMLElement;
    if (!successElement) {
      successElement = document.createElement('div');
      successElement.id = 'success-message';
      successElement.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        z-index: 1000;
        font-family: Arial, sans-serif;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        opacity: 0;
        transition: opacity 0.3s ease;
      `;
      document.body.appendChild(successElement);
    }
    
    successElement.textContent = message;
    successElement.style.display = 'block';
    
    // Fade in
    setTimeout(() => {
      successElement.style.opacity = '1';
    }, 10);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      successElement.style.opacity = '0';
      setTimeout(() => {
        successElement.style.display = 'none';
      }, 300);
    }, 3000);
  }

  /**
   * Handle file upload
   */
  private async handleFileUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    try {
      this.showLoading('Loading audio file...');
      this.stopCurrentAudio();
      
      const audioElement = await this.audioAnalyzer.connectAudioFile(file);
      
      this.currentAudioMode = 'file';
      this.isPlaying = false;
      
      this.updateAudioStatus(`File loaded: ${file.name}`, false);
      this.hideLoading();
      
      // Set up audio element event listeners
      audioElement.addEventListener('ended', () => {
        this.isPlaying = false;
        this.visualizer.stopAnimation();
        this.updateUI();
      });
      
    } catch (error) {
      this.showError(`Failed to load audio file: ${error}`);
      this.hideLoading();
    }
    
    this.updateUI();
    
    // Clear file input
    input.value = '';
  }

  /**
   * Handle play button
   */
  private handlePlay(): void {
    if (this.currentAudioMode !== 'file') return;
    
    const audioElement = this.audioAnalyzer.getCurrentAudioElement();
    if (audioElement) {
      audioElement.play();
      this.isPlaying = true;
      this.visualizer.startAnimation();
      this.updateAudioStatus('Playing', true);
    }
    
    this.updateUI();
  }

  /**
   * Handle pause button
   */
  private handlePause(): void {
    if (this.currentAudioMode !== 'file') return;
    
    const audioElement = this.audioAnalyzer.getCurrentAudioElement();
    if (audioElement) {
      audioElement.pause();
      this.isPlaying = false;
      this.visualizer.stopAnimation();
      this.updateAudioStatus('Paused', false);
    }
    
    this.updateUI();
  }

  /**
   * Handle stop button
   */
  private handleStop(): void {
    this.stopCurrentAudio();
    this.updateUI();
  }

  /**
   * Stop current audio source
   */
  private stopCurrentAudio(): void {
    if (this.currentAudioMode === 'file') {
      const audioElement = this.audioAnalyzer.getCurrentAudioElement();
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
    }
    
    this.currentAudioMode = 'none';
    this.isPlaying = false;
    this.visualizer.stopAnimation();
    this.updateAudioStatus('No audio input', false);
  }

  /**
   * Handle volume change
   */
  private handleVolumeChange(): void {
    const volume = parseInt(this.volumeSlider.value) / 100;
    this.audioAnalyzer.setVolume(volume);
    this.volumeValue.textContent = `${this.volumeSlider.value}%`;
  }

  /**
   * Handle sensitivity change
   */
  private handleSensitivityChange(): void {
    const sensitivity = parseInt(this.sensitivitySlider.value) / 5; // Normalize to 0.2-2.0 range
    this.visualizer.updateConfig({ morphingIntensity: sensitivity });
    this.sensitivityValue.textContent = this.sensitivitySlider.value;
  }

  /**
   * Handle geometry mode toggle
   */
  private handleGeometryModeToggle(): void {
    // For now, we only have icosphere mode
    // This could be extended to support other geometries
    console.log('Geometry mode toggle (only icosphere available)');
  }

  /**
   * Handle particle system toggle
   */
  private handleParticleToggle(): void {
    this.visualizer.toggleParticles();
    this.particleToggleBtn.classList.toggle('active');
  }

  /**
   * Handle wireframe toggle
   */
  private handleWireframeToggle(): void {
    this.visualizer.toggleWireframe();
    this.wireframeToggleBtn.classList.toggle('active');
  }

  /**
   * Handle keyboard shortcuts
   */
  private handleKeyDown(event: KeyboardEvent): void {
    // Prevent default behavior for our shortcuts
    switch (event.code) {
      case 'Space':
        event.preventDefault();
        if (this.currentAudioMode === 'file') {
          if (this.isPlaying) {
            this.handlePause();
          } else {
            this.handlePlay();
          }
        }
        break;
      case 'KeyM':
        if (event.ctrlKey) {
          event.preventDefault();
          this.handleMicrophoneToggle();
        }
        break;
      case 'KeyW':
        if (event.ctrlKey) {
          event.preventDefault();
          this.handleWireframeToggle();
        }
        break;        case 'KeyP':
        if (event.ctrlKey) {
          event.preventDefault();
          this.handleParticleToggle();
        }
        break;
      case 'F3':
        event.preventDefault();
        // Toggle performance monitor (will be handled by main app)
        const toggleEvent = new CustomEvent('togglePerformanceMonitor');
        document.dispatchEvent(toggleEvent);
        break;
    }
  }

  /**
   * Update UI state based on current mode
   */
  private updateUI(): void {
    // Update microphone button
    this.micBtn.textContent = this.currentAudioMode === 'microphone' ? '🎤 Stop Mic' : '🎤 Microphone';
    this.micBtn.classList.toggle('active', this.currentAudioMode === 'microphone');
    
    // Update playback controls
    const hasFileLoaded = this.currentAudioMode === 'file';
    this.playBtn.disabled = !hasFileLoaded || this.isPlaying;
    this.pauseBtn.disabled = !hasFileLoaded || !this.isPlaying;
    this.stopBtn.disabled = this.currentAudioMode === 'none';
    
    // Update volume control (only affects file playback)
    this.volumeSlider.disabled = this.currentAudioMode !== 'file';
  }

  /**
   * Update audio status indicator
   */
  private updateAudioStatus(message: string, isActive: boolean): void {
    this.audioStatus.textContent = message;
    this.audioStatus.classList.toggle('active', isActive);
  }

  /**
   * Show loading state
   */
  private showLoading(message: string): void {
    this.updateAudioStatus(message, false);
  }

  /**
   * Hide loading state
   */
  private hideLoading(): void {
    // Status will be updated by the calling function
  }

  /**
   * Show error message with improved formatting
   */
  private showError(message: string): void {
    // Format the message for better readability
    const formattedMessage = message.replace(/\n/g, '<br>');
    this.errorText.innerHTML = formattedMessage;
    this.errorMessage.style.display = 'block';
    
    // Auto-hide after 10 seconds for longer messages, 5 seconds for short ones
    const hideDelay = message.length > 100 ? 10000 : 5000;
    setTimeout(() => {
      this.errorMessage.style.display = 'none';
    }, hideDelay);
    
    // Add click to dismiss functionality
    const dismissHandler = () => {
      this.errorMessage.style.display = 'none';
      this.errorMessage.removeEventListener('click', dismissHandler);
    };
    this.errorMessage.addEventListener('click', dismissHandler);
  }

  /**
   * Check browser compatibility and show warnings
   */
  checkCompatibility(): void {
    const warnings: string[] = [];
    
    // Check Web Audio API
    if (!AudioAnalyzer.isSupported()) {
      warnings.push('Web Audio API is not supported in this browser');
    }
    
    // Check WebGL
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      warnings.push('WebGL is not supported in this browser');
    }
    
    // Check getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      warnings.push('Microphone access is not supported in this browser');
    }
    
    if (warnings.length > 0) {
      this.showError(`Browser compatibility issues:\n${warnings.join('\n')}`);
    }
  }

  /**
   * Get current audio data for external use
   */
  getCurrentAudioData() {
    return this.audioAnalyzer.getFrequencyData();
  }

  /**
   * Show help modal
   */
  private showHelpModal(): void {
    this.helpModal.style.display = 'block';
  }

  /**
   * Hide help modal
   */
  private hideHelpModal(): void {
    this.helpModal.style.display = 'none';
  }

  /**
   * Handle keyboard shortcuts
   */
  private handleKeyboardShortcuts(event: KeyboardEvent): void {
    // Prevent shortcuts when typing in inputs
    if (event.target instanceof HTMLInputElement) return;
    
    switch (event.key.toLowerCase()) {
      case 'm':
        this.handleMicrophoneToggle();
        break;
      case ' ':
      case 'p':
        if (this.currentAudioMode === 'file') {
          if (this.isPlaying) {
            this.handlePause();
          } else {
            this.handlePlay();
          }
        }
        event.preventDefault();
        break;
      case 's':
        this.handleStop();
        break;
      case 'h':
      case '?':
        if (this.helpModal.style.display === 'block') {
          this.hideHelpModal();
        } else {
          this.showHelpModal();
        }
        break;
      case 'escape':
        this.hideHelpModal();
        break;
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stopCurrentAudio();
    document.removeEventListener('keydown', this.handleKeyboardShortcuts);
  }
}
