import { useCallback, useRef, useState } from 'react'
import { AudioEngine } from './audio/engine'
import { Orb } from './components/Orb'
import { DevPanel } from './components/DevPanel'
import type { BandConfig } from './types/audio'
import { DEFAULT_ENGINE_CONFIG } from './types/audio'
import './App.css'

export function App() {
  const engineRef = useRef<AudioEngine | null>(null)
  const [active, setActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bands, setBands] = useState<BandConfig[]>(DEFAULT_ENGINE_CONFIG.bands)
  const [wetDry, setWetDry] = useState(DEFAULT_ENGINE_CONFIG.wetDry)

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
        engineRef.current = new AudioEngine({
          bands: bands as [BandConfig, BandConfig, BandConfig, BandConfig, BandConfig],
          wetDry,
        })
      }
      await engineRef.current.start()
      setActive(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'microphone access denied'
      setError(msg)
      engineRef.current = null
    }
  }, [active, bands, wetDry])

  const handleBandChange = useCallback((index: number, patch: Partial<BandConfig>) => {
    engineRef.current?.updateBand(index, patch)
    setBands(prev => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)))
  }, [])

  const handleWetDryChange = useCallback((value: number) => {
    engineRef.current?.updateWetDry(value)
    setWetDry(value)
  }, [])

  const handleReset = useCallback(() => {
    DEFAULT_ENGINE_CONFIG.bands.forEach((cfg, i) => {
      engineRef.current?.updateBand(i, cfg)
    })
    engineRef.current?.updateWetDry(DEFAULT_ENGINE_CONFIG.wetDry)
    setBands(structuredClone(DEFAULT_ENGINE_CONFIG.bands))
    setWetDry(DEFAULT_ENGINE_CONFIG.wetDry)
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
        />
      </section>
    </main>
  )
}
