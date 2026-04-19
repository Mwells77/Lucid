# Lucid

A headphones-first mindfulness app that captures microphone input and transforms everyday environmental sound into something musical and harmonically coherent using the Web Audio API — no audio libraries, browser-native only.

Deployed to GitHub Pages: https://mwells77.github.io/Lucid/

## Project goal

Take raw ambient sound from the microphone and run it through a multiband delay processor that splits the signal into 5 frequency bands, applies independent delay and feedback per band, then recombines them. The result turns environmental noise into a diffuse, harmonic texture. The UI is minimal and meditative — a single pulsing orb to toggle processing on/off.

## Stack

- React 18 + TypeScript (strict mode) + Vite
- Web Audio API only — zero audio libraries
- GitHub Pages via Actions CI (`npm run build` → `dist/`)

## Architecture

```
src/
  audio/engine.ts       — AudioEngine class: full signal graph lifecycle
  components/Orb.tsx    — animated on/off toggle button
  components/DevPanel.tsx — collapsible 5-band + wet/dry controls
  types/audio.ts        — BandConfig, EngineConfig, BAND_DESCRIPTORS, defaults
  App.tsx               — holds engineRef, wires state to engine
```

### Signal chain

```
mic → MediaStreamSource
        ├─ dry path → dryGain ──────────────────────┐
        └─ 5 band processors:                       │
             [HP + LP filters] → delay ←─ feedback  │
                               └→ outputGain → wetGain → masterGain → destination
```

- Graph is built **once** on `start()`, modified in-place via `AudioParam.setTargetAtTime()` — never rebuilt
- `AudioEngine` lives outside React, held in a `useRef` — no useEffect audio logic leaks
- `updateBand(index, patch)` and `updateWetDry(value)` apply changes live to the running graph

### Key defaults (src/types/audio.ts)

5 bands: sub-bass (0–80Hz), bass (80–300Hz), low-mid (300–1kHz), high-mid (1–6kHz), air (6–20kHz).
Each band has staggered delay times (0.5s → 0.12s) and feedback (0.5 → 0.3). Wet/dry default: 60% wet.

## Current state

- [x] Core audio engine with multiband delay processor
- [x] Mic input via getUserMedia, full signal graph
- [x] Orb UI toggle with CSS pulse animation
- [x] Dev panel: 5-band sliders (delay + feedback) + master wet/dry
- [x] Reset button restores defaults live without restarting the graph
- [x] Deployed and working on GitHub Pages

## Planned / ideas

- Visualiser driven by AnalyserNode (FFT or waveform) behind/around the orb
- Harmonic quantisation — pitch-shift each band to nearest musical interval
- Reverb tail (ConvolverNode) after the wet mix
- Preset system (save/load band configs)
- Remove or hide dev panel for production polish
