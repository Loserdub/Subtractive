# Subtractive — Polyphonic Analog Modelling Synthesizer & Rhythm Sequencer

> **A tactile, browser-native polyphonic analog modelling synthesizer, Master FX studio rack, polyphonic arpeggiator, 16-step rhythm sequencer, and live performance expression deck.**  
> Built with **React 19**, **TypeScript 5**, **Web Audio API DSP**, **Web MIDI**, and **Web Workers**.

**Live Application:** [https://loserdub.github.io/Subtractive/](https://loserdub.github.io/Subtractive/)  
**Publisher & Research Hub:** [Trust Node Logic](https://trustnodelogic.com/) (`https://trustnodelogic.com`)  
**Author & Creative Technologist:** [Justin Ray](https://trustnodelogic.com/#person) (JRAY / loserdub / VISION)  
**Parent Knowledge Graph Source:** [VISIONMAIN / Projects & Lab](https://trustnodelogic.com/projects.html)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Quick Start Guide](#2-quick-start-guide)
3. [Interface Ergonomics & Tri-Modal Focus Workspaces](#3-interface-ergonomics--tri-modal-focus-workspaces)
   - [3.1 [SYNTH] Sound Design Lab (Key: 1)](#31-synth-sound-design-lab-key-1)
   - [3.2 [GROOVE] 4-Track Rhythm Matrix (Key: 2)](#32-groove-4-track-rhythm-matrix-key-2)
   - [3.3 [PERFORM] Live Jam & Expression Deck (Key: 3)](#33-perform-live-jam--expression-deck-key-3)
   - [3.4 Tactile Control Ergonomics & Rotary Knobs](#34-tactile-control-ergonomics--rotary-knobs)
   - [3.5 Hardware Aesthetics & 4 Modular Colorways](#35-hardware-aesthetics--4-modular-colorways)
4. [Comprehensive Controls & Parameter Reference Manual](#4-comprehensive-controls--parameter-reference-manual)
   - [4.1 Voltage Controlled Oscillators (VCO 1–4, Sub, Noise)](#41-voltage-controlled-oscillators-vco-14-sub-noise)
   - [4.2 Voltage Controlled Filter (VCF) & Interactive Response Curve](#42-voltage-controlled-filter-vcf--interactive-response-curve)
   - [4.3 Dual ADSR Envelopes & Interactive Canvas Editor](#43-dual-adsr-envelopes--interactive-canvas-editor)
   - [4.4 Dual LFOs & Flexible Modulation Matrix](#44-dual-lfos--flexible-modulation-matrix)
   - [4.5 Master FX Studio Rack (Drive, Delay, Reverb, Dynamics)](#45-master-fx-studio-rack-drive-delay-reverb-dynamics)
   - [4.6 Polyphonic Arpeggiator](#46-polyphonic-arpeggiator)
   - [4.7 16-Step Rhythm Sequencer & Web Worker Clock](#47-16-step-rhythm-sequencer--web-worker-clock)
   - [4.8 Live Performance Tools, XY Vector Touchpad & Drops](#48-live-performance-tools-xy-vector-touchpad--drops)
   - [4.9 CRT Oscilloscope, Spectrum Analyzer & Lissajous Vector Scope](#49-crt-oscilloscope-spectrum-analyzer--lissajous-vector-scope)
   - [4.10 Virtual Keybed, QWERTY Shortcuts & Web MIDI Integration](#410-virtual-keybed-qwerty-shortcuts--web-midi-integration)
   - [4.11 Preset Vault & Soundbank Manager (108+ Patches)](#411-preset-vault--soundbank-manager-108-patches)
   - [4.12 Lossless Master Audio Recorder (WAV)](#412-lossless-master-audio-recorder-wav)
5. [DSP Engine & Performance Architecture](#5-dsp-engine--performance-architecture)
   - [5.1 Direct AudioParam Fast-Path Modulation](#51-direct-audioparam-fast-path-modulation)
   - [5.2 Sigmoid WaveShaper Curve Memoization](#52-sigmoid-waveshaper-curve-memoization)
   - [5.3 Background Web Worker Clock Isolation](#53-background-web-worker-clock-isolation)
6. [Knowledge Graph & Linked Data (JSON-LD)](#6-knowledge-graph--linked-data-json-ld)
7. [Installation & Local Development](#7-installation--local-development)
8. [License & Credits](#8-license--credits)

---

## 1. System Overview

**Subtractive** is an analog-modeling synthesizer and production suite engineered by **Justin Ray** and published through [Trust Node Logic](https://trustnodelogic.com/). It bridges the physical immediacy of classic analog synthesizers (Sequential Prophet-5, Minimoog, Roland TB-303, Jupiter-8) with browser-native real-time Digital Signal Processing (DSP).

Running natively inside modern web browsers via the **Web Audio API**, Subtractive requires **zero plugins, zero external drivers, and zero installations**. 

### Key Highlights
- **16-Voice Polyphonic Analog Synthesis:** Up to 16 polyphonic voices with dynamic oldest-voice stealing, monophonic priority, and legato portamento modes.
- **Quad Oscillator Voice Engine:** 4 independent multi-waveform oscillators (Sawtooth, Square with Pulse Width Modulation, Triangle, Sine), sub-oscillator, and white noise generator.
- **Multi-Model VCF:** Continuous lowpass, highpass, bandpass, and notch filtering with interactive visual response curves and pre-filter analog drive.
- **Dual Visual ADSR Envelopes:** Interactive draggable curve canvases for Amp and Filter envelopes with real-time visual phase tracking.
- **Dual LFOs & 8-Slot Modulation Matrix:** Flexible modulation routings connecting LFOs, envelopes, velocity, mod wheel, and pitch bend to any sound-shaping destination.
- **Tri-Modal Focus Workspaces:** Dedicated views for deep sound design (`[SYNTH]`), multi-lane drum sequencing (`[GROOVE]`), and stage performance (`[PERFORM]`).
- **Interactive XY Vector Touchpad:** Dual-axis modulation radar for dynamic cutoff (X) and spatial reverb/delay (Y) manipulation with Latch and Spring modes.
- **Live Performance Drops & Macros:** 4 master performance knobs (Brightness, Color, Space, Punch) plus momentary *Dub Echo Freeze* and *Sub Bass Filter Drop* triggers.
- **16-Step Rhythm Sequencer:** 4-track analog drum synthesizer (Kick, Snare, Hi-Hat, Crash) powered by a jitter-free Web Worker clock thread that never drifts when tabs are hidden.
- **108+ Production Preset Vault:** Categorized soundbank library (Bass, Lead, Pad, Pluck, Keys, Arp, FX, User) with instant search, favorites, and lossless JSON bank import/export.
- **Hardware Integration & MIDI Learn:** Full Web MIDI support for USB/Bluetooth keyboards, CC control, and 1-click MIDI Learn for any parameter.
- **Lossless Master WAV Recording:** Capture high-fidelity stereo audio sessions directly inside the browser and export studio-quality WAV files with a single click.
- **Hardware Themes:** 4 skeuomorphic themes including **Nordic Forest Dark** (`#10b981`), Vintage Japanese, German Industrial, and Cyberpunk CRT.

---

## 2. Quick Start Guide

1. **Initialize Audio Engine:**  
   Click the glowing Nordic Forest Green **"INITIALIZE SYNTHESIZER ENGINE"** button on the start screen. Browsers require explicit user interaction before instantiating an `AudioContext`.
2. **Switch Workspaces:**  
   Press `1` for **[SYNTH]** (Sound Design Lab), `2` for **[GROOVE]** (4-Track Rhythm Matrix), or `3` for **[PERFORM]** (Live Jam & Expression Deck).
3. **Select a Preset:**  
   Click the **BROWSE** button or the preset name badge in the OLED header to open the **Preset Vault**. Choose from over 108 production patches or search by category.
4. **Play Notes:**  
   - **Computer Keyboard (QWERTY):** Use `Z`–`M` for the lower octave and `Q`–`I` for the upper octave.
   - **Mouse / Touch:** Click or swipe across the 25-key bottom keybed.
   - **MIDI Controller:** Connect any USB or Bluetooth MIDI keyboard; Subtractive automatically detects incoming notes, velocity, pitch bend, and mod wheel data.
5. **Launch the Beat:**  
   Press `Spacebar` or click **PLAY** on the transport to engage the 16-step drum sequencer.
6. **Shape in Real-Time:**  
   Jump into **[PERFORM]** mode (Key `3`) and drag across the glowing **XY Vector Touchpad** or hold **DUB ECHO FREEZE** for an instantaneous dub delay washout.

---

## 3. Interface Ergonomics & Tri-Modal Focus Workspaces

Subtractive is styled as a rugged, precision-engineered rackmount unit featuring brushed dark anodized chassis metal, recessed hex screws, beveled control modules, and glowing high-contrast OLED readouts.

To eliminate interface clutter and streamline production workflows, Subtractive introduces **Tri-Modal Focus Workspaces**, toggled instantly via the top header chips or desktop keyboard hotkeys `1`, `2`, and `3`.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ SUBTRACTIVE OLED HEADER   [SYNTH (1)]   [GROOVE (2)]   [PERFORM (3)]  REC ● │
└─────────────────────────────────────────────────────────────────────────────┘
       │                                │                               │
       ▼                                ▼                               ▼
┌──────────────────┐           ┌──────────────────┐           ┌──────────────────┐
│  [SYNTH] LAB     │           │ [GROOVE] MATRIX  │           │ [PERFORM] DECK   │
│  • 4x VCO Bay    │           │ • 4-Track Drum   │           │ • XY Vector Pad  │
│  • VCF Curve     │           │   Multi-Lane     │           │ • 4 Live Macros  │
│  • Dual ADSR Env │           │ • Solo/Mute/Pan  │           │ • Dub Freeze FX  │
│  • Master FX     │           │ • Bank 1-4 Steps │           │ • Sub Bass Drop  │
│  • Scope & Keys  │           │ • Arp & Monitor  │           │ • Mini Scope     │
└──────────────────┘           └──────────────────┘           └──────────────────┘
```

### 3.1 [SYNTH] Sound Design Lab (Key: `1`)
The complete modular synthesizer environment designed for deep sound sculpting:
- **Full Bay Overview:** Oscillators 1–4, Sub-Oscillator, Noise, Pulse Width Modulation, and Glide.
- **Interactive VCF Panel:** Draggable filter response curve canvas alongside Cutoff, Resonance, Drive, and Envelope Intensity controls.
- **Dual Envelope Editors:** Draggable graphical canvas envelope visualizers for Amplitude and Filter ADSR curves.
- **Modulation & LFOs:** Waveform selection, Rate (Hz or Tempo Sync), Depth, and target routing.
- **Master FX Studio Rack:** Drive/Tape Saturation, Stereo Delay, and Algorithmic Reverb.
- **Visual Telemetry:** Zero-crossing CRT Oscilloscope, FFT Spectrum Analyzer, Lissajous scope, and dual 10-segment stereo peak VU meters.

### 3.2 [GROOVE] 4-Track Rhythm Matrix (Key: `2`)
A dedicated rhythm production workspace inspired by classic Roland TR drum machines:
- **Simultaneous 4-Track Multi-Lane Grid:** Displays all 4 drum instruments (Kick, Snare, Hi-Hat, Crash) simultaneously across 16 steps without needing to flip through sub-menus.
- **3-State Velocity LED Buttons:**
  - **State 0 (Off):** Inactive step.
  - **State 1 (Normal):** 70% velocity trigger.
  - **State 2 (Accent - White Glow):** 100% velocity trigger with boosted punch.
- **Per-Track Solo & Mute:** Isolate or silence any instrument with zero audio clicks.
- **Per-Track Step Shift (`<` / `>`):** Nudge patterns left or right across the 16-step grid for syncopated polyrhythmic variations.
- **Track Sound Sculpting:** Dedicated Volume, Stereo Pan, Envelope Decay, and Pitch knobs per track.
- **Docked Synthesizer Monitor Bar:** Tweak Cutoff, Resonance, Drive, and Reverb while programming beats.
- **Docked Polyphonic Arpeggiator:** Access Arp controls directly from the rhythm workstation.

### 3.3 [PERFORM] Live Jam & Expression Deck (Key: `3`)
An expressive live-performance cockpit engineered for improvisation and stage sets:
- **Dual-Axis XY Vector Touchpad:**
  - **X-Axis:** Filter Cutoff Frequency (`20 Hz` to `20,000 Hz` logarithmic).
  - **Y-Axis:** Spatial FX Depth (Reverb Mix & Stereo Delay Mix).
  - **Latch Mode:** Coordinates remain locked where released.
  - **Spring Mode:** Touch point smoothly animates back to center (`0.5, 0.5`) upon release.
  - **Fast-Path Audio Engine:** Direct zero-allocation AudioParam dispatch provides immediate tactile response without waiting for React re-renders.
- **4 Master Performance Macro Knobs:**
  - **BRIGHTNESS:** Sweeps filter cutoff and harmonic envelope presence.
  - **COLOR:** Drives pre-filter saturation and sharpens resonance peak bite.
  - **SPACE:** Expands reverb decay and stereo delay wet mix.
  - **PUNCH:** Tightens envelope attack while boosting sub-oscillator weight.
- **Momentary Live FX Triggers:**
  - **DUB ECHO FREEZE:** Press and hold to instantly lock delay feedback to 100% with wet mix boost for infinite dub washouts; releases seamlessly back to previous values.
  - **SUB BASS FILTER DROP:** Press and hold to snap filter cutoff to 80Hz with extreme resonance and sub boost for dramatic build-ups and drops.
- **Active Polyphonic Voice Badges:** Real-time visual telemetry showing active voices, note pitches, and MIDI velocity.
- **Live Mini-Oscilloscope Display:** Low-overhead CRT visualizer displaying real-time waveform dynamics.
- **Quick Beat Launcher & Keybed:** Access transport, tempo, arpeggiator patterns, and keybed directly in performance mode.

### 3.4 Tactile Control Ergonomics & Rotary Knobs
- **Continuous Pointer Capture:** Click and drag vertically (up to increase, down to decrease). Knobs utilize `setPointerCapture` so rapid cursor movements never drop grip even when dragging outside the browser window.
- **Precision Mode (`Shift` + Drag):** Hold `Shift` while dragging to engage fine-increment micro-tuning (0.1x speed).
- **Default Reset:** Double-click any knob to immediately return to its factory default value.
- **OLED Readout Tooltip:** Hovering over or turning any dial reveals a floating high-contrast OLED badge displaying exact parameter values (Hz, ms, %, cents, semitones).
- **Contextual MIDI Learn:** Right-click or click the MIDI indicator on any knob to bind directly to hardware controllers.

### 3.5 Hardware Aesthetics & 4 Modular Colorways
Subtractive includes 4 selectable hardware colorways that re-skin the entire interface via scoped CSS variables:
1. **Nordic Forest Dark (`mono-dark`) [Default]:** Deep anodized slate (`#1a1d24`) with vivid Nordic Forest Green (`#10b981`) OLED glows and laser-engraved typography.
2. **Vintage Japanese (`vintage-japanese`):** 1980s Roland/Korg light grey brushed aluminum (`#c0c4cc`) with warm vermilion (`#e8541a`) accents.
3. **German Industrial (`german-industrial`):** Matte black studio rackmount (`#0a0a0a`) with warm gold/amber (`#c9a84c`) readouts and industrial precision.
4. **Cyberpunk CRT (`cyberpunk-crt`):** Pitch black glass (`#03050a`) with electric neon magenta (`#ff00cc`), vivid cyan accents, and retro CRT scanline textures.

---

## 4. Comprehensive Controls & Parameter Reference Manual

### 4.1 Voltage Controlled Oscillators (VCO 1–4, Sub, Noise)

Subtractive features 4 primary analog-modeled oscillators, a sub-oscillator, and a dedicated noise generator feeding a summed mixer bus:

```
                  ┌───────────────┐
   MIDI Note ───► │ Voice Manager │ (16 Polyphonic Voices)
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
  - `POLY`: Up to 16 polyphonic voices with dynamic oldest-voice stealing.
  - `MONO`: Single-voice priority with re-triggered envelopes.
  - `LEGATO`: Monophonic mode where overlapping notes glide seamlessly without re-triggering envelopes.
- **Glide (Portamento):** Slew rate from `0.00s` to `0.50s` smoothing pitch transitions between consecutive notes.
- **4 Oscillator Bays (`OSC 1` – `OSC 4`):**
  - **Enable Switch:** Toggles each oscillator on or off.
  - **Waveform Selector:** Choose between **Sawtooth** (rich bright harmonics), **Square** (hollow, reedy pulse), **Triangle** (warm, gentle tone), or **Sine** (pure fundamental).
  - **Gain Knob:** Adjusts relative volume balance (`0%` – `100%`).
  - **Detune Knob:** High-resolution pitch offset from `-2400` to `+2400` cents (±2 octaves) for thick analog supersaws and gentle chorusing.
  - **Waveform Icon & OLED Monitor:** Real-time visual feedback of active waveform and output level.
- **Pulse Width Modulation (`PWM`):** Continuously adjusts the duty cycle of Square waveforms from `10%` to `90%`. Modulatable via LFO for classic analog chorus motion.
- **Sub-Oscillator (`Sub Gain`):** Injects a pure sine wave exactly one octave below the played note for solid, earthquake-grade low-end support.
- **Noise Generator (`Noise Gain`):** Injects analog white noise for percussive attacks, wind effects, breathiness, and analog vintage tape realism.

---

### 4.2 Voltage Controlled Filter (VCF) & Interactive Response Curve

The VCF sculpts harmonic content using high-precision Web Audio biquad filter topologies with pre-filter saturation:

- **Filter Topologies:**
  - `LOWPASS`: Rolls off frequencies above the cutoff point (12dB/octave or 24dB/octave ladder mode).
  - `HIGHPASS`: Strips low rumble and thumps, passing only high harmonics.
  - `BANDPASS`: Isolates a narrow frequency band, creating resonant vocal and telephone effects.
  - `NOTCH`: Rejects a narrow band, creating phaser-like spectral notches.
- **Cutoff Knob (`20 Hz` – `20,000 Hz`):** Logarithmic frequency sweep governing the filter edge.
- **Resonance Knob (`0` – `40 Q`):** Sharpens the cutoff peak into self-oscillating whistle.
- **Pre-Filter Drive:** Analog-modeled soft saturation saturating the signal prior to entering the filter ladder.
- **Envelope Intensity (`EG Int` `-10,000` to `+10,000`):** Bipolar depth of cutoff modulation driven by the Filter ADSR envelope.
- **Interactive Canvas Response Curve:**
  - Real-time mathematical rendering of the biquad filter magnitude frequency response curve (`20 Hz` to `20 kHz`).
  - Click and drag the glowing central cutoff node horizontally to sweep cutoff frequency.
  - Drag vertically to adjust filter resonance in real-time.
  - Visual grid lines mark standard audio reference points: `100Hz`, `1kHz`, and `10kHz`.

---

### 4.3 Dual ADSR Envelopes & Interactive Canvas Editor

Subtractive provides two independent ADSR envelope generators for amplitude shaping and filter modulation:

#### Amplitude Envelope (AMP ADSR)
- **Attack (`0.001s` – `2.0s`):** Rise time from silence to maximum volume upon key press.
- **Decay (`0.001s` – `2.0s`):** Fall time from peak volume to sustained level.
- **Sustain (`0%` – `100%`):** Steady volume level held while note remains pressed.
- **Release (`0.001s` – `5.0s`):** Fade-out duration after the note is released.

#### Filter Envelope (FILTER ADSR)
- **Attack (`0.001s` – `1.0s`):** Sweep speed from base cutoff to envelope peak.
- **Decay (`0.001s` – `1.0s`):** Sweep time from peak to sustained cutoff offset.
- **Sustain (`0%` – `100%`):** Cutoff offset level maintained during held notes.
- **Release (`0.001s` – `10.0s`):** Return time to base cutoff frequency upon note release.

#### Interactive Envelope Canvas Visualizer
- Graphical visualizer rendering the combined Attack, Decay, Sustain, and Release curves.
- Draggable control points allow users to shape curves directly on screen.
- Real-time cursor animation traces the instantaneous envelope position as notes trigger and release.

---

### 4.4 Dual LFOs & Flexible Modulation Matrix

#### Low Frequency Oscillators (LFO 1 & LFO 2)
- **Waveforms:** Sine, Triangle, Sawtooth, Square.
- **Rate Modes:**
  - **Free Rate (`0.1 Hz` – `20.0 Hz`):** Continuous unsynced modulation speed.
  - **BPM Sync (`1/16`, `1/8`, `1/4`, `1/2`, `1/1`):** Quantized subdivisions locked to the master clock.
- **Depth Knob (`0%` – `100%`):** Total modulation amplitude.
- **Fade Time (`0.0s` – `2.0s`):** Delay/attack ramp allowing vibrato or wobble to fade in gradually after note trigger.
- **Retrigger:** When active, resets LFO phase to 0° upon each new note press.
- **Target Destinations:**
  - `PITCH`: Expressive vibrato and pitch bends.
  - `FILTER`: Rhythmic auto-wah and dubstep filter wobbles.
  - `AMP`: Tremolo and staccato volume gating.
  - `PWM`: Pulse width sweep across square oscillator channels.

#### 8-Slot Flexible Modulation Matrix
Route any modulation source to any synthesis destination with bipolar depth (`-1.0` to `+1.0`):
- **Sources:** `LFO 1`, `LFO 2`, `Mod Wheel`, `Note Velocity`, `Pitch Bend`, `Filter Envelope`, `Amp Envelope`.
- **Destinations:** `Osc 1 Pitch`, `Osc 2 Pitch`, `Master Pitch`, `Filter Cutoff`, `Filter Resonance`, `Filter Drive`, `PWM`, `Osc 1 Gain`, `Osc 2 Gain`, `Noise Gain`, `Sub Gain`, `FX Mix`, `Stereo Pan`.

---

### 4.5 Master FX Studio Rack (Drive, Delay, Reverb, Dynamics)

Audio passes through a studio-grade chain of master effects:

```
  Synth + Drums ──► [ Drive / Tape ] ──► [ Stereo Delay ] ──► [ Reverb ] ──► [ Limiter ] ──► Master Out
```

#### 1. Drive / Tape Saturation
- **DSP Topology:** Custom `WaveShaperNode` utilizing a non-linear sigmoid transfer curve with mathematical memoization (`driveCurveCache`).
- **Controls:** Power toggle, **Amount** (`0%` – `100%`).
- **Character:** Adds warm even/odd harmonic overtones, tape glue, and aggressive distortion.

#### 2. Stereo Delay
- **DSP Topology:** Dual-line stereo cross-feedback network.
- **Controls:**
  - **Time / Division:** Free delay time (`50ms` – `1000ms`) or tempo-synced musical divisions (`1/16`, `1/8`, `1/4`, etc.).
  - **Feedback:** Echo repeat duration (`0%` – `85%`).
  - **Mix:** Wet/Dry balance (`0%` – `100%`).
  - **SYNC Toggle:** Locks delay intervals to master sequencer BPM.
  - **PING-PONG Toggle:** Bounces delay reflections alternately across Left and Right stereo channels.

#### 3. Algorithmic Reverb
- **DSP Topology:** High-density procedural impulse response generated in memory and processed via a stereo `ConvolverNode`.
- **Controls:** Power toggle, **Decay** (`0.2s` – `6.0s`), **Mix** (`0%` – `100%`), **Damping**.
- **Character:** Smooth ambient tail with spatial stereo diffusion.

#### 4. Master Dynamics (Compressor & Brickwall Limiter)
- Transparent peak limiting ensuring output never clips or distorts, even during extreme resonance sweeps.

---

### 4.6 Polyphonic Arpeggiator

Turns held keyboard chords into rhythmic melodic patterns locked to the master clock:

- **Arp Enable Switch:** Toggles the arpeggiator engine.
- **Pattern Modes:**
  - `UP`: Ascending note sequence from lowest to highest pitch.
  - `DOWN`: Descending note sequence from highest to lowest pitch.
  - `UPDOWN`: Rebounding bi-directional sequence.
  - `CONVERGE`: Outer notes move inward toward the center.
  - `DIVERGE`: Center notes expand outward to the extremes.
  - `RANDOM`: Stochastically selected notes from the held chord.
- **Octave Range (`1`, `2`, `3`):** Transposition range across 1, 2, or 3 octaves.
- **Rate Subdivision (`1/32`, `1/16`, `1/8`, `1/4`):** Quantized note duration locked to Master BPM.
- **Gate (`10%` – `100%`):** Note duration (staccato pulses to sustained legato).
- **Swing (`50%` – `75%`):** Micro-timing swing shuffle applied to off-beat notes.
- **Ratchet (`1`, `2`, `3`, `4`):** Flam roll burst generating rapid ratcheting repeats per step.

---

### 4.7 16-Step Rhythm Sequencer & Web Worker Clock

The drum machine features 4 independent analog drum instruments powered by an isolated Web Worker clock:

- **Web Worker Clocking (`SequencerWorker.ts`):** High-precision background timer delivering rock-solid sub-millisecond scheduling immune to UI rendering loads or background browser tab throttling.
- **3-State Velocity LED Step Buttons:**
  - **State 0 (Off):** Silent step.
  - **State 1 (Normal):** 70% velocity trigger.
  - **State 2 (Accent - White Glow):** 100% velocity trigger with boosted punch.
- **4 Drum Channels:**
  - **Kick (`BD`):** Deep analog pitch-swept sine sub drop with click transient.
  - **Snare (`SD`):** Snappy dual-oscillator body layered with highpass white noise burst.
  - **Hi-Hat (`CH`):** Metallic bandpassed noise cluster with snappy decay.
  - **Crash (`CY`):** Ambient long-decay cymbal wash.
- **Per-Track Controls:**
  - **Volume:** Track output level (`0%` – `100%`).
  - **Pan:** Stereo placement (`-1.0` Left to `+1.0` Right).
  - **Decay:** Envelope length multiplier (`0.2s` – `3.0s`).
  - **Pitch:** Semitone tuning offset (`-12` to `+12` semitones).
  - **Solo & Mute:** Immediate track isolation or muting.
  - **Step Shift (`<` / `>`):** Shift step pattern left or right across the 16-step grid.
- **4 Pattern Banks (`Bank 1` – `4`):** Store and recall 4 independent 16-step patterns.
- **Tempo & Groove:**
  - **Master BPM:** Global tempo clock (`60` – `180` BPM).
  - **Swing:** Micro-timing groove offset (`0%` straight to `100%` heavy swing).

---

### 4.8 Live Performance Tools, XY Vector Touchpad & Drops

Accessible inside the **[PERFORM]** workspace (Key `3`):

- **XY Vector Touchpad:**
  - **X Axis:** Sweeps Filter Cutoff (`20 Hz` – `20 kHz`).
  - **Y Axis:** Expands Reverb and Delay wet spatial depth.
  - **Latch Mode:** Touch position remains anchored where released.
  - **Spring Mode:** Smoothly springs back to center (`0.5, 0.5`) upon touch release.
- **4 Performance Macro Knobs:**
  - **`BRIGHTNESS`:** Dynamically scales filter cutoff and filter envelope intensity.
  - **`COLOR`:** Increases pre-filter drive and sharpens filter resonance.
  - **`SPACE`:** Blends reverb and delay send levels simultaneously.
  - **`PUNCH`:** Shortens amplitude attack while boosting sub-oscillator gain.
- **Momentary Live Performance Triggers:**
  - **`DUB ECHO FREEZE`:** Instantly engages delay with 100% feedback and boosted wet mix for infinite dub echo loops. Releasing restores the previous delay parameters.
  - **`SUB BASS FILTER DROP`:** Instantly clamps cutoff down to 80Hz with extreme resonance and sub boost for dramatic club drops. Releasing restores previous filter settings.

---

### 4.9 CRT Oscilloscope, Spectrum Analyzer & Lissajous Vector Scope

Subtractive provides three real-time audio visualization modes:

1. **CRT Oscilloscope (Time-Domain):**
   - Incorporates a **hardware-grade zero-crossing detection algorithm** that stabilizes waveform rendering and eliminates visual flickering/drift.
   - Green CRT phosphor glow with authentic reticle grid lines.
2. **FFT Spectrum Analyzer (Frequency-Domain):**
   - Real-time 1024-point Fast Fourier Transform displaying energy distribution from `20 Hz` to `20 kHz`.
3. **Lissajous Vector Scope (Stereo Phase):**
   - X/Y phase correlation scope displaying stereo image width and phase coherence.
4. **Dual 10-Segment Stereo Peak VU Meters:**
   - Dedicated Left and Right peak meters with **400ms peak-hold indicators** and green/amber/red headroom stages.

---

### 4.10 Virtual Keybed, QWERTY Shortcuts & Web MIDI Integration

- **25-Key Multi-Touch Keybed:** Touch-friendly piano keyboard with active key lighting.
- **Pitch Bend & Modulation Wheels:**
  - **Pitch Bend Wheel:** Spring-loaded pitch controller (±2 semitones) with automatic return-to-center.
  - **Modulation Wheel:** Retained modulation controller linked to LFO depth.
- **Octave Transposition:** Shift keyboard range across 5 octaves (`-2`, `-1`, `0`, `+1`, `+2`).
- **Computer Keyboard Hotkeys (QWERTY):**
  - **Lower Octave:** `Z` (C), `S` (C#), `X` (D), `D` (D#), `C` (E), `V` (F), `G` (F#), `B` (G), `H` (G#), `N` (A), `J` (A#), `M` (B)
  - **Upper Octave:** `Q` (C), `2` (C#), `W` (D), `3` (D#), `E` (E), `R` (F), `5` (F#), `T` (G), `6` (G#), `Y` (A), `7` (A#), `U` (B), `I` (C)
  - **Layout Modes:** Toggle between DAW layout and Classic keyboard layout.
- **Web MIDI Controller Hardware Integration:**
  - Automatic detection of USB and Bluetooth MIDI keyboards.
  - Full polyphonic Note On / Note Off with velocity sensitivity.
  - Pitch Bend and Modulation Wheel (CC 1) tracking.
  - Filter Cutoff (CC 74) tracking.
  - **Interactive MIDI Learn Mode:** Click the MIDI Learn button on any parameter, turn a physical knob or slider on your hardware controller, and Subtractive instantly binds and persists the mapping in `localStorage`.

---

### 4.11 Preset Vault & Soundbank Manager (108+ Patches)

Click **BROWSE** in the OLED header to open the full-screen **Preset Vault**:

- **108+ Factory Soundbank Patches:** Categorized into `Bass`, `Lead`, `Pad`, `Pluck`, `Keys`, `Arp`, and `FX`.
- **Instant Search:** Search patches in real-time by title, sound designer, description, or tags.
- **Favorites System:** Star favorite patches for quick recall; persisted locally.
- **User Preset Management:** Save custom sound design creations with custom name, category, author, and description.
- **Lossless JSON Export / Import:**
  - **Export Bank:** Download your entire library of custom user presets as a structured JSON file.
  - **Import Bank:** Upload preset JSON files to instantly expand your sound library with schema validation.

---

### 4.12 Lossless Master Audio Recorder (WAV)

Subtractive features an integrated master bus audio recorder:

- **Lossless Stereo Capture:** Records pristine 16-bit PCM WAV audio (`44.1 kHz` or `48 kHz`) directly from the master audio bus.
- **Live Elapsed Timer:** Real-time OLED recording timer (`00:00`) displays recording duration.
- **1-Click Download:** Stopping the recording automatically generates a timestamped WAV file (`subtractive-session-YYYYMMDD-HHMMSS.wav`) ready for immediate download and DAW import.

---

## 5. DSP Engine & Performance Architecture

Subtractive's audio architecture is built around high-efficiency Web Audio API graphs designed for ultra-low latency:

```
┌────────────────────────────────────────────────────────┐
│                      UI MAIN THREAD                    │
│  React 19 Components ──► Throttled RAF Canvas Renders  │
│  Knob Drag Events    ──► Direct AudioParam Fast-Path   │
└──────────────────────────┬─────────────────────────────┘
                           │ Direct AudioParam Dispatch
┌──────────────────────────▼─────────────────────────────┐
│                    WEB AUDIO DSP GRAPH                 │
│  16x Voices ──► Sum Bus ──► VCF ──► FX Rack ──► Master │
└──────────────────────────▲─────────────────────────────┘
                           │ Clock Ticks (postMessage)
┌──────────────────────────┴─────────────────────────────┐
│                 WEB WORKER TIMER THREAD                │
│  SequencerWorker.ts ──► High-Resolution Interval Clock │
└────────────────────────────────────────────────────────┘
```

### 5.1 Direct AudioParam Fast-Path Modulation
To achieve silky-smooth 60fps/120fps performance during rapid modulation (such as dragging the XY Vector Touchpad or turning rotary knobs), Subtractive bypasses the standard React state render cycle for time-critical parameters:
- Real-time modulation dispatches directly to the `AudioParam` nodes via `AudioEngine.setFilterCutoff()`, `setFilterResonance()`, `setMasterGain()`, `setReverbMix()`, `setDelayMix()`, `setDriveAmount()`, and `setSubGain()`.
- React state synchronization is throttled via `requestAnimationFrame` to ensure zero garbage-collector overhead and eliminate audio clicks/pops.

### 5.2 Sigmoid WaveShaper Curve Memoization
Calculating non-linear mathematical saturation curves for `WaveShaperNode` can cause CPU spikes if generated repeatedly. Subtractive caches calculated sigmoid curves in an in-memory `driveCurveCache` map keyed to quantized drive percentages, eliminating memory reallocation during drive sweeps.

### 5.3 Background Web Worker Clock Isolation
Standard browser timers (`setInterval` / `setTimeout`) are throttled by web browsers down to once per second when tabs are inactive. Subtractive runs its sequencing clock inside a dedicated background **Web Worker** (`SequencerWorker.ts`), ensuring rock-solid micro-timing that never drifts or stops when working in other browser tabs or software.

---

## 6. Knowledge Graph & Linked Data (JSON-LD)

Subtractive is formally integrated into the **Trust Node Logic** / **VISIONMAIN** canonical knowledge graph. Its schema is indexed under the global graph of [Justin Ray](https://trustnodelogic.com/#person) and [Trust Node Logic](https://trustnodelogic.com/#organization).

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
      "operatingSystem": "Any (Cross-Platform Modern Browser)",
      "browserRequirements": "Requires Web Audio API & Web MIDI support",
      "description": "Free browser-native polyphonic subtractive synthesizer, 16-step rhythm sequencer, and live performance expression deck featuring real-time Web Audio API DSP synthesis, Tri-Modal Focus Workspaces, Master FX Rack, Arpeggiator, Zero-Crossing CRT Oscilloscope, and Web MIDI support.",
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
   Open your browser to `http://localhost:5173/` (or the port displayed in your terminal).

4. **Typecheck & Validate Code:**
   ```bash
   npx tsc --noEmit
   ```

5. **Build production bundle:**
   ```bash
   npm run build
   ```
   The compiled assets will be output to the `dist/` directory ready for deployment to any static web host or CDN.

---

## 8. License & Credits

- **Concept, Audio DSP Engineering & Design:** **Justin Ray** ([Trust Node Logic](https://trustnodelogic.com/))
- **Publisher & Research Laboratory:** [Trust Node Logic](https://trustnodelogic.com/) (`https://trustnodelogic.com`)
- **Primary Aliases:** Justin Ray (JRAY, loserdub, VISION)
- **License:** [MIT License](LICENSE) — free for personal, educational, and commercial music production.
