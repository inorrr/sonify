
import * as Tone from 'tone';
import { SoundBlueprint } from '../types';

/**
 * The SoundEngine class manages the synthesis of audio based on the Gemini blueprint.
 * It uses Tone.js to create a procedural soundscape.
 */
class SoundEngine {
  private isInitialized = false;
  private isPlaying = false;
  
  // Audio Nodes
  private masterOutput: Tone.Gain | null = null;
  private reverb: Tone.Reverb | null = null;
  private delay: Tone.PingPongDelay | null = null;
  private filter: Tone.Filter | null = null;
  public analyser: Tone.Analyser | null = null;

  // Synths
  private padSynth: Tone.PolySynth | null = null;
  private textureSynth: Tone.NoiseSynth | null = null;
  private leadSynth: Tone.MonoSynth | null = null;
  
  // Loops
  private loops: Tone.Loop[] = [];

  constructor() {
    // Lazy initialization in init()
  }

  public async init() {
    if (this.isInitialized) return;
    
    await Tone.start();
    
    this.masterOutput = new Tone.Gain(0.8).toDestination();
    this.analyser = new Tone.Analyser("waveform", 256);
    this.masterOutput.connect(this.analyser);

    // Effects Bus
    this.reverb = new Tone.Reverb({ decay: 4, wet: 0.5 }).connect(this.masterOutput);
    await this.reverb.generate();
    
    this.delay = new Tone.PingPongDelay("8n", 0.2).connect(this.reverb);
    this.filter = new Tone.Filter(2000, "lowpass").connect(this.delay);

    this.isInitialized = true;
  }

  /**
   * Configures the synthesizer based on the blueprint.
   */
  public configure(blueprint: SoundBlueprint) {
    if (!this.isInitialized || !this.filter || !this.reverb || !this.delay) return;

    // 1. Set Global Transport
    Tone.Transport.bpm.value = blueprint.tempo_bpm;

    // 2. Configure Effects based on Space
    this.reverb.decay = 1 + (blueprint.spatial_reverb * 10); // 1s to 11s decay
    this.reverb.wet.value = 0.2 + (blueprint.spatial_reverb * 0.6);
    
    // 3. Configure Filter based on Brightness
    // Darker = lower cutoff, Brighter = higher cutoff
    const cutoff = 200 + (blueprint.timbre_brightness * 8000);
    this.filter.frequency.rampTo(cutoff, 0.5);

    // 4. Create/Config Synths
    this.setupPad(blueprint);
    this.setupTexture(blueprint);
    this.setupLead(blueprint);
  }

