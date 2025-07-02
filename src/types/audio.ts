/**
 * Audio-related type definitions for better type safety
 */

export interface MediaStreamManager {
  stream: MediaStream | null;
  cleanup(): void;
}

export interface AudioContextState {
  context: AudioContext | null;
  state: 'suspended' | 'running' | 'closed' | 'uninitialized';
  sampleRate: number;
}

export interface AudioSourceNode {
  node: AudioBufferSourceNode | MediaStreamAudioSourceNode | MediaElementAudioSourceNode | null;
  type: 'microphone' | 'file' | 'none';
  cleanup(): void;
}
