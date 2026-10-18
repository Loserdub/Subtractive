import { create } from 'zustand';
import { 
  SynthParameters, 
  StepSequencePattern, 
  DrumTrackName, 
  DrumTrackSettings, 
  PresetPatch, 
  WorkspaceMode, 
  MelodicSequencerPattern, 
  DrumTrackLengths, 
  DrumTrackRatchets 
} from '../types';
import { TransportQuantizeMode } from '../services/DrumMachineEngine';
import { 
  DEFAULT_SYNTH_PARAMS, 
  DEFAULT_BPM, 
  DEFAULT_DRUM_PATTERN, 
  DEFAULT_DRUM_TRACK_SETTINGS, 
  DEFAULT_MELODIC_PATTERN, 
  DEFAULT_DRUM_TRACK_LENGTHS, 
  DEFAULT_DRUM_TRACK_RATCHETS 
} from '../constants';
import { patchParams, DeepPartial } from '../utils/patchParams';

export type MobileTab = 'vco' | 'vcf' | 'env' | 'fx' | 'arp' | 'seq' | 'drums' | 'keys';
export type VisualizerMode = 'oscilloscope' | 'spectrum' | 'lissajous';

export interface SynthStoreState {
  // Sound Engine Parameters
  params: SynthParameters;
  selectedPresetName: string;
  midiStatus: string;
  isStarted: boolean;
  activeNotes: Set<number>;

  // Workspace & Navigation
  workspaceMode: WorkspaceMode;
  activeTab: MobileTab;
  selectedMobileOsc: 'osc1' | 'osc2' | 'osc3' | 'osc4';
  visualizerMode: VisualizerMode;
  selectedEnvTab: 'amp' | 'filter';
  isKeybedVisible: boolean;
  isPresetBrowserOpen: boolean;

  // Real-time Steps & Modulation
  runningStep: number | null;
  arpActiveStep: number | null;
  arpActiveNote: number | null;

  // Recording & MIDI Mapping
  isRecording: boolean;
  recordingSeconds: number;
  learningParamId: string | null;
  mappedCCs: Record<string, number>;
  rawMappedCCs: Record<number, string>;
  userPresets: PresetPatch[];

  // Drum & Melodic Sequencing
  banks: StepSequencePattern[];
  currentBankIndex: number;
  selectedTrack: DrumTrackName;
  bpm: number;
  swing: number;
  drumSettings: Record<DrumTrackName, DrumTrackSettings>;
  drumTrackLengths: DrumTrackLengths;
  drumTrackRatchets: DrumTrackRatchets;
  melodicBanks: MelodicSequencerPattern[];

  // Dual Transport Synchronization
  isDrumPlaying: boolean;
  isSeqPlaying: boolean;
  isDrumQueued: boolean;
  isSeqQueued: boolean;
  quantizeMode: TransportQuantizeMode;
  isDrumMachinePlaying: boolean;

  // Actions
  setParams: (updater: SynthParameters | ((prev: SynthParameters) => SynthParameters)) => void;
  updateParams: (patch: DeepPartial<SynthParameters>) => void;
  setSelectedPresetName: (name: string) => void;
  setMidiStatus: (status: string) => void;
  setIsStarted: (isStarted: boolean) => void;
  setActiveNotes: (updater: Set<number> | ((prev: Set<number>) => Set<number>)) => void;
  noteOn: (note: number) => void;
  noteOff: (note: number) => void;

  setWorkspaceMode: (mode: WorkspaceMode) => void;
  setActiveTab: (tab: MobileTab) => void;
  setSelectedMobileOsc: (osc: 'osc1' | 'osc2' | 'osc3' | 'osc4') => void;
  setVisualizerMode: (mode: VisualizerMode) => void;
  setSelectedEnvTab: (tab: 'amp' | 'filter') => void;
  setIsKeybedVisible: (visible: boolean | ((prev: boolean) => boolean)) => void;
  setIsPresetBrowserOpen: (isOpen: boolean) => void;

  setRunningStep: (step: number | null) => void;
  setArpActiveStep: (step: number | null) => void;
  setArpActiveNote: (note: number | null) => void;

