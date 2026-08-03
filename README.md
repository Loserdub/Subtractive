# Subtractive Polyphonic Synthesizer

> A high-end, tactile browser-native polyphonic analog modelling synthesizer & 16-step rhythm sequencer built with React, Web Audio API, and Web MIDI.

Live Demo: [https://loserdub.github.io/Subtractive/](https://loserdub.github.io/Subtractive/)  
Author & Publisher: [Justin Ray — Trust Node Logic](https://trustnodelogic.com/)

---

## Overview

**Subtractive** is a modern, responsive web application inspired by classic analog hardware synths (Sequential, Moog, Teenage Engineering) blended with dark-mode software interfaces. It runs entirely in the browser using high-performance Web Audio API DSP synthesis—no plugins or installation required.

---

## Features

### 🎹 Polyphonic Sound Engine (VCO)
- **4 Polyphonic Oscillators (OSC 1-4):** Independent waveform selection (Sawtooth, Square, Triangle, Sine), gain controls, fine detune (-2400 to +2400 cents), and toggles.
- **Factory Preset Patches:** Built-in presets including *Analog Init*, *Resonant Lead*, *Deep Sub Bass*, *Warm Poly Pad*, and *Filter Sweep Synth*.

### 🎛️ Voltage Controlled Filter (VCF)
- **4 Filter Modes:** Toggle between **Lowpass**, **Highpass**, **Bandpass**, and **Notch** filtering.
- **Logarithmic Cutoff:** Smooth 20Hz – 20,000Hz cutoff control with logarithmic response.
- **Resonance Q:** Adjustable resonance intensity with self-oscillation headroom.
- **Filter Envelope Intensity (EG Int):** Dedicated modulation depth controls.

### 〰️ Modulation & Envelopes (LFO & ADSR)
- **Dual ADSR Envelopes:** Independent Attack, Decay, Sustain, and Release controls for both Amplitude (AMP) and Filter (VCF).
- **LFO Routing:** Low Frequency Oscillator with Sine, Triangle, Sawtooth, and Square waveforms, Rate (0.1Hz – 20Hz), Depth, Delay, Fade, and multi-target routing to **Pitch**, **Filter**, or **Amp (Tremolo)**.

### 🥁 16-Step Rhythm Sequencer
- **4-Track Drum Machine:** Kick, Snare, Hi-Hat, and Crash drum synthesis.
- **4 Pattern Banks:** Store and switch between 4 sequence banks on the fly.
- **Groove Controls:** Master Tempo (60–180 BPM), Swing adjustment (0–100%), and per-track Pitch shifting.

### 📺 Real-Time CRT Oscilloscope & Spectrum Analyzer
- **Dual Visualizer Modes:** Switch between a real-time **Time-Domain Oscilloscope** and **FFT Frequency Spectrum Analyzer** powered by a Web Audio `AnalyserNode`.
- **CRT Phosphor Grid:** Glowing green/cyan CRT grid overlays with animated trace sweeps.

### 🕹️ Tactile Skeuomorphic Controls & Touch Ergonomics
- **Custom Vector Rotary Knobs:** Glowing radial value arcs, pointer capture (`setPointerCapture`) for smooth touch & mouse drag, double-click reset, Shift+drag precision mode, and floating OLED tooltips.
- **Multi-Touch Keybed:** Full multi-touch support via Pointer Events, Pitch Bend wheel (spring-return), Modulation wheel, and Octave transpose buttons (`-2` to `+2`).
- **Mobile Responsive Architecture:** `100dvh` viewport containment with `overflow: hidden` and `touch-action: none` lock to eliminate vertical bounce and scrolling. Mobile top tab bar (`[VCO]`, `[VCF]`, `[ENV/LFO]`, `[SEQ]`, `[KEYS]`) for seamless touch navigation.
- **Web MIDI Ready:** Plug-and-play support for external USB/Bluetooth MIDI keyboards and hardware controllers.

---

## Tech Stack

- **Framework:** React 19 + TypeScript 5
- **Build Tool:** Vite 6
- **Styling:** Tailwind CSS + Custom Skeuomorphic CSS Design System (`index.css`)
- **Audio Core:** Web Audio API (`AudioContext`, `BiquadFilterNode`, `ConstantSourceNode`, `AnalyserNode`)
- **MIDI Integration:** Web MIDI API (`requestMIDIAccess`)
- **SEO & Knowledge Graph:** JSON-LD Schema.org `WebApplication` structured data linked to [Trust Node Logic](https://trustnodelogic.com/)

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
