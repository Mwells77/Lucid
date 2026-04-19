import { useState } from 'react'
import type { BandConfig } from '../types/audio'
import { BAND_DESCRIPTORS } from '../types/audio'
import './DevPanel.css'

interface BandRowProps {
  name: string
  config: BandConfig
  onChange: (patch: Partial<BandConfig>) => void
}

function BandRow({ name, config, onChange }: BandRowProps) {
  return (
    <div className="band-row">
      <span className="band-row__name">{name}</span>
      <label className="band-row__label">
        <span>delay</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={config.delayTime}
          onChange={e => onChange({ delayTime: parseFloat(e.target.value) })}
        />
        <span className="band-row__value">{config.delayTime.toFixed(2)}s</span>
      </label>
      <label className="band-row__label">
        <span>feedback</span>
        <input
          type="range"
          min={0}
          max={0.9}
          step={0.01}
          value={config.feedback}
          onChange={e => onChange({ feedback: parseFloat(e.target.value) })}
        />
        <span className="band-row__value">{config.feedback.toFixed(2)}</span>
      </label>
    </div>
  )
}

interface DevPanelProps {
  bands: BandConfig[]
  wetDry: number
  onBandChange: (index: number, patch: Partial<BandConfig>) => void
  onWetDryChange: (value: number) => void
}

export function DevPanel({ bands, wetDry, onBandChange, onWetDryChange }: DevPanelProps) {
  const [open, setOpen] = useState(true)

  return (
    <div className="dev-panel">
      <button className="dev-panel__toggle" onClick={() => setOpen(o => !o)}>
        <span className="dev-panel__tag">dev</span>
        <span className="dev-panel__title">band controls</span>
        <span className="dev-panel__chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="dev-panel__body">
          <div className="dev-panel__bands">
            {BAND_DESCRIPTORS.map((desc, i) => (
              <BandRow
                key={desc.name}
                name={desc.name}
                config={bands[i]}
                onChange={patch => onBandChange(i, patch)}
              />
            ))}
          </div>

          <div className="dev-panel__master">
            <label className="band-row__label">
              <span>wet / dry</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={wetDry}
                onChange={e => onWetDryChange(parseFloat(e.target.value))}
              />
              <span className="band-row__value">{Math.round(wetDry * 100)}%</span>
            </label>
          </div>
        </div>
      )}
    </div>
  )
}