  private setupPad(blueprint: SoundBlueprint) {
    if (this.padSynth) this.padSynth.dispose();

    let oscillatorType: any = 'triangle';
    
    // Map sonic_palette to oscillator types
    switch (blueprint.sonic_palette) {
      case 'retro_8bit':
        oscillatorType = 'square';
        break;
      case 'glassy_digital':
        oscillatorType = 'fmsine';
        break;
      case 'distorted':
        oscillatorType = 'sawtooth';
        break;
      case 'organic_wind':
        oscillatorType = 'fatcustom';
        break;
      case 'warm_synth':
      default:
        oscillatorType = blueprint.harmonic_complexity === 'dissonant' ? 'amsawtooth' : 'triangle';
        break;
    }
    
    this.padSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: oscillatorType },
      envelope: {
        attack: 2,
        decay: 3,
        sustain: 0.6,
        release: 4
      }
    }).connect(this.filter!); 

    if (blueprint.sonic_palette === 'organic_wind') {
      this.padSynth.set({
        oscillator: {
            partials: [1, 0.2, 0.01]
        }
      });
    }

    // Generate Chord Progression
    const root = blueprint.pitch_range === 'low' ? 'C2' : blueprint.pitch_range === 'high' ? 'C5' : 'C3';
    const scale = blueprint.emotional_tone.toLowerCase().includes('sad') || blueprint.emotional_tone.toLowerCase().includes('dark') 
      ? [0, 3, 7] // Minor
      : [0, 4, 7]; // Major
    
    if (blueprint.harmonic_complexity === 'dissonant') scale.push(6); // Add tritone
    if (blueprint.harmonic_complexity === 'complex') scale.push(11); // Add major 7th

    // Create a loop for the pad
    const loop = new Tone.Loop(time => {
      // Randomly trigger a chord
      if (Math.random() > 0.3) {
        const chord = scale.map(interval => Tone.Frequency(root).transpose(interval).toNote());
        this.padSynth?.triggerAttackRelease(chord, "1m", time);
      }
    }, "1m");
    
    this.loops.push(loop);
  }

  private setupTexture(blueprint: SoundBlueprint) {
    if (this.textureSynth) this.textureSynth.dispose();

    // Noise for texture/ambience
    let noiseType: Tone.NoiseType = 'pink';
    if (blueprint.sonic_palette === 'retro_8bit') noiseType = 'white';
    if (blueprint.sonic_palette === 'organic_wind') noiseType = 'brown';

    this.textureSynth = new Tone.NoiseSynth({
      noise: { type: noiseType },
      envelope: { attack: 1, decay: 0.5, sustain: 0.5, release: 2 }
    }).connect(this.reverb!);

    this.textureSynth.volume.value = -15 + (blueprint.rhythm_density * 5); // Louder if dense

    const density = Math.max(0.1, 1 - blueprint.rhythm_density);
    
    const loop = new Tone.Loop(time => {
      if (Math.random() > density) {
        this.textureSynth?.triggerAttackRelease("4n", time);
      }
    }, "2n");

    this.loops.push(loop);
  }

  private setupLead(blueprint: SoundBlueprint) {
    if (this.leadSynth) this.leadSynth.dispose();

    if (blueprint.rhythm_density < 0.3 && blueprint.sonic_palette !== 'retro_8bit') return; // Skip lead for sparse ambient unless 8bit

    let oscType: any = "sine";
    if (blueprint.sonic_palette === 'retro_8bit') oscType = "square";
    if (blueprint.sonic_palette === 'distorted') oscType = "sawtooth";
    if (blueprint.sonic_palette === 'glassy_digital') oscType = "triangle";

    this.leadSynth = new Tone.MonoSynth({
      oscillator: { type: oscType },
      envelope: { attack: 0.05, decay: 0.3, sustain: 0.2, release: 1 },
      filterEnvelope: { attack: 0.01, decay: 0.7, sustain: 0.1, release: 0.8, baseFrequency: 300, octaves: 4 }
    }).connect(this.delay!); 

    // Arpeggiator pattern
    const interval = blueprint.tempo_bpm > 100 ? "8n" : "4n";
    const randomness = blueprint.chaos_factor;
    const baseNote = Tone.Frequency(blueprint.pitch_range === 'low' ? 'C3' : 'C4');

    const loop = new Tone.Loop(time => {
      if (Math.random() > 0.4) {
        const offset = Math.floor(Math.random() * 12) * (Math.random() > 0.5 ? 1 : -1);
        const note = baseNote.transpose(randomness > 0.5 ? offset : 0).toNote();
        this.leadSynth?.triggerAttackRelease(note, "16n", time);
      }
    }, interval);

    this.loops.push(loop);
  }

  public start() {
    if (this.isPlaying) return;
    
    Tone.Transport.start();
    this.loops.forEach(l => l.start(0));
    
    // Master fade in
    if(this.masterOutput) this.masterOutput.gain.rampTo(1, 1);
    
    this.isPlaying = true;
  }

  public stop() {
    if (!this.isPlaying) return;
    
    // Fade out then stop
    if(this.masterOutput) this.masterOutput.gain.rampTo(0, 0.5);
    
    setTimeout(() => {
      Tone.Transport.stop();
      this.loops.forEach(l => l.stop());
      this.loops.forEach(l => l.dispose());
      this.loops = [];
    }, 500);

    this.isPlaying = false;
  }

  public isRunning() {
    return this.isPlaying;
  }
}

export const soundEngine = new SoundEngine();