  setIsRecording: (recording: boolean) => void;
  setRecordingSeconds: (seconds: number | ((prev: number) => number)) => void;
  setLearningParamId: (id: string | null) => void;
  setMappedCCs: (updater: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => void;
  setRawMappedCCs: (updater: Record<number, string> | ((prev: Record<number, string>) => Record<number, string>)) => void;
  setUserPresets: (updater: PresetPatch[] | ((prev: PresetPatch[]) => PresetPatch[])) => void;

  setBanks: (updater: StepSequencePattern[] | ((prev: StepSequencePattern[]) => StepSequencePattern[])) => void;
  setCurrentBankIndex: (idx: number) => void;
  setSelectedTrack: (track: DrumTrackName) => void;
  setBpm: (bpm: number) => void;
  setSwing: (swing: number) => void;
  setDrumSettings: (updater: Record<DrumTrackName, DrumTrackSettings> | ((prev: Record<DrumTrackName, DrumTrackSettings>) => Record<DrumTrackName, DrumTrackSettings>)) => void;
  setDrumTrackLengths: (lengths: DrumTrackLengths | ((prev: DrumTrackLengths) => DrumTrackLengths)) => void;
  setDrumTrackRatchets: (ratchets: DrumTrackRatchets | ((prev: DrumTrackRatchets) => DrumTrackRatchets)) => void;
  setMelodicBanks: (updater: MelodicSequencerPattern[] | ((prev: MelodicSequencerPattern[]) => MelodicSequencerPattern[])) => void;
  setTransportState: (tState: {
    isDrumPlaying?: boolean;
    isSeqPlaying?: boolean;
    isDrumQueued?: boolean;
    isSeqQueued?: boolean;
    quantizeMode?: TransportQuantizeMode;
    isDrumMachinePlaying?: boolean;
  }) => void;
  setQuantizeMode: (quantizeMode: TransportQuantizeMode) => void;

  // History & A/B Comparison Slices
  undoStack: SynthParameters[];
  redoStack: SynthParameters[];
  canUndo: boolean;
  canRedo: boolean;
  patchSlot: 'A' | 'B';
  patchA: SynthParameters;
  patchB: SynthParameters;
  pushSnapshot: () => void;
  undo: () => void;
  redo: () => void;
  togglePatchSlot: () => void;
  copyActiveToOtherSlot: () => void;
}

const getInitialWorkspaceMode = (): WorkspaceMode => {
  try {
    const saved = localStorage.getItem('subtractive_workspace_mode') as WorkspaceMode;
    return (['synth', 'fx', 'arp', 'seq', 'groove', 'perform'] as WorkspaceMode[]).includes(saved) ? saved : 'synth';
  } catch {
    return 'synth';
  }
};

const getInitialKeybedVisible = (): boolean => {
  try {
    const saved = localStorage.getItem('subtractive_keybed_visible');
    return saved !== null ? saved === 'true' : true;
  } catch {
    return true;
  }
};

const getInitialUserPresets = (): PresetPatch[] => {
  try {
    const saved = localStorage.getItem('subtractive_user_presets');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

const getInitialMappedCCs = (): { inverted: Record<string, number>; raw: Record<number, string> } => {
  try {
    const saved = localStorage.getItem('subtractive_midi_cc_mappings');
    if (saved) {
      const ccMap: Record<number, string> = JSON.parse(saved);
      const inverted: Record<string, number> = {};
      for (const [cc, id] of Object.entries(ccMap)) {
        inverted[id] = parseInt(cc, 10);
      }
      return { inverted, raw: ccMap };
    }
  } catch {}
  return { inverted: {}, raw: {} };
};

const getInitialMelodicBanks = (): MelodicSequencerPattern[] => {
  try {
    const saved = localStorage.getItem('subtractive_melodic_banks');
    if (saved) return JSON.parse(saved);
  } catch {}
  return Array(4).fill(null).map(() => JSON.parse(JSON.stringify(DEFAULT_MELODIC_PATTERN)));
};

const initialCCs = getInitialMappedCCs();

export const useSynthStore = create<SynthStoreState>((set) => ({
  // Sound Engine Parameters
  params: DEFAULT_SYNTH_PARAMS,
  selectedPresetName: 'Analog Init',
  midiStatus: 'Engine Standby',
  isStarted: false,
  activeNotes: new Set<number>(),

  // Workspace & Navigation
  workspaceMode: getInitialWorkspaceMode(),
  activeTab: 'vco',
  selectedMobileOsc: 'osc1',
  visualizerMode: 'oscilloscope',
  selectedEnvTab: 'amp',
  isKeybedVisible: getInitialKeybedVisible(),
  isPresetBrowserOpen: false,

  // Real-time Steps & Modulation
  runningStep: null,
  arpActiveStep: null,
  arpActiveNote: null,

  // Recording & MIDI Mapping
  isRecording: false,
  recordingSeconds: 0,
  learningParamId: null,
  mappedCCs: initialCCs.inverted,
  rawMappedCCs: initialCCs.raw,
  userPresets: getInitialUserPresets(),

  // Drum & Melodic Sequencing
  banks: Array(4).fill(null).map(() => JSON.parse(JSON.stringify(DEFAULT_DRUM_PATTERN))),
  currentBankIndex: 0,
  selectedTrack: 'kick',
  bpm: DEFAULT_BPM,
  swing: 0,
  drumSettings: JSON.parse(JSON.stringify(DEFAULT_DRUM_TRACK_SETTINGS)),
  drumTrackLengths: { ...DEFAULT_DRUM_TRACK_LENGTHS },
  drumTrackRatchets: JSON.parse(JSON.stringify(DEFAULT_DRUM_TRACK_RATCHETS)),
  melodicBanks: getInitialMelodicBanks(),

  // Dual Transport Synchronization
  isDrumPlaying: false,
  isSeqPlaying: false,
  isDrumQueued: false,
  isSeqQueued: false,
  quantizeMode: 'bar',
  isDrumMachinePlaying: false,

  // Actions
  setParams: (updater) =>
    set((state) => ({
      params: typeof updater === 'function' ? updater(state.params) : updater
    })),

  updateParams: (patch) =>
    set((state) => ({
      params: patchParams(state.params, patch)
    })),

  setSelectedPresetName: (selectedPresetName) => set({ selectedPresetName }),
  setMidiStatus: (midiStatus) => set({ midiStatus }),
  setIsStarted: (isStarted) => set({ isStarted }),

  setActiveNotes: (updater) =>
    set((state) => ({
      activeNotes: typeof updater === 'function' ? updater(state.activeNotes) : updater
    })),

  noteOn: (note) =>
    set((state) => {
      const next = new Set(state.activeNotes);
      next.add(note);
      return { activeNotes: next };
    }),

  noteOff: (note) =>
    set((state) => {
      const next = new Set(state.activeNotes);
      next.delete(note);
      return { activeNotes: next };
    }),

  setWorkspaceMode: (workspaceMode) => {
    try {
      localStorage.setItem('subtractive_workspace_mode', workspaceMode);
    } catch {}
    set({ workspaceMode });
  },

  setActiveTab: (activeTab) => set({ activeTab }),
  setSelectedMobileOsc: (selectedMobileOsc) => set({ selectedMobileOsc }),
  setVisualizerMode: (visualizerMode) => set({ visualizerMode }),
  setSelectedEnvTab: (selectedEnvTab) => set({ selectedEnvTab }),

  setIsKeybedVisible: (updater) =>
    set((state) => {
      const val = typeof updater === 'function' ? updater(state.isKeybedVisible) : updater;
      try {
        localStorage.setItem('subtractive_keybed_visible', String(val));
      } catch {}
      return { isKeybedVisible: val };
    }),

  setIsPresetBrowserOpen: (isPresetBrowserOpen) => set({ isPresetBrowserOpen }),

  setRunningStep: (runningStep) => set({ runningStep }),
  setArpActiveStep: (arpActiveStep) => set({ arpActiveStep }),
  setArpActiveNote: (arpActiveNote) => set({ arpActiveNote }),

  setIsRecording: (isRecording) => set({ isRecording }),
  setRecordingSeconds: (updater) =>
    set((state) => ({
      recordingSeconds: typeof updater === 'function' ? updater(state.recordingSeconds) : updater
    })),

  setLearningParamId: (learningParamId) => set({ learningParamId }),

  setMappedCCs: (updater) =>
    set((state) => {
      const next = typeof updater === 'function' ? updater(state.mappedCCs) : updater;
      return { mappedCCs: next };
    }),

  setRawMappedCCs: (updater) =>
    set((state) => {
      const next = typeof updater === 'function' ? updater(state.rawMappedCCs) : updater;
      try {
        localStorage.setItem('subtractive_midi_cc_mappings', JSON.stringify(next));
      } catch {}
      return { rawMappedCCs: next };
    }),

  setUserPresets: (updater) =>
    set((state) => {
      const next = typeof updater === 'function' ? updater(state.userPresets) : updater;
      try {
        localStorage.setItem('subtractive_user_presets', JSON.stringify(next));
      } catch {}
      return { userPresets: next };
    }),

  setBanks: (updater) =>
    set((state) => ({
      banks: typeof updater === 'function' ? updater(state.banks) : updater
    })),

  setCurrentBankIndex: (currentBankIndex) => set({ currentBankIndex }),
  setSelectedTrack: (selectedTrack) => set({ selectedTrack }),
  setBpm: (bpm) => set({ bpm }),
  setSwing: (swing) => set({ swing }),

  setDrumSettings: (updater) =>
    set((state) => ({
      drumSettings: typeof updater === 'function' ? updater(state.drumSettings) : updater
    })),

  setDrumTrackLengths: (updater) =>
    set((state) => ({
      drumTrackLengths: typeof updater === 'function' ? updater(state.drumTrackLengths) : updater
    })),

  setDrumTrackRatchets: (updater) =>
    set((state) => ({
      drumTrackRatchets: typeof updater === 'function' ? updater(state.drumTrackRatchets) : updater
    })),

  setMelodicBanks: (updater) =>
    set((state) => {
      const next = typeof updater === 'function' ? updater(state.melodicBanks) : updater;
      try {
        localStorage.setItem('subtractive_melodic_banks', JSON.stringify(next));
      } catch {}
      return { melodicBanks: next };
    }),

  setTransportState: (tState) =>
    set((state) => {
      const isDrumPlaying = tState.isDrumPlaying !== undefined ? tState.isDrumPlaying : state.isDrumPlaying;
      const isSeqPlaying = tState.isSeqPlaying !== undefined ? tState.isSeqPlaying : state.isSeqPlaying;
      return {
        ...tState,
        isDrumMachinePlaying: isDrumPlaying || isSeqPlaying
      };
    }),

  setQuantizeMode: (quantizeMode) => set({ quantizeMode }),

  // History & A/B Comparison Slices
  undoStack: [],
  redoStack: [],
  canUndo: false,
  canRedo: false,
  patchSlot: 'A',
  patchA: JSON.parse(JSON.stringify(DEFAULT_SYNTH_PARAMS)),
  patchB: JSON.parse(JSON.stringify(DEFAULT_SYNTH_PARAMS)),

  pushSnapshot: () =>
    set((state) => {
      const cloned = JSON.parse(JSON.stringify(state.params));
      const nextUndo = [...state.undoStack, cloned];
      if (nextUndo.length > 50) nextUndo.shift();
      return {
        undoStack: nextUndo,
        redoStack: [],
        canUndo: true,
        canRedo: false,
        patchA: state.patchSlot === 'A' ? cloned : state.patchA,
        patchB: state.patchSlot === 'B' ? cloned : state.patchB,
      };
    }),

  undo: () =>
    set((state) => {
      if (state.undoStack.length === 0) return state;
      const nextUndo = [...state.undoStack];
      const targetParams = nextUndo.pop()!;
      const currentCloned = JSON.parse(JSON.stringify(state.params));
      const nextRedo = [...state.redoStack, currentCloned];
      return {
        undoStack: nextUndo,
        redoStack: nextRedo,
        params: targetParams,
        canUndo: nextUndo.length > 0,
        canRedo: true,
        patchA: state.patchSlot === 'A' ? targetParams : state.patchA,
        patchB: state.patchSlot === 'B' ? targetParams : state.patchB,
      };
    }),

  redo: () =>
    set((state) => {
      if (state.redoStack.length === 0) return state;
      const nextRedo = [...state.redoStack];
      const targetParams = nextRedo.pop()!;
      const currentCloned = JSON.parse(JSON.stringify(state.params));
      const nextUndo = [...state.undoStack, currentCloned];
      return {
        undoStack: nextUndo,
        redoStack: nextRedo,
        params: targetParams,
        canUndo: true,
        canRedo: nextRedo.length > 0,
        patchA: state.patchSlot === 'A' ? targetParams : state.patchA,
        patchB: state.patchSlot === 'B' ? targetParams : state.patchB,
      };
    }),

  togglePatchSlot: () =>
    set((state) => {
      const nextSlot = state.patchSlot === 'A' ? 'B' : 'A';
      const currentParams = JSON.parse(JSON.stringify(state.params));
      const updatedA = state.patchSlot === 'A' ? currentParams : state.patchA;
      const updatedB = state.patchSlot === 'B' ? currentParams : state.patchB;
      const targetParams = nextSlot === 'A' ? updatedA : updatedB;
      return {
        patchSlot: nextSlot,
        patchA: updatedA,
        patchB: updatedB,
        params: targetParams,
        undoStack: [],
        redoStack: [],
        canUndo: false,
        canRedo: false,
      };
    }),

  copyActiveToOtherSlot: () =>
    set((state) => {
      const current = JSON.parse(JSON.stringify(state.params));
      return {
        patchA: current,
        patchB: current,
      };
    })
}));
