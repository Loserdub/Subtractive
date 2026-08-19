# Subtractive — Polyphonic Analog Modelling Synthesizer & Rhythm Sequencer

> **A tactile, browser-native polyphonic analog modelling synthesizer, Master FX rack, synth arpeggiator, and 16-step rhythm sequencer.**  
> Built with **React 19**, **TypeScript 5**, **Web Audio API DSP**, **Web MIDI**, and **Web Workers**.

**Live Application:** [https://loserdub.github.io/Subtractive/](https://loserdub.github.io/Subtractive/)  
**Publisher & Research Hub:** [Trust Node Logic](https://trustnodelogic.com/)  
**Author & Creative Technologist:** [Justin Ray (JRAY / loserdub / VISION)](https://trustnodelogic.com/#person)  
**Parent Knowledge Graph Source:** [VISIONMAIN / Projects & Lab](https://trustnodelogic.com/projects.html)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Quick Start Guide](#quick-start-guide)
3. [Interface Ergonomics & Navigation](#interface-ergonomics--navigation)
4. [User Instruction Manual](#user-instruction-manual)
   - [4.1 Voltage Controlled Oscillator (VCO) & Voice Engine](#41-voltage-controlled-oscillator-vco--voice-engine)
   - [4.2 Voltage Controlled Filter (VCF)](#42-voltage-controlled-filter-vcf)
   - [4.3 Dual ADSR Envelopes & LFO Modulation](#43-dual-adsr-envelopes--lfo-modulation)
   - [4.4 Master FX Studio Rack (Drive, Delay, Reverb)](#44-master-fx-studio-rack-drive-delay-reverb)
   - [4.5 Polyphonic Arpeggiator](#45-polyphonic-arpeggiator)
   - [4.6 16-Step Rhythm Sequencer & Web Worker Clock](#46-16-step-rhythm-sequencer--web-worker-clock)
   - [4.7 Zero-Crossing CRT Oscilloscope & Stereo Peak VU Meter](#47-zero-crossing-crt-oscilloscope--stereo-peak-vu-meter)
   - [4.8 Virtual Keybed & Web MIDI Hardware Integration](#48-virtual-keybed--web-midi-hardware-integration)
   - [4.9 Factory Preset Library](#49-factory-preset-library)
5. [Technical Architecture](#technical-architecture)
6. [Knowledge Graph & Linked Data (JSON-LD)](#knowledge-graph--linked-data-json-ld)
7. [Installation & Local Development](#installation--local-development)
8. [License & Credits](#license--credits)

---

## 1. System Overview

**Subtractive** is an analog modeling synthesizer designed to bridge the tactile feel of classic hardware synthesizers (Sequential Circuits, Moog, Oberheim, Teenage Engineering) with browser-native real-time Digital Signal Processing (DSP).

Running directly inside modern web browsers via the **Web Audio API**, Subtractive requires **zero plugins, zero external drivers, and zero installations**. It features an independent **Web Worker timer thread** ensuring rock-solid sequencing clock stability even when browser tabs are minimized or running in the background.

---

## 2. Quick Start Guide

1. **Initialize Audio Engine:**  
   Click the glowing cyan **"INITIALIZE SYNTHESIZER ENGINE"** button on the start screen. Browsers require explicit user gesture interaction to instantiate an `AudioContext`.
2. **Select a Preset:**  
   In the top OLED header display, click the **Patch** dropdown to load factory patches (*Analog Init*, *Resonant Lead*, *Deep Sub Bass*, *Warm Poly Pad*, or *Filter Sweep Synth*).
3. **Play Immediately:**  
   - **Mouse / Touch:** Click or drag across the bottom virtual piano keybed.
   - **QWERTY Keyboard:** Play notes directly with your computer keyboard (`Z`–`M` for lower octave, `Q`–`I` for upper octave).
   - **USB/Bluetooth MIDI Keyboard:** Plug in any MIDI controller. Subtractive automatically detects connected devices and routes note velocity, pitch bend, and CC messages.
4. **Start the Drum Sequencer:**  
   In the lower-right rhythm section, press **PLAY** to start the 16-step beat generator. Click any step button to toggle step states.

---

## 3. Interface Ergonomics & Navigation

Subtractive is styled with a skeuomorphic brushed dark anodized chassis, recessed screws, beveled control modules, and glowing high-contrast OLED readouts.

### Tactile Rotary Knobs
- **Continuous Drag:** Click and drag vertically (up to increase, down to decrease). Pointer events are captured (`setPointerCapture`) so fast cursor movements never lose grip.
- **Precision Mode (Shift + Drag):** Hold `Shift` while dragging to engage slow, fine-increment tuning.
- **Default Reset:** Double-click any knob to instantly restore its default factory value.
- **OLED Value Tooltip:** Hovering or turning a knob reveals a floating digital readout displaying exact parameters (Hz, ms/s, %, cents, st).

### Modular Section View
- **Desktop (Laptop & Monitor):** All modules (VCO, VCF, ENV, FX, ARP, SEQ, and Keybed) are arranged in an expansive two-tier modular console grid.
- **Mobile & Tablet:** A dedicated 44px finger-safe tab bar (`[VCO]`, `[VCF]`, `[ENV]`, `[FX]`, `[ARP]`, `[SEQ]`, `[KEYS]`) isolates each module into an independent, full-height scrolling panel with zero cross-section bleed.

---

## 4. User Instruction Manual

### 4.1 Voltage Controlled Oscillator (VCO) & Voice Engine

The primary sound generation bay combines **4 independent multi-waveform oscillators**, a sub-oscillator, and a dedicated white noise generator.

```
                  ┌───────────────┐
   MIDI Note ───► │ Voice Manager │ (Up to 16 Polyphonic Voices)
                  └───────┬───────┘
                          │
       ┌──────────┬───────┴───┬──────────┬──────────┐
       ▼          ▼           ▼          ▼          ▼
    [OSC 1]    [OSC 2]     [OSC 3]    [OSC 4]   [SUB OSC]  [NOISE]
  (Saw/Sq/Tri) (Detune)    (Detune)   (Detune)  (-1 Oct)  (White)
       │          │           │          │          │        │
       └──────────┴─────┬─────┴──────────┴──────────┴────────┘
                        ▼
             Mix Bus ──► To VCF Filter
```

- **Voice Modes:**
  - `POLY` (Polyphonic): 16-voice polyphonic engine with dynamic oldest-voice stealing. Ideal for pads and chords.
  - `MONO` (Monophonic): 1 active voice at a time. Ideal for basslines, arpeggios, and aggressive leads.
  - `LEGATO`: Monophonic mode where overlapping notes do not re-trigger envelopes, creating smooth legato runs.
- **Glide (Portamento):** Slew rate from `0.0s` to `0.5s` governing the transition time between consecutive pitch changes.
- **4 Oscillator Channels (`OSC 1` – `OSC 4`):**
  - **Power Switch:** Toggle each oscillator on or off.
  - **Waveform Selector:** Choose between **Sawtooth** (rich harmonics), **Square** (hollow, reedy pulse), **Triangle** (flute-like, gentle), or **Sine** (pure fundamental).
  - **Gain Knob:** Adjust relative volume balance (0% – 100%).
  - **Detune Knob:** Pitch offset ranging from `-2400` to `+2400` cents (±2 octaves) for lush supersaw chorusing and thick analog detuning.
  - **LCD Mini Waveform Preview:** Visual indicator of active waveform and output level.
- **Pulse Width Modulation (PWM):** Adjust the duty cycle of Square waveforms from `10%` to `90%`.
- **Sub-Oscillator (`Sub Osc`):** Adds a pure sine tone 1 octave below the played note for earth-shaking low-end foundation.
- **Noise Generator (`Noise`):** Injects white noise for percussive attacks, wind effects, breathiness, and analog realism.

---

### 4.2 Voltage Controlled Filter (VCF)

The VCF sculpts the harmonic frequency spectrum using high-precision Web Audio biquad filter topologies.

- **Filter Topologies:**
  - `LOWPASS` (12dB/octave): Passes frequencies below the cutoff while rolling off highs (classic analog synth filter).
  - `HIGHPASS`: Passes frequencies above the cutoff, stripping low rumble.
  - `BANDPASS`: Isolates a narrow frequency band, creating telephone or resonant vowel sweeps.
  - `NOTCH`: Rejects a narrow band, useful for phaser-like notch sculpting.
- **Cutoff Knob (20Hz – 20,000Hz):** Continuous logarithmic frequency sweep governing the filter edge.
- **Resonance Knob (0 – 40 Q):** Boosts frequencies around the cutoff point into screaming self-oscillation.
- **Envelope Intensity (`EG Int` 0 – 10,000):** Depth of filter modulation driven by the dedicated Filter ADSR envelope.

---

### 4.3 Dual ADSR Envelopes & LFO Modulation

#### Amplitude Envelope (AMP ADSR)
Controls voice volume evolution over time:
- **Attack (`0.001s` – `2.0s`):** Rise time from silence to peak amplitude upon key press.
- **Decay (`0.001s` – `2.0s`):** Fall time from peak amplitude to sustained level.
- **Sustain (`0%` – `100%`):** Constant volume level maintained while holding the key.
- **Release (`0.001s` – `5.0s`):** Fade-out duration after the key is released.

#### Filter Envelope (FILTER ADSR)
Controls dynamic cutoff modulation per note trigger:
- **Attack (`0.001s` – `1.0s`):** Sweep speed from baseline cutoff to envelope peak.
- **Decay (`0.001s` – `1.0s`):** Sweep speed from peak to sustained cutoff offset.
- **Sustain (`0%` – `100%`):** Sustained cutoff offset level while holding the note.
- **Release (`0.001s` – `10.0s`):** Sweep return time to baseline cutoff upon release.

#### Low Frequency Oscillator (LFO)
- **Waveforms:** Sine, Triangle, Sawtooth, Square.
- **Rate Mode:**
  - **Free Rate (`0.1Hz` – `20.0Hz`):** Continuous un-synced modulation speed.
  - **BPM Sync (`1/16`, `1/8`, `1/4`, `1/2`, `1/1`):** Master tempo division lock.
- **Depth (`0%` – `100%`):** Overall modulation amplitude.
- **Target Destinations:**
  - `PITCH`: Creates vibrato and pitch sirens.
  - `FILTER`: Generates rhythmic auto-wah and filter wobbles.
  - `AMP`: Creates rhythmic tremolo and gating.
  - `PWM`: Modulates pulse width duty cycle on square wave oscillators.

---

### 4.4 Master FX Studio Rack (Drive, Delay, Reverb)

```
  Synth + Drums ──► [ Drive / Tape ] ──► [ Stereo Delay ] ──► [ Reverb ] ──► Master Out
```

#### 1. Drive / Tape Saturation
- **Algorithm:** Custom `WaveShaperNode` non-linear soft-clipping sigmoid transfer curve.
- **Controls:** Power toggle, **Amount** (`0%` – `100%`). Adds harmonic overtone warmth, tape crunch, and aggressive distortion.

#### 2. Stereo Delay
- **Algorithm:** Dual-channel delay line with cross-channel feedback matrix.
- **Controls:**
  - **Time / Division:** Free delay time (`50ms` – `1000ms`) or tempo-synced divisions.
  - **Feedback:** Echo repeat decay intensity (`0%` – `85%`).
  - **Mix:** Wet/Dry balance (`0%` – `100%`).
  - **SYNC Toggle:** Locks delay intervals to master sequencer BPM.
  - **PING-PONG Toggle:** Bounces delay reflections alternately across Left and Right stereo channels.

#### 3. Algorithmic Reverb
- **Algorithm:** Procedural exponentially-decaying stereo impulse response synthesized in memory and routed through a `ConvolverNode`.
- **Controls:** Power toggle, **Decay** (`0.2s` – `6.0s`), **Mix** (`0%` – `100%`).

---

### 4.5 Polyphonic Arpeggiator

Transforms held keyboard chords into cyclical, rhythmic melodic sequences.

- **Status (`ARP ON` / `ARP OFF`):** Engages or disengages arpeggiator engine.
- **Pattern Modes:**
  - `UP`: Ascending note sequence from lowest to highest pitch.
  - `DOWN`: Descending note sequence from highest to lowest pitch.
  - `U&D` (Up & Down): Rebounding bi-directional pattern.
  - `RANDOM`: Stochastically selected notes from the held chord.
- **Octaves (`1`, `2`, `3`):** Transposition range across 1, 2, or 3 octaves.
- **Rate (`1/16`, `1/8`, `1/4`):** Note subdivision duration locked to Master BPM.
- **Gate (`10%` – `100%`):** Note duration length (staccato vs. sustained legato).

---

### 4.6 16-Step Rhythm Sequencer & Web Worker Clock

The rhythm sequencer powers 4 independent analog drum instruments with precision clocking:

- **Web Worker Precision Clock (`SequencerWorker.ts`):** Runs on a dedicated Web Worker background thread, providing jitter-free sub-millisecond scheduling regardless of UI redraws or tab switching.
- **3-State Velocity LED Step Buttons:**
  - **State 0 (Off):** Silent step.
  - **State 1 (Normal):** 70% velocity trigger.
  - **State 2 (Accent - White Glow):** 100% velocity trigger with boosted punch.
- **4 Drum Tracks:**
  - **Kick (`cyan`):** Synthesized pitch-swept sine sub-drop.
  - **Snare (`red`):** Noise burst layered over snappy body oscillator.
  - **Hi-Hat (`emerald`):** Metallic bandpassed noise sizzle.
  - **Crash (`amber`):** Long exponential cymbal decay.
- **Per-Track Sound Sculpting:**
  - **Vol:** Volume output level.
  - **Pan:** Stereo spatial placement (`-1.0` Left to `+1.0` Right).
  - **Decay:** Envelope length multiplier (`0.2s` – `3.0s`).
  - **Pitch:** Semitone pitch offset (`-12` to `+12` semitones).
- **Pattern Banks (`Bank 1` – `4`):** Store and recall 4 distinct 16-step patterns.
- **Tempo & Groove:**
  - **Tempo:** Master tempo clock (`60` – `180` BPM).
  - **Swing:** Micro-timing groove offset (`0%` straight to `100%` heavy swing).

---

### 4.7 Zero-Crossing CRT Oscilloscope & Stereo Peak VU Meter

- **Zero-Crossing Trigger Phase Lock:** Real-time time-domain oscilloscope stabilized with a hardware-grade zero-crossing detection algorithm that eliminates visual drift.
- **FFT Spectrum Analyzer:** Toggle `FFT` to inspect frequency distribution across the audible spectrum.
- **Stereo Peak VU Meters:** Dual Left and Right 10-segment LED ladder with 400ms peak-hold bars and green/amber/red headroom indication.

---

### 4.8 Virtual Keybed & Web MIDI Hardware Integration

- **Multi-Touch Piano Keybed:** Touch-optimized 25-key keyboard with visual keypress lighting.
- **Pitch Bend & Modulation Wheels:**
  - **Pitch Bend Wheel:** Spring-loaded pitch modulation with automatic return-to-center.
  - **Modulation Wheel:** Retained modulation controller linked to LFO depth.
- **Octave Transposition:** Shift keyboard range across `-2`, `-1`, `0`, `+1`, `+2` octaves.
- **Computer Keyboard Shortcuts (QWERTY):**
  - **Lower Octave:** `Z` (C), `S` (C#), `X` (D), `D` (D#), `C` (E), `V` (F), `G` (F#), `B` (G), `H` (G#), `N` (A), `J` (A#), `M` (B)
  - **Upper Octave:** `Q` (C), `2` (C#), `W` (D), `3` (D#), `E` (E), `R` (F), `5` (F#), `T` (G), `6` (G#), `Y` (A), `7` (A#), `U` (B), `I` (C)
- **Web MIDI Controller Support:**
  - Automatic detection of USB and Bluetooth MIDI keyboards.
  - Full support for Note On/Off with velocity.
  - **CC 74:** Filter Cutoff frequency.
  - **CC 1:** Mod Wheel LFO Depth.

---

### 4.9 Factory Preset Library

| Preset Name | Description | Voice Mode | Key Characteristic |
| :--- | :--- | :--- | :--- |
| **Analog Init** | Classic dual saw/square initial patch | `POLY` | Bright fundamental with warm lowpass cutoff |
| **Resonant Lead** | Searing synth lead with portamento glide | `LEGATO` | High resonance peak with fast filter envelope |
| **Deep Sub Bass** | Heavy bottom-end sub bass | `MONO` | Sub-oscillator coupled with short punchy decay |
| **Warm Poly Pad** | Ambient cinematic pad | `POLY` | Slow attack, lush detune, delay & long reverb |
| **Filter Sweep Synth** | Dramatic modulation sequence patch | `POLY` | Tempo-synced LFO filter sweep with tape drive |

---

## 5. Technical Architecture

```
Subtractive/
├── components/
│   ├── ArpeggiatorPanel.tsx    # Polyphonic arpeggiator controls & pattern generator
│   ├── DrumMachine.tsx         # 16-step rhythm sequencer & track sound controls
│   ├── Icon.tsx                # Vector waveform & hardware icons
│   ├── Keyboard.tsx            # Multi-touch virtual piano keybed & wheel controllers
│   ├── Knob.tsx                # Skeuomorphic rotary dial with pointer capture & OLED readout
│   ├── MasterFXPanel.tsx       # Studio rack (Drive, Stereo Delay, Reverb)
│   ├── Switch.tsx              # Skeuomorphic LED buttons & toggle switches
│   ├── Synth.tsx               # Main synthesizer console & mobile tab controller
│   ├── ViewportController.tsx  # Desktop zoom/pan viewport navigation
│   ├── VUMeter.tsx             # Dual-channel 10-segment LED peak meter with peak hold
│   └── WaveformDisplay.tsx     # Zero-crossing CRT oscilloscope & FFT analyzer
├── services/
│   ├── AudioEngine.ts          # Core Web Audio polyphonic synthesizer DSP engine
│   ├── DrumMachineEngine.ts    # Drum synthesizer voice models & mixer graph
│   └── SequencerWorker.ts      # Web Worker background timer clock
├── constants.ts                # Audio defaults, preset definitions & MIDI mappings
├── types.ts                    # TypeScript interfaces and domain types
├── index.css                   # Skeuomorphic panel design system, OLED screens, & glows
├── index.html                  # HTML5 shell with linked JSON-LD Schema graph
└── vite.config.ts              # Vite 6 configuration
```

---

## 6. Knowledge Graph & Linked Data (JSON-LD)

Subtractive is formally integrated into the **Trust Node Logic** / **VISIONMAIN** canonical knowledge graph. Its schema is indexed under the global graph of [Justin Ray (JRAY)](https://trustnodelogic.com/#person) and [Trust Node Logic](https://trustnodelogic.com/#organization).

### Schema Graph Definition
```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": "https://loserdub.github.io/Subtractive/#webapp",
      "name": "Subtractive Synthesizer",
      "alternateName": "Subtractive Polyphonic Analog Modelling Synthesizer & Rhythm Sequencer",
      "url": "https://loserdub.github.io/Subtractive/",
      "applicationCategory": "MultimediaApplication",
      "operatingSystem": "Any (Cross-Platform Browser)",
      "browserRequirements": "Requires Web Audio API & Web MIDI support",
      "description": "Free browser-native polyphonic subtractive synthesizer and 16-step rhythm sequencer featuring real-time Web Audio API DSP synthesis, Master FX Rack, Synth Arpeggiator, Zero-Crossing Trigger Oscilloscope, and Web MIDI support.",
      "isPartOf": {
        "@id": "https://trustnodelogic.com/projects.html#webpage"
      },
      "creator": {
        "@id": "https://trustnodelogic.com/#person"
      },
      "publisher": {
        "@id": "https://trustnodelogic.com/#organization"
      }
    },
    {
      "@type": "Person",
      "@id": "https://trustnodelogic.com/#person",
      "name": "Justin Ray",
      "alternateName": ["JRAY", "loserdub", "VISION"],
      "url": "https://trustnodelogic.com",
      "sameAs": [
        "https://musicbrainz.org/artist/882fdb9b-8655-45dd-8e24-a59cd750d053",
        "https://soundcloud.com/visiontracks",
        "https://soundcloud.com/loserdub",
        "https://www.youtube.com/@loserdub",
        "https://www.linkedin.com/in/jray-me/",
        "https://x.com/TheInnerVision",
        "https://open.spotify.com/artist/3VZelnnW9OR0DyR2qRn4Oq",
        "https://github.com/loserdub"
      ]
    },
    {
      "@type": "Organization",
      "@id": "https://trustnodelogic.com/#organization",
      "name": "Trust Node Logic",
      "url": "https://trustnodelogic.com"
    }
  ]
}
```

---

## 7. Installation & Local Development

### Prerequisites
- **Node.js** (v18.0.0 or higher)
- **npm**, **pnpm**, or **yarn**

### Local Setup Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/loserdub/Subtractive.git
   cd Subtractive
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start local development server:**
   ```bash
   npm run dev
   ```
   Open your browser to `http://localhost:5173/` (or the port specified in terminal).

4. **Typecheck & Validate Code:**
   ```bash
   npx tsc --noEmit
   ```

5. **Build production bundle:**
   ```bash
   npm run build
   ```
   The compiled assets will be output to the `dist/` directory ready for static hosting.

---

## 8. License & Credits

- **Concept, Audio DSP Engineering & Design:** **Justin Ray** ([Trust Node Logic](https://trustnodelogic.com/))
- **Primary Aliases:** JRAY, loserdub, VISION
- **License:** [MIT License](LICENSE) — free for personal and commercial use.
