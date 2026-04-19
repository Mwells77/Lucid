import type { BandConfig, EngineConfig } from '../types/audio'
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

    this.source = this.ctx.createMediaStreamSource(this.stream)

    // Dry path — raw mic signal
    this.dryGain = this.ctx.createGain()
    this.dryGain.gain.value = 1 - this.config.wetDry

    // Wet path — processed
    this.wetGain = this.ctx.createGain()
    this.wetGain.gain.value = this.config.wetDry

    // Master output
    this.masterOut = this.ctx.createGain()
    this.masterOut.gain.value = 1

    // Dry routing: source → dryGain → masterOut → destination
    this.source.connect(this.dryGain)
    this.dryGain.connect(this.masterOut)

    // Build multiband wet chain
    const bandFreqs: [number, number][] = [
      [0, 80],
      [80, 300],
      [300, 1000],
      [1000, 6000],
      [6000, 20000],
    ]

    this.bands = bandFreqs.map(([low, high], i) => {
      const cfg = this.config.bands[i]
      const ctx = this.ctx!

      // Band isolation: HP then LP (or just LP for sub-bass, HP for air)
      const highpass = ctx.createBiquadFilter()
      highpass.type = 'highpass'
      highpass.frequency.value = low === 0 ? 1 : low
      highpass.Q.value = 0.7

      const lowpass = ctx.createBiquadFilter()
      lowpass.type = 'lowpass'
      lowpass.frequency.value = high === 20000 ? 22000 : high
      lowpass.Q.value = 0.7

      // Delay
      const delay = ctx.createDelay(1.0)
      delay.delayTime.value = cfg.delayTime

      // Feedback loop: delay output → feedbackGain → delay input
      const feedback = ctx.createGain()
      feedback.gain.value = cfg.feedback

      // Band output gain
      const output = ctx.createGain()
      output.gain.value = cfg.gain

      // Signal flow within band:
      // source → highpass → lowpass → delay → output → wetGain
      //                                ↑         ↓
      //                             feedbackGain ←
      this.source!.connect(highpass)
      highpass.connect(lowpass)
      lowpass.connect(delay)
      delay.connect(feedback)
      feedback.connect(delay)  // feedback loop
      delay.connect(output)
      output.connect(this.wetGain!)

      return { lowpass, highpass, delay, feedback, output }
    })

    this.masterOut.connect(this.ctx.destination)
    // wetGain already connected into masterOut? No — wet sums into master
    this.wetGain.connect(this.masterOut)
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

  getConfig(): EngineConfig {
    return structuredClone(this.config)
  }

  get isRunning(): boolean {
    return this.ctx !== null
  }
}
