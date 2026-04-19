import type { BandConfig, Chord, EngineConfig, ResonatorBand } from '../types/audio'
import { DEFAULT_ENGINE_CONFIG } from '../types/audio'

export async function getAudioInputDevices(): Promise<Array<{ deviceId: string; label: string }>> {
  const tempStream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const devices = await navigator.mediaDevices.enumerateDevices()
  tempStream.getTracks().forEach(t => t.stop())
  return devices
    .filter(d => d.kind === 'audioinput')
    .map(d => ({ deviceId: d.deviceId, label: d.label }))
}

interface BandNodes {
  lowpass: BiquadFilterNode
  highpass: BiquadFilterNode
  delay: DelayNode
  feedback: GainNode
  output: GainNode
}

export class AudioEngine {
  private ctx: AudioContext | null = null
  private stream: MediaStream | null = null
  private source: MediaStreamAudioSourceNode | null = null

  private dryGain: GainNode | null = null
  private wetGain: GainNode | null = null
  private masterOut: GainNode | null = null
  private bands: BandNodes[] = []

  private resonatorBands: BiquadFilterNode[] = []
  private resonatorBandGains: GainNode[] = []
  private resonatorSum: GainNode | null = null
  private resonatorWetGain: GainNode | null = null

  private config: EngineConfig

  constructor(config: EngineConfig = DEFAULT_ENGINE_CONFIG) {
    this.config = structuredClone(config)
  }

