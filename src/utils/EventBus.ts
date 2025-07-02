/**
 * EventBus - Simple event system for component communication
 * Enables loose coupling between audio, visual, and UI systems
 */

export type EventCallback<T = any> = (data: T) => void;

export interface AudioVisualizerEvents {
  'audio:connected': { type: 'microphone' | 'file'; element?: HTMLAudioElement };
  'audio:disconnected': void;
  'audio:data': AudioFrequencyData;
  'visual:modeChanged': { mode: string };
  'visual:configChanged': Partial<VisualizerConfig>;
  'performance:warning': { metric: string; value: number };
  'ui:error': { message: string; type: 'warning' | 'error' };
  'ui:success': { message: string };
}

interface AudioFrequencyData {
  bassLevel: number;
  midLevel: number;
  trebleLevel: number;
  overallLevel: number;
  frequencyData: Uint8Array;
  waveformData: Uint8Array;
}

interface VisualizerConfig {
  geometrySegments: number;
  particleCount: number;
  morphingIntensity: number;
  colorSaturation: number;
  enableWireframe: boolean;
}

export class EventBus {
  private events = new Map<string, EventCallback[]>();

  on<K extends keyof AudioVisualizerEvents>(
    event: K,
    callback: EventCallback<AudioVisualizerEvents[K]>
  ): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  off<K extends keyof AudioVisualizerEvents>(
    event: K,
    callback: EventCallback<AudioVisualizerEvents[K]>
  ): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit<K extends keyof AudioVisualizerEvents>(
    event: K,
    data: AudioVisualizerEvents[K]
  ): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event callback for ${event}:`, error);
        }
      });
    }
  }

  clear(): void {
    this.events.clear();
  }

  // Singleton pattern for global event bus
  private static instance: EventBus;
  
  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }
}
