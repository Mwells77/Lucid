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
  audio/engine.ts       — AudioEngine class + getAudioInputDevices() helper
  components/Orb.tsx    — animated on/off toggle button
  components/DevPanel.tsx — scrollable feature list; mic selector, Multiband Delay, Harmonic Resonator sections
  types/audio.ts        — BandConfig, EngineConfig, ResonatorConfig, Chord, GHIBLI_CHORDS, defaults
  App.tsx               — holds engineRef, device list state, wires state to engine
```

### Signal chain

```
mic → MediaStreamSource
        ├─ dry path ──────────────────────────────────────────→ dryGain ───────┐
        ├─ 5 band processors:                                                   │
        │    [HP + LP filters] → delay ←─ feedback                             │
        │                      └→ outputGain → mbdWetGain ────────────────────┤
        └─ harmonic resonator:                                                  │
             5 bandpass filters (high Q, tuned to chord tones) in parallel     │
             → resonatorSum → resonatorWetGain ────────────────────────────────┤
                                                                                ↓
                                                                          masterGain → destination
```

- Graph is built **once** on `start(deviceId?)`, modified in-place via `AudioParam.setTargetAtTime()` — never rebuilt
- `AudioEngine` lives outside React, held in a `useRef` — no useEffect audio logic leaks
- `updateBand(index, patch)` and `updateWetDry(value)` apply changes live to the running graph
- `getUserMedia` constraints always disable `echoCancellation`, `noiseSuppression`, `autoGainControl`
- `getAudioInputDevices()` fires a permission-prompt stream on mount so `enumerateDevices()` returns labels; App auto-selects the first device matching `/built-in|default/i`
- Multiband delay and harmonic resonator are fully independent — each has its own wet gain node; disabling one does not affect the other

### Key defaults (src/types/audio.ts)

**Multiband delay:** 5 bands: sub-bass (0–80Hz), bass (80–300Hz), low-mid (300–1kHz), high-mid (1–6kHz), air (6–20kHz). Staggered delay times (0.5s → 0.12s) and feedback (0.5 → 0.3). Wet/dry default: 60% wet.

**Harmonic resonator:** 4 selectable Ghibli-flavoured chords (Fmaj9, Am9, Dm11, Cmaj9#11). Default chord: Fmaj9. Q default: 80 (high resonance/ringing). Per-band gain default: 30 (compensates for bandpass attenuation). Wet/dry default: 50%. Disabled by default — opt-in only. Chord changes glide via τ=0.25s.

## Current state

- [x] Core audio engine with multiband delay processor
- [x] Mic input via getUserMedia, full signal graph
- [x] Orb UI toggle with CSS pulse animation
- [x] Dev panel: permanently visible scrollable feature list (max-height, overflow-y: auto)
- [x] Multiband Delay section — checkbox bypasses effect (wet → 0) and restores on re-enable; sliders dim when disabled
- [x] Reset button restores defaults live without restarting the graph
- [x] Mic device selector — permission prompt on load, auto-selects built-in mic, restart-on-change
- [x] Harmonic Resonator — 5 high-Q bandpass filters tuned to a selectable Ghibli chord; independent bypass, wet/dry, Q, and per-tone gain sliders; chord glides smoothly on change
- [x] Deployed and working on GitHub Pages

## Workflow

After implementing any change, commit it and push to GitHub immediately.

## Planned / ideas

- Visualiser driven by AnalyserNode (FFT or waveform) behind/around the orb
- Harmonic quantisation — pitch-shift each band to nearest musical interval (distinct from the resonator)
- Reverb tail (ConvolverNode) after the wet mix
- Preset system (save/load band configs)
- Remove or hide dev panel for production polish
