import { useState, useRef } from 'react'
import type { BandConfig, Chord, ResonatorConfig } from '../types/audio'
import { BAND_DESCRIPTORS, GHIBLI_CHORDS } from '../types/audio'
import './DevPanel.css'

interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (v: number) => void
}

function SliderRow({ label, value, min, max, step, display, onChange }: SliderRowProps) {
  return (
    <div className="slider-row">
      <div className="slider-row__header">
        <span className="slider-row__label">{label}</span>
        <span className="slider-row__value">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
      />
    </div>
  )
}

interface AudioDevice {
  deviceId: string
  label: string
}

interface DevPanelProps {
  bands: BandConfig[]
  wetDry: number
  onBandChange: (index: number, patch: Partial<BandConfig>) => void
  onWetDryChange: (value: number) => void
  onReset: () => void
  devices: AudioDevice[]
  devicesLoading: boolean
  selectedDeviceId: string
  onDeviceChange: (deviceId: string) => void
  resonatorConfig: ResonatorConfig
  onResonatorEnabledChange: (enabled: boolean) => void
  onResonatorChordChange: (chord: Chord) => void
  onResonatorQChange: (q: number) => void
  onResonatorWetDryChange: (value: number) => void
  onResonatorBandGainChange: (i: number, gain: number) => void
}

export function DevPanel({
  bands, wetDry, onBandChange, onWetDryChange, onReset,
  devices, devicesLoading, selectedDeviceId, onDeviceChange,
  resonatorConfig, onResonatorEnabledChange, onResonatorChordChange,
  onResonatorQChange, onResonatorWetDryChange, onResonatorBandGainChange,
}: DevPanelProps) {
  const [delayEnabled, setDelayEnabled] = useState(true)
  const savedWetDry = useRef(wetDry)

  function handleDelayToggle(enabled: boolean) {
    if (!enabled) {
      savedWetDry.current = wetDry
      onWetDryChange(0)
    } else {
      onWetDryChange(savedWetDry.current)
    }
    setDelayEnabled(enabled)
  }

  return (
    <div className="dev-panel">
      <div className="dev-panel__header">
        <span className="dev-panel__tag">dev</span>
        <span className="dev-panel__title">controls</span>
        <button className="dev-panel__reset" onClick={onReset} title="Reset all to defaults">
          reset
        </button>
      </div>

      <div className="dev-panel__body">
        <div className="dev-panel__mic-row">
          <span className="dev-panel__mic-label">mic</span>
          <select
            className="dev-panel__mic-select"
            disabled={devicesLoading}
            value={selectedDeviceId}
            onChange={e => onDeviceChange(e.target.value)}
          >
            {devicesLoading ? (
              <option value="">Loading microphones...</option>
            ) : (
              devices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || d.deviceId}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="feature-section">
          <div className="feature-section__header">
            <span className="feature-section__name">Multiband Delay</span>
            <input
              type="checkbox"
              className="feature-section__checkbox"
              checked={delayEnabled}
              onChange={e => handleDelayToggle(e.target.checked)}
            />
          </div>

          <div className={`feature-section__content${delayEnabled ? '' : ' feature-section__content--disabled'}`}>
            {BAND_DESCRIPTORS.map((desc, i) => (
              <div key={desc.name} className="band-block">
                <span className="band-block__name">{desc.name}</span>
                <div className="band-block__sliders">
                  <SliderRow
                    label="delay"
                    value={bands[i].delayTime}
                    min={0} max={1} step={0.01}
                    display={`${bands[i].delayTime.toFixed(2)}s`}
                    onChange={v => onBandChange(i, { delayTime: v })}
                  />
                  <SliderRow
                    label="feedback"
                    value={bands[i].feedback}
                    min={0} max={0.9} step={0.01}
                    display={bands[i].feedback.toFixed(2)}
                    onChange={v => onBandChange(i, { feedback: v })}
                  />
                </div>
              </div>
            ))}

            <div className="dev-panel__master">
              <SliderRow
                label="wet / dry"
                value={wetDry}
                min={0} max={1} step={0.01}
                display={`${Math.round(wetDry * 100)}%`}
                onChange={onWetDryChange}
              />
            </div>
          </div>
        </div>

        <div className="feature-section">
          <div className="feature-section__header">
            <span className="feature-section__name">Harmonic Resonator</span>
            <input
              type="checkbox"
              className="feature-section__checkbox"
              checked={resonatorConfig.enabled}
              onChange={e => onResonatorEnabledChange(e.target.checked)}
            />
          </div>

          <div className={`feature-section__content${resonatorConfig.enabled ? '' : ' feature-section__content--disabled'}`}>
            <div className="slider-row">
              <div className="slider-row__header">
                <span className="slider-row__label">chord</span>
                <select
                  className="dev-panel__mic-select"
                  value={resonatorConfig.chord.name}
                  onChange={e => {
                    const chord = GHIBLI_CHORDS.find(c => c.name === e.target.value)
                    if (chord) onResonatorChordChange(chord)
                  }}
                >
                  {GHIBLI_CHORDS.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <SliderRow
              label="Q"
              value={resonatorConfig.q}
              min={4} max={40} step={0.5}
              display={resonatorConfig.q.toFixed(1)}
              onChange={onResonatorQChange}
            />

            <SliderRow
              label="wet / dry"
              value={resonatorConfig.wetDry}
              min={0} max={1} step={0.01}
              display={`${Math.round(resonatorConfig.wetDry * 100)}%`}
              onChange={onResonatorWetDryChange}
            />

            {resonatorConfig.bands.map((band, i) => (
              <div key={i} className="band-block">
                <span className="band-block__name">Tone {i + 1}: {band.resonantFreq.toFixed(2)} Hz</span>
                <div className="band-block__sliders">
                  <SliderRow
                    label="gain"
                    value={band.gain}
                    min={0} max={1} step={0.01}
                    display={band.gain.toFixed(2)}
                    onChange={v => onResonatorBandGainChange(i, v)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
