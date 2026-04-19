import { useState } from 'react'
import type { BandConfig } from '../types/audio'
import { BAND_DESCRIPTORS } from '../types/audio'
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

interface DevPanelProps {
  bands: BandConfig[]
  wetDry: number
  onBandChange: (index: number, patch: Partial<BandConfig>) => void
  onWetDryChange: (value: number) => void
  onReset: () => void
}

export function DevPanel({ bands, wetDry, onBandChange, onWetDryChange, onReset }: DevPanelProps) {
  const [open, setOpen] = useState(true)

  return (
    <div className="dev-panel">
      <div className="dev-panel__header">
        <button className="dev-panel__toggle" onClick={() => setOpen(o => !o)}>
          <span className="dev-panel__tag">dev</span>
          <span className="dev-panel__title">band controls</span>
          <span className="dev-panel__chevron">{open ? '▲' : '▼'}</span>
        </button>
        <button className="dev-panel__reset" onClick={onReset} title="Reset all to defaults">
          reset
        </button>
      </div>

      {open && (
        <div className="dev-panel__body">
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
      )}
    </div>
  )
}
