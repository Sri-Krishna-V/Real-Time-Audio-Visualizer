/**
 * AudioAnalyzer - Handles audio input, processing, and frequency analysis
 * Optimized for 60fps real-time performance with consistent FFT size
 */

export interface AudioFrequencyData {
  bassLevel: number;
  midLevel: number;
  trebleLevel: number;
  overallLevel: number;
  frequencyData: Uint8Array;
  waveformData: Uint8Array;
}

export interface AudioAnalyzerConfig {
  fftSize: number;
  smoothingTimeConstant: number;
  bassRange: [number, number];
  midRange: [number, number];
  trebleRange: [number, number];
}

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  
  // Audio data buffers
  private frequencyData: Uint8Array;
  private waveformData: Uint8Array;
  
  // Configuration
  private config: AudioAnalyzerConfig = {
    fftSize: 2048,
    smoothingTimeConstant: 0.8,
    bassRange: [0, 10],      // ~20-250Hz (bins 0-10 at 44.1kHz)
    midRange: [10, 100],     // ~250-4000Hz (bins 10-100)
    trebleRange: [100, 512]  // ~4000-20000Hz (bins 100-512)
  };

  // Current audio element for file playback
  private currentAudioElement: HTMLAudioElement | null = null;
  private isInitialized = false;

  constructor(config?: Partial<AudioAnalyzerConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    this.frequencyData = new Uint8Array(this.config.fftSize / 2);
    this.waveformData = new Uint8Array(this.config.fftSize);
  }

  /**
   * Initialize audio context and analyzer
   * Must be called after user interaction
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create audio context - must be done after user interaction
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Handle suspended audio context (common in modern browsers)
      if (this.audioContext.state === 'suspended') {
        console.log('Audio context is suspended, attempting to resume...');
        await this.audioContext.resume();
      }

      // Create analyzer node
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.config.fftSize;
      this.analyser.smoothingTimeConstant = this.config.smoothingTimeConstant;

      // Create gain node for volume control
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);

      this.isInitialized = true;
      console.log('Audio context initialized successfully');
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
      throw new Error(`Failed to initialize audio context: ${error}`);
    }
  }

  /**
   * Check if microphone access is possible
   */
  async checkMicrophonePermissions(): Promise<{ available: boolean; error?: string }> {
    // Check if we're running on HTTPS or localhost (required for getUserMedia)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      return {
        available: false,
        error: 'Microphone access requires HTTPS or localhost. Please use https:// or run on localhost.'
      };
    }

    // Check if getUserMedia is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        available: false,
        error: 'getUserMedia is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.'
      };
    }

    // Check permissions API if available
    if (navigator.permissions) {
      try {
        const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (permission.state === 'denied') {
          return {
            available: false,
            error: 'Microphone access has been permanently denied. Please reset permissions in your browser settings.'
          };
        }
      } catch (e) {
        // Permissions API might not be available, continue with getUserMedia attempt
        console.log('Permissions API not available, proceeding with getUserMedia');
      }
    }

    return { available: true };
  }

  /**
   * Connect to microphone input with enhanced error handling and fallback strategies
   */
  async connectMicrophone(): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    
    // First check if microphone access is possible
    const permissionCheck = await this.checkMicrophonePermissions();
    if (!permissionCheck.available) {
      throw new Error(permissionCheck.error!);
    }

    this.disconnectCurrentSource();

    // Try different constraint configurations for better compatibility
    const constraintConfigs = [
      // Ideal configuration
      {
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
          sampleRate: 44100
        },
        video: false
      },
      // Fallback configuration with fewer constraints
      {
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        },
        video: false
      },
      // Basic configuration
      {
        audio: true,
        video: false
      }
    ];

    let lastError: Error | null = null;

    for (let i = 0; i < constraintConfigs.length; i++) {
      try {
        console.log(`Attempting microphone connection with config ${i + 1}/${constraintConfigs.length}`);
        
        const stream = await navigator.mediaDevices.getUserMedia(constraintConfigs[i]);

        // Check if we got a valid stream
        if (!stream || stream.getAudioTracks().length === 0) {
          throw new Error('No audio tracks received from microphone');
        }

        // Verify the stream is active
        const audioTracks = stream.getAudioTracks();
        if (audioTracks[0].readyState !== 'live') {
          throw new Error('Microphone stream is not active');
        }

        // Create audio source from stream
        this.source = this.audioContext!.createMediaStreamSource(stream);
        this.source.connect(this.analyser!);
        
        // Store the stream for cleanup
        (this as any).currentStream = stream;
        
        console.log(`Microphone connected successfully with config ${i + 1}`);
        console.log('Audio track settings:', audioTracks[0].getSettings());
        return;

      } catch (error: any) {
        lastError = error;
        console.warn(`Configuration ${i + 1} failed:`, error.message);
        
        // If it's a permission error, don't try other configurations
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          break;
        }
      }
    }

    // All configurations failed, throw the last error with user-friendly message
    if (lastError) {
      const errorMessage = this.getMicrophoneErrorMessage(lastError);
      console.error('All microphone connection attempts failed:', lastError);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get user-friendly error message for microphone errors
   */
  private getMicrophoneErrorMessage(error: any): string {
    const errorName = error.name || '';
    const errorMessage = error.message || '';

    switch (errorName) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        return 'Microphone access denied. Please:\n1. Click the microphone icon in your browser\'s address bar\n2. Select "Allow" for microphone access\n3. Refresh the page and try again';
      
      case 'NotFoundError':
        return 'No microphone found. Please:\n1. Connect a microphone to your device\n2. Check that it\'s properly recognized by your system\n3. Try refreshing the page';
      
      case 'NotReadableError':
        return 'Microphone is already in use. Please:\n1. Close other applications using the microphone\n2. Restart your browser\n3. Try again';
      
      case 'OverconstrainedError':
        return 'Your microphone doesn\'t meet the requirements. Please:\n1. Try using a different microphone\n2. Check your audio device settings\n3. Restart your browser';
      
      case 'SecurityError':
        return 'Microphone access blocked due to security restrictions. Please:\n1. Ensure you\'re on HTTPS or localhost\n2. Check your browser\'s security settings\n3. Try in an incognito/private window';
      
      case 'AbortError':
        return 'Microphone access was interrupted. Please try again.';
      
      default:
        if (errorMessage.includes('HTTPS') || errorMessage.includes('localhost')) {
          return errorMessage + '\n\nPlease use https:// or run on localhost/127.0.0.1';
        }
        return errorMessage || 'Unknown microphone error. Please check your browser and device settings.';
    }
  }

  /**
   * Connect to audio file
   */
  async connectAudioFile(file: File): Promise<HTMLAudioElement> {
    if (!this.isInitialized) await this.initialize();

    try {
      this.disconnectCurrentSource();

      // Create audio element
      const audioElement = new Audio();
      audioElement.src = URL.createObjectURL(file);
      audioElement.crossOrigin = 'anonymous';
      
      // Wait for audio to be ready
      await new Promise((resolve, reject) => {
        audioElement.addEventListener('loadeddata', resolve);
        audioElement.addEventListener('error', reject);
        audioElement.load();
      });

      // Create audio source from element
      this.source = this.audioContext!.createMediaElementSource(audioElement);
      this.source.connect(this.analyser!);
      this.source.connect(this.gainNode!);

      this.currentAudioElement = audioElement;
      
      console.log('Audio file connected successfully');
      return audioElement;
    } catch (error) {
      throw new Error(`Failed to load audio file: ${error}`);
    }
  }

  /**
   * Disconnect current audio source and cleanup resources
   */
  private disconnectCurrentSource(): void {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    // Clean up media stream if it exists
    if ((this as any).currentStream) {
      const stream = (this as any).currentStream as MediaStream;
      stream.getTracks().forEach(track => {
        track.stop();
      });
      (this as any).currentStream = null;
    }
    
    if (this.currentAudioElement) {
      this.currentAudioElement.pause();
      URL.revokeObjectURL(this.currentAudioElement.src);
      this.currentAudioElement = null;
    }
  }

  /**
   * Get current frequency analysis data
   * Normalized to 0-1 range for shader compatibility
   */
  getFrequencyData(): AudioFrequencyData {
    if (!this.analyser) {
      return {
        bassLevel: 0,
        midLevel: 0,
        trebleLevel: 0,
        overallLevel: 0,
        frequencyData: this.frequencyData,
        waveformData: this.waveformData
      };
    }

    // Get fresh data from analyzer
    this.analyser.getByteFrequencyData(this.frequencyData);
    this.analyser.getByteTimeDomainData(this.waveformData);

    // Calculate frequency band levels
    const bassLevel = this.calculateBandLevel(this.config.bassRange);
    const midLevel = this.calculateBandLevel(this.config.midRange);
    const trebleLevel = this.calculateBandLevel(this.config.trebleRange);
    
    // Calculate overall level (RMS of all frequencies)
    const overallLevel = this.calculateOverallLevel();

    return {
      bassLevel,
      midLevel,
      trebleLevel,
      overallLevel,
      frequencyData: this.frequencyData,
      waveformData: this.waveformData
    };
  }

  /**
   * Calculate average level for a frequency band
   */
  private calculateBandLevel([start, end]: [number, number]): number {
    let sum = 0;
    const count = end - start;
    
    for (let i = start; i < end && i < this.frequencyData.length; i++) {
      sum += this.frequencyData[i];
    }
    
    // Normalize to 0-1 range
    return count > 0 ? (sum / count) / 255 : 0;
  }

  /**
   * Calculate overall audio level
   */
  private calculateOverallLevel(): number {
    let sum = 0;
    for (let i = 0; i < this.frequencyData.length; i++) {
      sum += this.frequencyData[i] * this.frequencyData[i];
    }
    
    // RMS calculation, normalized to 0-1
    return Math.sqrt(sum / this.frequencyData.length) / 255;
  }

  /**
   * Set volume (0-1 range)
   */
  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Get current audio element for playback controls
   */
  getCurrentAudioElement(): HTMLAudioElement | null {
    return this.currentAudioElement;
  }

  /**
   * Check if audio context is available
   */
  static isSupported(): boolean {
    return !!(window.AudioContext || (window as any).webkitAudioContext);
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.disconnectCurrentSource();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.analyser = null;
    this.gainNode = null;
    this.isInitialized = false;
  }
}
