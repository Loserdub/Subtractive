# Subtractive Polyphonic Analog Modelling Synthesizer & Rhythm Sequencer

> A high-end, tactile browser-native polyphonic analog modelling synthesizer, Master FX Rack, Synth Arpeggiator & 16-step rhythm sequencer built with React 19, TypeScript 5, Web Audio API DSP, and Web MIDI.

Live Demo: [https://loserdub.github.io/Subtractive/](https://loserdub.github.io/Subtractive/)  
Author & Publisher: [Justin Ray — Trust Node Logic](https://trustnodelogic.com/)

---

## Overview

**Subtractive** is a modern, responsive web application inspired by classic analog hardware synths (Sequential, Moog, Teenage Engineering) blended with sleek dark-mode software interfaces. It runs entirely in the browser using high-performance Web Audio API DSP synthesis—no plugins or external installations required.

---

## Features

### 🎹 Polyphonic & Monophonic Sound Engine (VCO)
- **16-Voice Polyphony with Oldest-Voice Stealing:** Robust voice allocation manager capping polyphony at 16 active voices to ensure crackle-free audio performance.
- **Voice Modes (`POLY`, `MONO`, `LEGATO`):** Switch between full polyphonic chords, monophonic lead mode, and legato mode with smooth **Glide (Portamento)** frequency slewing (0ms – 500ms).
- **4 Oscillators (OSC 1–4):** Independent waveform selection (Sawtooth, Square, Triangle, Sine), gain controls, fine detune (-2400 to +2400 cents), and toggles.
- **Pulse Width Modulation (PWM):** Adjustable pulse width (10% to 90%) and dedicated LFO PWM target modulation.
- **Sub-Oscillator & Noise Generator:** Dedicated -1 octave sub-oscillator and white noise generator with individual level control.
- **Factory Preset Patches:** Built-in presets including *Analog Init*, *Resonant Lead*, *Deep Sub Bass*, *Warm Poly Pad*, and *Filter Sweep Synth*.

### 🎛️ Voltage Controlled Filter (VCF)
- **4 Filter Modes:** Toggle between **Lowpass**, **Highpass**, **Bandpass**, and **Notch** filtering.
- **Logarithmic Cutoff:** Smooth 20Hz – 20,000Hz cutoff control with logarithmic scaling.
- **Resonance Q:** Adjustable resonance intensity with self-oscillation headroom.
- **Filter Envelope Intensity (EG Int):** Dedicated modulation depth control.

### 〰️ Modulation & Envelopes (LFO & ADSR)
- **Dual ADSR Envelopes:** Independent Attack, Decay, Sustain, and Release controls for both Amplitude (AMP) and Filter (VCF).
- **LFO Routing & BPM Sync:** Low Frequency Oscillator with Sine, Triangle, Sawtooth, and Square waveforms, Rate (0.1Hz – 20Hz or BPM Synced `1/16`, `1/8`, `1/4`, `1/2`, `1/1`), Depth, Delay, Fade, and multi-target routing to **Pitch**, **Filter**, **Amp (Tremolo)**, or **PWM**.

### 🎚️ Master FX Rack
- **Drive / Tape Saturation:** Custom `WaveShaperNode` soft-clipping tube/tape distortion drive with Amount control.
- **Stereo Ping-Pong Delay:** Dual delay channels with feedback, wet/dry mix, BPM tempo sync, and Ping-Pong stereo panning toggle.
- **Reverb:** Algorithmic decay impulse generator routed through a `ConvolverNode` with Decay Time and Wet/Dry Mix controls.

### 🪄 Polyphonic Synth Arpeggiator
- **Pattern Modes:** `UP`, `DOWN`, `U&D` (Up/Down), and `RANDOM` arpeggio modes.
- **Octave Range:** Multi-octave transposition across 1 to 3 octaves.
- **Tempo Sync & Gate:** Rate division (`1/16`, `1/8`, `1/4`) linked to master BPM, and Gate length control.

### 🥁 16-Step Rhythm Sequencer & Web Worker Clock
- **Web Worker Precision Clock:** Dedicated Web Worker timer thread (`SequencerWorker.ts`) providing jitter-free clock timing even when browser tabs lose focus.
- **3-State Velocity Accents:** Step grid supports 3 states: `0` (Off), `1` (Normal - 70% volume), `2` (Accent - 100% volume + extra punch).
- **Per-Track Drum Mixer:** Volume, Stereo Panning (`StereoPannerNode`), Decay multiplier, and Pitch controls for each drum track (`kick`, `snare`, `hihat`, `crash`).
- **4 Pattern Banks:** Store and switch between 4 sequence banks on the fly.
- **Groove Controls:** Master Tempo (60–180 BPM) and Swing adjustment (0–100%).

### 📺 Real-Time Zero-Crossing Oscilloscope & Stereo Peak VU Meter
- **Zero-Crossing Trigger Stabilization:** Hardware-grade phase-locking algorithm in `WaveformDisplay.tsx` that locks oscilloscope traces horizontally without drift.
- **Stereo LED Segment Peak VU Metering:** Dual-channel Left & Right 10-segment LED peak meters with 400ms Peak Hold indicators.
- **FFT Spectrum Analyzer:** Toggle between time-domain oscilloscope and frequency spectrum analyzer.

### 🕹️ Tactile Skeuomorphic Controls & Touch Ergonomics
- **Custom Vector Rotary Knobs:** Glowing radial value arcs, pointer capture (`setPointerCapture`) for smooth touch & mouse drag, double-click reset, Shift+drag precision mode, and floating OLED tooltips.
- **Multi-Touch Keybed:** Full multi-touch support via Pointer Events, Pitch Bend wheel (spring-return), Modulation wheel, and Octave transpose buttons (`-2` to `+2`).
- **Mobile Responsive Architecture:** Mobile top tab bar (`[VCO]`, `[VCF]`, `[ENV/LFO]`, `[FX/ARP]`, `[SEQ]`, `[KEYS]`) for seamless touch navigation.
- **Web MIDI Ready:** Plug-and-play support for external USB/Bluetooth MIDI keyboards and hardware controllers.

---

## Tech Stack

- **Framework:** React 19 + TypeScript 5
- **Build Tool:** Vite 6
- **Styling:** Tailwind CSS + Custom Skeuomorphic CSS Design System (`index.css`)
- **Audio Core:** Web Audio API (`AudioContext`, `BiquadFilterNode`, `ConstantSourceNode`, `WaveShaperNode`, `ConvolverNode`, `DelayNode`, `ChannelSplitterNode`, `AnalyserNode`)
- **Worker Clock:** Web Worker (`SequencerWorker.ts`)
- **MIDI Integration:** Web MIDI API (`requestMIDIAccess`)
- **SEO & Knowledge Graph:** JSON-LD Schema.org `WebApplication` structured data & AggregateRating rich snippets linked to [Trust Node Logic](https://trustnodelogic.com/)

---

## Run Locally

### Prerequisites
- Node.js (v18 or higher)
- npm or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/loserdub/Subtractive.git
   cd Subtractive
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start local development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

---

## License & Credits

Designed and developed by **Justin Ray** ([Trust Node Logic](https://trustnodelogic.com/)).  
Released under the MIT License.
