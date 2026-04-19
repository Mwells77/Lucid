export interface BandConfig {
  delayTime: number  // 0–1 seconds
  feedback: number   // 0–0.9
  gain: number       // 0–1 output level for this band
}

export interface EngineConfig {
  bands: [BandConfig, BandConfig, BandConfig, BandConfig, BandConfig]
  wetDry: number
  resonator: ResonatorConfig
}

export interface BandDescriptor {
  name: string
  lowFreq: number
  highFreq: number
}

export const BAND_DESCRIPTORS: readonly BandDescriptor[] = [
  { name: 'sub-bass',  lowFreq: 0,    highFreq: 80   },
  { name: 'bass',      lowFreq: 80,   highFreq: 300  },
  { name: 'low-mid',   lowFreq: 300,  highFreq: 1000 },
  { name: 'high-mid',  lowFreq: 1000, highFreq: 6000 },
  { name: 'air',       lowFreq: 6000, highFreq: 20000 },
] as const

export const DEFAULT_BAND_CONFIG: BandConfig = {
  delayTime: 0.3,
  feedback: 0.4,
  gain: 0.8,
}

export interface ResonatorBand {
  resonantFreq: number
  gain: number
}

export interface Chord {
  name: string
  tones: [number, number, number, number, number]
}

export const GHIBLI_CHORDS: Chord[] = [
  { name: 'Fmaj9',      tones: [174.61, 220.00, 261.63, 329.63, 392.00] },
  { name: 'Am9',        tones: [220.00, 261.63, 329.63, 392.00, 493.88] },
  { name: 'Dm11',       tones: [146.83, 174.61, 220.00, 261.63, 329.63] },
  { name: 'Cmaj9(#11)', tones: [261.63, 329.63, 392.00, 493.88, 739.99] },
]

export interface ResonatorConfig {
  enabled: boolean
  chord: Chord
  q: number       // 4..40
  wetDry: number  // 0..1
  bands: ResonatorBand[]
}

export const DEFAULT_RESONATOR_CONFIG: ResonatorConfig = {
  enabled: false,
  chord: GHIBLI_CHORDS[0],
  q: 18,
  wetDry: 0.4,
  bands: GHIBLI_CHORDS[0].tones.map(freq => ({ resonantFreq: freq, gain: 1.0 })),
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  bands: [
    { delayTime: 0.5,  feedback: 0.5,  gain: 0.8  },
    { delayTime: 0.35, feedback: 0.45, gain: 0.85 },
    { delayTime: 0.25, feedback: 0.4,  gain: 0.9  },
    { delayTime: 0.18, feedback: 0.35, gain: 0.85 },
    { delayTime: 0.12, feedback: 0.3,  gain: 0.75 },
  ],
  wetDry: 0.6,
  resonator: DEFAULT_RESONATOR_CONFIG,
}
