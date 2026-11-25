import { create } from 'zustand';
import { DrumTrackName, DrumTrackSettings } from '../types';
import { useSynthStore } from './useSynthStore';

function snapshot() {
  const state = useSynthStore.getState();
  const bank = Number.isInteger(state.currentBankIndex)
    ? Math.max(0, Math.min(SCENE_COUNT - 1, state.currentBankIndex))
    : 0;
  return structuredClone({
    bank, name: state.selectedPresetName, params: state.params,
    drums: state.banks[bank], melody: state.melodicBanks[bank],
    settings: state.drumSettings, lengths: state.drumTrackLengths, ratchets: state.drumTrackRatchets,
  });
}

export type Scene = ReturnType<typeof snapshot>;
const SCENE_COUNT = 4;
const DRUM_TRACKS: DrumTrackName[] = ['kick', 'snare', 'hihat', 'crash'];

function isValidSlot(slot: number) {
  return Number.isInteger(slot) && slot >= 0 && slot < SCENE_COUNT;
}

function isFiniteNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isValidScene(scene: unknown): scene is Scene {
  if (!scene || typeof scene !== 'object') return false;
  const s = scene as Partial<Scene>;
  if (!Number.isInteger(s.bank) || (s.bank as number) < 0 || (s.bank as number) >= SCENE_COUNT) return false;
  if (typeof s.name !== 'string') return false;
  const p = s.params;
  if (!p || !p.osc1 || !p.osc2 || !p.osc3 || !p.osc4 || !p.filter || !p.ampEnvelope || !p.filterEnvelope || !p.lfo || !p.arpeggiator) return false;
  if (!p.fx?.drive || !p.fx.delay || !p.fx.reverb) return false;
  if (!isFiniteNum(p.masterGain) || !isFiniteNum(p.subGain) || !isFiniteNum(p.filter.cutoff) || !isFiniteNum(p.filter.resonance)) return false;
  if (!isFiniteNum(p.fx.drive.amount) || !isFiniteNum(p.fx.delay.mix) || !isFiniteNum(p.fx.delay.feedback) || !isFiniteNum(p.fx.reverb.mix)) return false;
  if (!s.melody || typeof s.melody.enabled !== 'boolean' || !Array.isArray(s.melody.steps) || s.melody.steps.length !== 16) return false;
  if (!Number.isInteger(s.melody.length) || s.melody.length < 1 || s.melody.length > 16 || !isFiniteNum(s.melody.octave)) return false;
  if (!s.melody.steps.every(step => step && isFiniteNum(step.note) && typeof step.enabled === 'boolean')) return false;
  if (!s.drums || !s.settings || !s.lengths || !s.ratchets) return false;
  return DRUM_TRACKS.every(track => {
    const drumRow = s.drums![track];
    const setting = s.settings![track];
    const len = s.lengths![track];
    const ratchetRow = s.ratchets![track];
    return (
      Array.isArray(drumRow) && drumRow.length >= 16 && drumRow.every(isFiniteNum) &&
      !!setting && isFiniteNum(setting.volume) && isFiniteNum(setting.pan) && isFiniteNum(setting.decay) && isFiniteNum(setting.pitch) &&
      Number.isInteger(len) && len >= 1 && len <= 16 &&
      Array.isArray(ratchetRow) && ratchetRow.length >= 16 && ratchetRow.every(isFiniteNum)
    );
  });
}

const storageKey = 'subtractive_scenes_v1';
function readScenes(): (Scene | null)[] {
  let saved: unknown = [];
  try { saved = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch {}
  return Array.from({ length: SCENE_COUNT }, (_, i) => {
    const scene = Array.isArray(saved) ? saved[i] : null;
    return isValidScene(scene) ? scene : null;
  });
}

export function effectiveDrumSettings(settings: Scene['settings'], track: DrumTrackName): DrumTrackSettings {
  const channel = settings[track];
  const silent = channel.muted || (Object.values(settings).some(s => s.solo) && !channel.solo);
  return silent ? { ...channel, volume: 0 } : channel;
}

interface SceneMemory {
  scenes: (Scene | null)[];
  active: number | null;
  queued: number | null;
  recallCount: number;
  storageFailed: boolean;
  capture: (slot: number) => void;
  launch: (slot: number) => void;
  recall: (slot: number) => void;
}

export const useSceneStore = create<SceneMemory>((set, get) => ({
  scenes: readScenes(), active: null, queued: null, recallCount: 0, storageFailed: false,
  capture(slot) {
    if (!isValidSlot(slot)) return;
    const scenes = [...get().scenes];
    scenes[slot] = snapshot();
    let storageFailed = false;
    try { localStorage.setItem(storageKey, JSON.stringify(scenes)); } catch { storageFailed = true; }
    set({ scenes, active: slot, queued: null, storageFailed });
  },
  launch(slot) {
    if (!isValidSlot(slot) || !get().scenes[slot]) return;
    const state = useSynthStore.getState();
    if (state.isDrumMachinePlaying || state.isDrumQueued || state.isSeqQueued) {
      set({ queued: get().queued === slot ? null : slot });
    } else {
      get().recall(slot);
    }
  },
  recall(slot) {
    if (!isValidSlot(slot)) return;
    const scene = get().scenes[slot];
    if (!scene) return;
    const { bank, name, params, drums, melody, settings, lengths, ratchets } = structuredClone(scene);
    const state = useSynthStore.getState();
    const banks = [...state.banks];
    const melodicBanks = [...state.melodicBanks];
    banks[bank] = drums;
    melodicBanks[bank] = melody;
    useSynthStore.setState({ currentBankIndex: bank, banks, melodicBanks, params,
      selectedPresetName: name, drumSettings: settings, drumTrackLengths: lengths, drumTrackRatchets: ratchets });
    try { localStorage.setItem('subtractive_melodic_banks', JSON.stringify(melodicBanks)); } catch {}
    set({ active: slot, queued: null, recallCount: get().recallCount + 1 });
  },
}));
