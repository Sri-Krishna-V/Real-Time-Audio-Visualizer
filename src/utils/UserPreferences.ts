/**
 * UserPreferences - Persistent user settings management
 * Saves and loads user preferences from localStorage
 */

export interface UserPreferencesData {
  // Audio settings
  volume: number;
  sensitivity: number;
  preferredAudioSource: 'microphone' | 'file' | 'none';
  
  // Visual settings
  visualMode: 'icosphere' | 'particles' | 'combined';
  enableWireframe: boolean;
  enableParticles: boolean;
  colorScheme: 'default' | 'neon' | 'warm' | 'cool';
  
  // Performance settings
  lodLevel: 'auto' | 'potato' | 'low' | 'medium' | 'high' | 'ultra';
  enablePerformanceMonitor: boolean;
  
  // UI settings
  enableKeyboardShortcuts: boolean;
  autoHideControls: boolean;
  reducedMotion: boolean;
}

export class UserPreferences {
  private static readonly STORAGE_KEY = 'audio-visualizer-preferences';
  private preferences: UserPreferencesData;
  private changeCallbacks: Array<(prefs: UserPreferencesData) => void> = [];

  constructor() {
    this.preferences = this.getDefaultPreferences();
    this.loadPreferences();
  }

  /**
   * Get default preferences
   */
  private getDefaultPreferences(): UserPreferencesData {
    return {
      // Audio settings
      volume: 0.8,
      sensitivity: 1.0,
      preferredAudioSource: 'none',
      
      // Visual settings
      visualMode: 'combined',
      enableWireframe: false,
      enableParticles: true,
      colorScheme: 'default',
      
      // Performance settings
      lodLevel: 'auto',
      enablePerformanceMonitor: false,
      
      // UI settings
      enableKeyboardShortcuts: true,
      autoHideControls: false,
      reducedMotion: this.detectReducedMotion()
    };
  }

  /**
   * Detect if user prefers reduced motion
   */
  private detectReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Load preferences from localStorage
   */
  private loadPreferences(): void {
    try {
      const stored = localStorage.getItem(UserPreferences.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.preferences = { ...this.preferences, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
    }
  }

  /**
   * Save preferences to localStorage
   */
  private savePreferences(): void {
    try {
      localStorage.setItem(UserPreferences.STORAGE_KEY, JSON.stringify(this.preferences));
      this.notifyChanges();
    } catch (error) {
      console.warn('Failed to save user preferences:', error);
    }
  }

  /**
   * Get current preferences
   */
  getPreferences(): UserPreferencesData {
    return { ...this.preferences };
  }

  /**
   * Update preferences
   */
  updatePreferences(updates: Partial<UserPreferencesData>): void {
    this.preferences = { ...this.preferences, ...updates };
    this.savePreferences();
  }

  /**
   * Get specific preference value
   */
  get<K extends keyof UserPreferencesData>(key: K): UserPreferencesData[K] {
    return this.preferences[key];
  }

  /**
   * Set specific preference value
   */
  set<K extends keyof UserPreferencesData>(key: K, value: UserPreferencesData[K]): void {
    this.preferences[key] = value;
    this.savePreferences();
  }

  /**
   * Reset to defaults
   */
  reset(): void {
    this.preferences = this.getDefaultPreferences();
    this.savePreferences();
  }

  /**
   * Subscribe to preference changes
   */
  onChange(callback: (prefs: UserPreferencesData) => void): void {
    this.changeCallbacks.push(callback);
  }

  /**
   * Unsubscribe from preference changes
   */
  offChange(callback: (prefs: UserPreferencesData) => void): void {
    const index = this.changeCallbacks.indexOf(callback);
    if (index > -1) {
      this.changeCallbacks.splice(index, 1);
    }
  }

  /**
   * Notify all listeners of changes
   */
  private notifyChanges(): void {
    this.changeCallbacks.forEach(callback => {
      try {
        callback(this.preferences);
      } catch (error) {
        console.error('Error in preferences change callback:', error);
      }
    });
  }

  /**
   * Export preferences for backup
   */
  export(): string {
    return JSON.stringify(this.preferences, null, 2);
  }

  /**
   * Import preferences from backup
   */
  import(preferencesJson: string): void {
    try {
      const parsed = JSON.parse(preferencesJson);
      this.preferences = { ...this.getDefaultPreferences(), ...parsed };
      this.savePreferences();
    } catch (error) {
      throw new Error('Invalid preferences format');
    }
  }
}
