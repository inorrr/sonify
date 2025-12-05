
export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  SYNTHESIZING = 'SYNTHESIZING',
  PLAYING = 'PLAYING',
  ERROR = 'ERROR'
}

export type SoundGenre = 'Ambient' | 'Cinematic' | 'Lofi' | 'Cyberpunk' | 'Meditation' | 'Abstract';

export interface SoundBlueprint {
  emotional_tone: string;
  tempo_bpm: number;
  pitch_range: 'low' | 'mid' | 'high' | 'wide';
  harmonic_complexity: 'simple' | 'complex' | 'dissonant';
  sonic_palette: 'warm_synth' | 'glassy_digital' | 'distorted' | 'retro_8bit' | 'organic_wind';
  timbre_brightness: number; // 0.0 to 1.0 (Dark to Bright)
  rhythm_density: number; // 0.0 to 1.0 (Sparse to Dense)
  spatial_reverb: number; // 0.0 to 1.0 (Dry to Vast)
  chaos_factor: number; // 0.0 to 1.0 (Orderly to Chaotic)
  key_elements: string[]; // List of identifiable sonic elements to synthesize
  scene_description: string;
}

export interface AudioEngineStatus {
  isReady: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}
