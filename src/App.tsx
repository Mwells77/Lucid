import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioEngine, getAudioInputDevices } from './audio/engine'
import { Orb } from './components/Orb'
import { DevPanel } from './components/DevPanel'
import type { BandConfig, Chord, ResonatorConfig } from './types/audio'
import { DEFAULT_ENGINE_CONFIG, DEFAULT_RESONATOR_CONFIG } from './types/audio'
import './App.css'

interface AudioDevice {
  deviceId: string
  label: string
}

function pickDefaultDevice(list: AudioDevice[]): string {
  const preferred = list.find(d => /built-in|default/i.test(d.label))
  return (preferred ?? list[0])?.deviceId ?? ''
}

export function App() {
  const engineRef = useRef<AudioEngine | null>(null)
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bands, setBands] = useState<BandConfig[]>(DEFAULT_ENGINE_CONFIG.bands)
  const [wetDry, setWetDry] = useState(DEFAULT_ENGINE_CONFIG.wetDry)
  const [devices, setDevices] = useState<AudioDevice[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)
  const [deviceId, setDeviceId] = useState<string>('')
  const [resonatorConfig, setResonatorConfig] = useState<ResonatorConfig>(
    structuredClone(DEFAULT_RESONATOR_CONFIG)
  )

  useEffect(() => {
    getAudioInputDevices()
      .then(list => {
        setDevices(list)
        setDeviceId(pickDefaultDevice(list))
      })
      .catch(() => {})
      .finally(() => setDevicesLoading(false))
  }, [])

  function makeEngine(): AudioEngine {
    return new AudioEngine({
      bands: bands as [BandConfig, BandConfig, BandConfig, BandConfig, BandConfig],
      wetDry,
      resonator: resonatorConfig,
    })
  }

  const toggle = useCallback(async () => {
    setError(null)

    if (active) {
      engineRef.current?.stop()
      engineRef.current = null
      setActive(false)
      return
    }

    try {
      if (!engineRef.current) {
        engineRef.current = makeEngine()
      }
      await engineRef.current.start(deviceId || undefined)
      setActive(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'microphone access denied'
      setError(msg)
      engineRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, bands, wetDry, deviceId, resonatorConfig])

  const handleDeviceChange = useCallback(async (newDeviceId: string) => {
    setDeviceId(newDeviceId)
    if (active) {
      engineRef.current?.stop()
      engineRef.current = null
      setActive(false)
      setError(null)
      try {
        engineRef.current = makeEngine()
        await engineRef.current.start(newDeviceId || undefined)
        setActive(true)
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'microphone access denied'
        setError(msg)
        engineRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, bands, wetDry, resonatorConfig])

  const handleBandChange = useCallback((index: number, patch: Partial<BandConfig>) => {
    engineRef.current?.updateBand(index, patch)
    setBands(prev => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)))
  }, [])

  const handleWetDryChange = useCallback((value: number) => {
    engineRef.current?.updateWetDry(value)
    setWetDry(value)
  }, [])

  const handleResonatorEnabledChange = useCallback((enabled: boolean) => {
    engineRef.current?.setResonatorEnabled(enabled)
    setResonatorConfig(prev => ({ ...prev, enabled }))
  }, [])

  const handleResonatorChordChange = useCallback((chord: Chord) => {
    engineRef.current?.setResonatorChord(chord)
    setResonatorConfig(prev => ({
      ...prev,
      chord,
      bands: chord.tones.map((freq, i) => ({ ...prev.bands[i], resonantFreq: freq })),
    }))
  }, [])

  const handleResonatorQChange = useCallback((q: number) => {
    engineRef.current?.setResonatorQ(q)
    setResonatorConfig(prev => ({ ...prev, q }))
  }, [])

  const handleResonatorWetDryChange = useCallback((value: number) => {
    engineRef.current?.setResonatorWetDry(value)
    setResonatorConfig(prev => ({ ...prev, wetDry: value }))
  }, [])

  const handleResonatorBandGainChange = useCallback((i: number, gain: number) => {
    engineRef.current?.updateResonatorBand(i, { gain })
    setResonatorConfig(prev => ({
      ...prev,
      bands: prev.bands.map((b, idx) => (idx === i ? { ...b, gain } : b)),
    }))
  }, [])

  const handleReset = useCallback(() => {
    DEFAULT_ENGINE_CONFIG.bands.forEach((cfg, i) => {
      engineRef.current?.updateBand(i, cfg)
    })
    engineRef.current?.updateWetDry(DEFAULT_ENGINE_CONFIG.wetDry)

    const defaultRes = structuredClone(DEFAULT_RESONATOR_CONFIG)
    engineRef.current?.setResonatorEnabled(defaultRes.enabled)
    engineRef.current?.setResonatorChord(defaultRes.chord)
    engineRef.current?.setResonatorQ(defaultRes.q)
    engineRef.current?.setResonatorWetDry(defaultRes.wetDry)
    defaultRes.bands.forEach((b, i) => engineRef.current?.updateResonatorBand(i, b))

    setBands(structuredClone(DEFAULT_ENGINE_CONFIG.bands))
    setWetDry(DEFAULT_ENGINE_CONFIG.wetDry)
    setResonatorConfig(defaultRes)
  }, [])

  return (
    <main className="app">
      <header className="app__header">
        <h1 className="app__title">lucid</h1>
      </header>

      <section className="app__orb-section">
        <Orb active={active} onClick={toggle} />
        {error && <p className="app__error">{error}</p>}
        <p className="app__hint">{active ? 'listening' : 'tap to begin'}</p>
      </section>

      <section className="app__panel-section">
        <DevPanel
          bands={bands}
          wetDry={wetDry}
          onBandChange={handleBandChange}
          onWetDryChange={handleWetDryChange}
          onReset={handleReset}
          devices={devices}
          devicesLoading={devicesLoading}
          selectedDeviceId={deviceId}
          onDeviceChange={handleDeviceChange}
          resonatorConfig={resonatorConfig}
          onResonatorEnabledChange={handleResonatorEnabledChange}
          onResonatorChordChange={handleResonatorChordChange}
          onResonatorQChange={handleResonatorQChange}
          onResonatorWetDryChange={handleResonatorWetDryChange}
          onResonatorBandGainChange={handleResonatorBandGainChange}
        />
      </section>
    </main>
  )
}
