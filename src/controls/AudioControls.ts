/**
 * AudioControls - Handles audio-specific UI controls
 * Separated from UIController for better single responsibility
 */

import { AudioAnalyzer } from '../AudioAnalyzer';
import { EventBus } from '../utils/EventBus';

export class AudioControls {
  private audioAnalyzer: AudioAnalyzer;
  private eventBus: EventBus;
  
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
  private audioStatus!: HTMLElement;

  // State
  private currentAudioMode: 'none' | 'microphone' | 'file' = 'none';
  private isPlaying = false;

  constructor(audioAnalyzer: AudioAnalyzer, eventBus: EventBus) {
    this.audioAnalyzer = audioAnalyzer;
    this.eventBus = eventBus;
    
    this.initializeElements();
    this.bindEvents();
    this.updateUI();
  }

  private initializeElements(): void {
    this.micBtn = document.getElementById('mic-btn') as HTMLButtonElement;
    this.fileInput = document.getElementById('file-input') as HTMLInputElement;
    this.playBtn = document.getElementById('play-btn') as HTMLButtonElement;
    this.pauseBtn = document.getElementById('pause-btn') as HTMLButtonElement;
    this.stopBtn = document.getElementById('stop-btn') as HTMLButtonElement;
    this.volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
    this.volumeValue = document.getElementById('volume-value') as HTMLSpanElement;
    this.sensitivitySlider = document.getElementById('sensitivity-slider') as HTMLInputElement;
    this.sensitivityValue = document.getElementById('sensitivity-value') as HTMLSpanElement;
    this.audioStatus = document.getElementById('audio-status') as HTMLElement;

    // Validate elements exist
    const elements = [
      this.micBtn, this.fileInput, this.playBtn, this.pauseBtn, this.stopBtn,
      this.volumeSlider, this.volumeValue, this.sensitivitySlider, 
      this.sensitivityValue, this.audioStatus
    ];

    const missingElements = elements.filter(el => !el);
    if (missingElements.length > 0) {
      throw new Error('Audio control elements are missing from the DOM');
    }
  }

  private bindEvents(): void {
    this.micBtn.addEventListener('click', this.handleMicrophoneToggle.bind(this));
    this.fileInput.addEventListener('change', this.handleFileUpload.bind(this));
    this.playBtn.addEventListener('click', this.handlePlay.bind(this));
    this.pauseBtn.addEventListener('click', this.handlePause.bind(this));
    this.stopBtn.addEventListener('click', this.handleStop.bind(this));
    this.volumeSlider.addEventListener('input', this.handleVolumeChange.bind(this));
    this.sensitivitySlider.addEventListener('input', this.handleSensitivityChange.bind(this));
  }

  private async handleMicrophoneToggle(): Promise<void> {
    if (this.currentAudioMode === 'microphone') {
      this.stopCurrentAudio();
      return;
    }

    try {
      this.showLoading('Connecting to microphone...');
      await this.audioAnalyzer.connectMicrophone();
      
      this.currentAudioMode = 'microphone';
      this.updateAudioStatus('Microphone connected', true);
      this.eventBus.emit('audio:connected', { type: 'microphone' });
      
    } catch (error: any) {
      this.eventBus.emit('ui:error', { 
        message: error.message, 
        type: 'error' 
      });
    } finally {
      this.hideLoading();
      this.updateUI();
    }
  }

  private async handleFileUpload(event: Event): Promise<void> {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) return;

    try {
      this.showLoading('Loading audio file...');
      this.stopCurrentAudio();
      
      const audioElement = await this.audioAnalyzer.connectAudioFile(file);
      
      this.currentAudioMode = 'file';
      this.updateAudioStatus(`Loaded: ${file.name}`, true);
      this.eventBus.emit('audio:connected', { 
        type: 'file', 
        element: audioElement 
      });
      
    } catch (error: any) {
      this.eventBus.emit('ui:error', { 
        message: `Failed to load audio file: ${error.message}`, 
        type: 'error' 
      });
    } finally {
      this.hideLoading();
      this.updateUI();
    }
  }

  private handlePlay(): void {
    if (this.currentAudioMode !== 'file') return;
    
    const audioElement = this.audioAnalyzer.getCurrentAudioElement();
    if (audioElement) {
      audioElement.play();
      this.isPlaying = true;
      this.updateAudioStatus('Playing', true);
    }
    
    this.updateUI();
  }

  private handlePause(): void {
    if (this.currentAudioMode !== 'file') return;
    
    const audioElement = this.audioAnalyzer.getCurrentAudioElement();
    if (audioElement) {
      audioElement.pause();
      this.isPlaying = false;
      this.updateAudioStatus('Paused', false);
    }
    
    this.updateUI();
  }

  private handleStop(): void {
    this.stopCurrentAudio();
    this.updateUI();
  }

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
    this.updateAudioStatus('No audio source', false);
    this.eventBus.emit('audio:disconnected', undefined);
  }

  private handleVolumeChange(): void {
    const volume = parseInt(this.volumeSlider.value) / 100;
    this.audioAnalyzer.setVolume(volume);
    this.volumeValue.textContent = this.volumeSlider.value + '%';
  }

  private handleSensitivityChange(): void {
    const sensitivity = parseInt(this.sensitivitySlider.value) / 5;
    this.sensitivityValue.textContent = this.sensitivitySlider.value;
    this.eventBus.emit('visual:configChanged', { morphingIntensity: sensitivity });
  }

  private updateUI(): void {
    // Update button states
    this.micBtn.classList.toggle('active', this.currentAudioMode === 'microphone');
    this.playBtn.disabled = this.currentAudioMode !== 'file' || this.isPlaying;
    this.pauseBtn.disabled = this.currentAudioMode !== 'file' || !this.isPlaying;
    this.stopBtn.disabled = this.currentAudioMode === 'none';
  }

  private updateAudioStatus(message: string, isActive: boolean): void {
    this.audioStatus.textContent = message;
    this.audioStatus.className = isActive ? 'status-active' : 'status-inactive';
  }

  private showLoading(message: string): void {
    this.updateAudioStatus(message, false);
  }

  private hideLoading(): void {
    // Status will be updated by the calling method
  }

  dispose(): void {
    // Clean up event listeners if needed
  }
}
