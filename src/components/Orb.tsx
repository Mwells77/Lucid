import './Orb.css'

interface OrbProps {
  active: boolean
  onClick: () => void
}

export function Orb({ active, onClick }: OrbProps) {
  return (
    <button
      className={`orb ${active ? 'orb--active' : 'orb--inactive'}`}
      onClick={onClick}
      aria-label={active ? 'Stop audio processing' : 'Start audio processing'}
    >
      <span className="orb__ring orb__ring--1" />
      <span className="orb__ring orb__ring--2" />
      <span className="orb__core" />
    </button>
  )
}
