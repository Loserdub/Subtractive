import { create } from 'zustand';
import { DrumTrackName, DrumTrackSettings } from '../types';
import { useSynthStore } from './useSynthStore';

function snapshot() {
  const state = useSynthStore.getState();
  const bank = state.currentBankIndex;
  return structuredClone({
    bank, name: state.selectedPresetName, params: state.params,
    drums: state.banks[bank], melody: state.melodicBanks[bank],
    settings: state.drumSettings, lengths: state.drumTrackLengths, ratchets: state.drumTrackRatchets,
  });
}

export type Scene = ReturnType<typeof snapshot>;
const storageKey = 'subtractive_scenes_v1';
function readScenes(): (Scene | null)[] {
  let saved: Scene[] = [];
  try { saved = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch {}
  return Array.from({ length: 4 }, (_, i) => {
    const scene = saved?.[i];
    return scene?.params?.fx && scene.melody?.steps?.length === 16 && scene.drums?.kick &&
      scene.settings?.kick && scene.lengths && scene.ratchets && Number.isInteger(scene.bank) &&
      scene.bank >= 0 && scene.bank < 4 ? scene : null;
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
    const scenes = [...get().scenes];
    scenes[slot] = snapshot();
    let storageFailed = false;
    try { localStorage.setItem(storageKey, JSON.stringify(scenes)); } catch { storageFailed = true; }
    set({ scenes, active: slot, queued: null, storageFailed });
  },
  launch(slot) {
    if (!get().scenes[slot]) return;
    const state = useSynthStore.getState();
    if (state.isDrumMachinePlaying || state.isDrumQueued || state.isSeqQueued) {
      set({ queued: get().queued === slot ? null : slot });
    } else {
      get().recall(slot);
    }
  },
  recall(slot) {
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