  async start(deviceId?: string): Promise<void> {
    if (this.ctx) return

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
      video: false,
    })
    this.ctx = new AudioContext()

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume()
    }

    const ctx = this.ctx
    this.source = ctx.createMediaStreamSource(this.stream)

    // Dry path
    this.dryGain = ctx.createGain()
    this.dryGain.gain.value = 1 - this.config.wetDry

    // Multiband delay wet path
    this.wetGain = ctx.createGain()
    this.wetGain.gain.value = this.config.wetDry

    // Master output
    this.masterOut = ctx.createGain()
    this.masterOut.gain.value = 1

    this.source.connect(this.dryGain)
    this.dryGain.connect(this.masterOut)
    this.wetGain.connect(this.masterOut)

    // Multiband delay bands
    const bandFreqs: [number, number][] = [
      [0, 80], [80, 300], [300, 1000], [1000, 6000], [6000, 20000],
    ]

    this.bands = bandFreqs.map(([low, high], i) => {
      const cfg = this.config.bands[i]

      const highpass = ctx.createBiquadFilter()
      highpass.type = 'highpass'
      highpass.frequency.value = low === 0 ? 1 : low
      highpass.Q.value = 0.7

      const lowpass = ctx.createBiquadFilter()
      lowpass.type = 'lowpass'
      lowpass.frequency.value = high === 20000 ? 22000 : high
      lowpass.Q.value = 0.7

      const delay = ctx.createDelay(1.0)
      delay.delayTime.value = cfg.delayTime

      const feedback = ctx.createGain()
      feedback.gain.value = cfg.feedback

      const output = ctx.createGain()
      output.gain.value = cfg.gain

      this.source!.connect(highpass)
      highpass.connect(lowpass)
      lowpass.connect(delay)
      delay.connect(feedback)
      feedback.connect(delay)
      delay.connect(output)
      output.connect(this.wetGain!)

      return { lowpass, highpass, delay, feedback, output }
    })

    // Harmonic resonator
    const resCfg = this.config.resonator

    this.resonatorSum = ctx.createGain()
    this.resonatorSum.gain.value = 1

    this.resonatorWetGain = ctx.createGain()
    this.resonatorWetGain.gain.value = resCfg.enabled ? resCfg.wetDry : 0

    this.resonatorBands = []
    this.resonatorBandGains = []

    for (let i = 0; i < 5; i++) {
      const bandCfg = resCfg.bands[i]

      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = bandCfg.resonantFreq
      bp.Q.value = resCfg.q

      const gain = ctx.createGain()
      gain.gain.value = bandCfg.gain

      this.source.connect(bp)
      bp.connect(gain)
      gain.connect(this.resonatorSum)

      this.resonatorBands.push(bp)
      this.resonatorBandGains.push(gain)
    }

    this.resonatorSum.connect(this.resonatorWetGain)
    this.resonatorWetGain.connect(this.masterOut)
    this.masterOut.connect(ctx.destination)
  }

  stop(): void {
    this.stream?.getTracks().forEach(t => t.stop())
    this.ctx?.close()
    this.ctx = null
    this.stream = null
    this.source = null
    this.dryGain = null
    this.wetGain = null
    this.masterOut = null
    this.bands = []
    this.resonatorBands = []
    this.resonatorBandGains = []
    this.resonatorSum = null
    this.resonatorWetGain = null
  }

  updateBand(index: number, patch: Partial<BandConfig>): void {
    if (index < 0 || index >= 5) return
    const band = this.bands[index]
    const cfg = this.config.bands[index]

    if (patch.delayTime !== undefined) {
      cfg.delayTime = patch.delayTime
      if (band) band.delay.delayTime.setTargetAtTime(patch.delayTime, this.ctx!.currentTime, 0.02)
    }
    if (patch.feedback !== undefined) {
      cfg.feedback = Math.min(0.9, patch.feedback)
      if (band) band.feedback.gain.setTargetAtTime(cfg.feedback, this.ctx!.currentTime, 0.02)
    }
    if (patch.gain !== undefined) {
      cfg.gain = patch.gain
      if (band) band.output.gain.setTargetAtTime(patch.gain, this.ctx!.currentTime, 0.02)
    }
  }

  updateWetDry(value: number): void {
    this.config.wetDry = value
    if (!this.ctx) return
    this.wetGain?.gain.setTargetAtTime(value, this.ctx.currentTime, 0.02)
    this.dryGain?.gain.setTargetAtTime(1 - value, this.ctx.currentTime, 0.02)
  }

  setResonatorChord(chord: Chord): void {
    this.config.resonator.chord = chord
    chord.tones.forEach((freq, i) => {
      this.config.resonator.bands[i].resonantFreq = freq
      if (this.ctx && this.resonatorBands[i]) {
        this.resonatorBands[i].frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.25)
      }
    })
  }

  setResonatorQ(q: number): void {
    this.config.resonator.q = q
    if (!this.ctx) return
    const now = this.ctx.currentTime
    this.resonatorBands.forEach(bp => bp.Q.setTargetAtTime(q, now, 0.02))
  }

  setResonatorEnabled(enabled: boolean): void {
    this.config.resonator.enabled = enabled
    if (!this.ctx || !this.resonatorWetGain) return
    const target = enabled ? this.config.resonator.wetDry : 0
    this.resonatorWetGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.02)
  }

  setResonatorWetDry(value: number): void {
    this.config.resonator.wetDry = value
    if (!this.ctx || !this.resonatorWetGain) return
    if (this.config.resonator.enabled) {
      this.resonatorWetGain.gain.setTargetAtTime(value, this.ctx.currentTime, 0.02)
    }
  }

  updateResonatorBand(i: number, patch: Partial<ResonatorBand>): void {
    if (i < 0 || i >= 5) return
    const bandCfg = this.config.resonator.bands[i]
    if (patch.resonantFreq !== undefined) {
      bandCfg.resonantFreq = patch.resonantFreq
      if (this.ctx && this.resonatorBands[i]) {
        this.resonatorBands[i].frequency.setTargetAtTime(patch.resonantFreq, this.ctx.currentTime, 0.02)
      }
    }
    if (patch.gain !== undefined) {
      bandCfg.gain = patch.gain
      if (this.ctx && this.resonatorBandGains[i]) {
        this.resonatorBandGains[i].gain.setTargetAtTime(patch.gain, this.ctx.currentTime, 0.02)
      }
    }
  }

  getConfig(): EngineConfig {
    return structuredClone(this.config)
  }

  get isRunning(): boolean {
    return this.ctx !== null
  }
}
