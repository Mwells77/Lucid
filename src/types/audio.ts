export interface BandConfig {
  delayTime: number  // 0–1 seconds
  feedback: number   // 0–0.9
  gain: number       // 0–1 output level for this band
}

export interface EngineConfig {
  bands: [BandConfig, BandConfig, BandConfig, BandConfig, BandConfig]
  wetDry: number     // 0 = fully dry, 1 = fully wet
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

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  bands: [
    { delayTime: 0.5,  feedback: 0.5, gain: 0.8 },
    { delayTime: 0.35, feedback: 0.45, gain: 0.85 },
    { delayTime: 0.25, feedback: 0.4, gain: 0.9 },
    { delayTime: 0.18, feedback: 0.35, gain: 0.85 },
    { delayTime: 0.12, feedback: 0.3, gain: 0.75 },
  ],
  wetDry: 0.6,
}
