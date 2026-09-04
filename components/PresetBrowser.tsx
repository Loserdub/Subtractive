import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PresetPatch, SynthParameters } from '../types';
import { SYNTH_PRESETS, DEFAULT_SYNTH_PARAMS } from '../constants';
import { patchParams } from '../utils/patchParams';
import { LEDButton } from './Switch';

interface PresetBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  currentParams: SynthParameters;
  currentPresetName: string;
  onSelectPreset: (preset: PresetPatch) => void;
}

const FAVORITES_STORAGE_KEY = 'subtractive_favorite_presets';
const USER_PRESETS_STORAGE_KEY = 'subtractive_user_presets';

const CATEGORIES = [
  'All',
  'Favorites',
  'Bass',
  'Lead',
  'Pad',
  'Pluck',
  'Keys',
  'Arp',
  'FX',
  'User'
] as const;

type CategoryTab = typeof CATEGORIES[number];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Bass: { bg: 'bg-[#ffaa00]/10', text: 'text-[#ffaa00]', border: 'border-[#ffaa00]/40' },
  Lead: { bg: 'bg-[#00e5ff]/10', text: 'text-[#00e5ff]', border: 'border-[#00e5ff]/40' },
  Pad: { bg: 'bg-[#00ff66]/10', text: 'text-[#00ff66]', border: 'border-[#00ff66]/40' },
  Pluck: { bg: 'bg-[#d946ef]/10', text: 'text-[#d946ef]', border: 'border-[#d946ef]/40' },
  Keys: { bg: 'bg-[#a855f7]/10', text: 'text-[#a855f7]', border: 'border-[#a855f7]/40' },
  Arp: { bg: 'bg-[#ff3344]/10', text: 'text-[#ff3344]', border: 'border-[#ff3344]/40' },
  FX: { bg: 'bg-[#facc15]/10', text: 'text-[#facc15]', border: 'border-[#facc15]/40' },
  User: { bg: 'bg-[#38bdf8]/10', text: 'text-[#38bdf8]', border: 'border-[#38bdf8]/40' },
  Basic: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-600/40' },
};

export const PresetBrowser: React.FC<PresetBrowserProps> = ({
  isOpen,
  onClose,
  currentParams,
  currentPresetName,
  onSelectPreset
}) => {
  const [selectedCategory, setSelectedCategory] = useState<CategoryTab>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [userPresets, setUserPresets] = useState<PresetPatch[]>(() => {
    try {
      const saved = localStorage.getItem(USER_PRESETS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveCategory, setSaveCategory] = useState('User');
  const [saveAuthor, setSaveAuthor] = useState('User');
  const [saveDescription, setSaveDescription] = useState('');
  const [saveTags, setSaveTags] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Combine factory and user presets
  const allPresets = useMemo(() => {
    return [...SYNTH_PRESETS, ...userPresets];
  }, [userPresets]);

  // Set initial selected preset based on currentPresetName
  useEffect(() => {
    if (isOpen) {
      const match = allPresets.find(p => p.name === currentPresetName);
      if (match) {
        setSelectedPresetId(match.id || match.name);
      }
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isOpen, currentPresetName, allPresets]);

  // Save favorites to localStorage
  const toggleFavorite = (idOrName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(idOrName)) {
        next.delete(idOrName);
      } else {
        next.add(idOrName);
      }
      try {
        localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  // Filter presets
  const filteredPresets = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allPresets.filter(patch => {
      const idOrName = patch.id || patch.name;

      // Category filter
      if (selectedCategory === 'Favorites') {
        if (!favorites.has(idOrName)) return false;
      } else if (selectedCategory === 'User') {
        if (patch.category !== 'User' && !userPresets.some(u => (u.id || u.name) === idOrName)) return false;
      } else if (selectedCategory !== 'All') {
        if (patch.category.toLowerCase() !== selectedCategory.toLowerCase()) return false;
      }

      // Search filter
      if (!q) return true;
      const matchName = patch.name.toLowerCase().includes(q);
      const matchAuthor = patch.author?.toLowerCase().includes(q);
      const matchDesc = patch.description?.toLowerCase().includes(q);
      const matchTags = patch.tags?.some(t => t.toLowerCase().includes(q));
      const matchCat = patch.category.toLowerCase().includes(q);

      return matchName || matchAuthor || matchDesc || matchTags || matchCat;
    });
  }, [allPresets, selectedCategory, searchQuery, favorites, userPresets]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: allPresets.length, Favorites: favorites.size, User: userPresets.length };
    for (const p of allPresets) {
      counts[p.category] = (counts[p.category] || 0) + 1;
    }
    return counts;
  }, [allPresets, favorites, userPresets]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  // Save Current Patch as User Patch
  const handleSaveUserPatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveName.trim()) return;

    const newPatch: PresetPatch = {
      id: `user-${Date.now()}`,
      name: saveName.trim(),
      category: saveCategory,
      author: saveAuthor.trim() || 'User',
      description: saveDescription.trim(),
      tags: saveTags.split(',').map(t => t.trim()).filter(Boolean),
      params: patchParams(DEFAULT_SYNTH_PARAMS, currentParams)
    };

    const nextUserPresets = [...userPresets, newPatch];
    setUserPresets(nextUserPresets);
    try {
      localStorage.setItem(USER_PRESETS_STORAGE_KEY, JSON.stringify(nextUserPresets));
    } catch {}

    setIsSaveModalOpen(false);
    setSaveName('');
    setSaveDescription('');
    setSaveTags('');
    onSelectPreset(newPatch);
    setSelectedPresetId(newPatch.id!);
    showToast(`Saved patch "${newPatch.name}" to User library!`);
  };

  // Delete User Patch
  const handleDeleteUserPatch = (patchId: string, patchName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Delete user patch "${patchName}"?`)) return;

    const next = userPresets.filter(p => (p.id || p.name) !== patchId);
    setUserPresets(next);
    try {
      localStorage.setItem(USER_PRESETS_STORAGE_KEY, JSON.stringify(next));
    } catch {}
    showToast(`Deleted "${patchName}"`);
  };

  // Export Single Preset as JSON
  const handleExportPreset = (patch: PresetPatch, e: React.MouseEvent) => {
    e.stopPropagation();
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(patch, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Subtractive_Patch_${patch.name.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(`Exported "${patch.name}.json"`);
  };

  // Export All User Presets as JSON Backup
  const handleExportAll = () => {
    const exportData = {
      app: 'Subtractive Synthesizer',
      version: '2.0',
      exportDate: new Date().toISOString(),
      userPresets
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Subtractive_UserLibrary_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Exported User Presets Backup!');
  };

  // Import Preset from JSON
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        // Handle both single patch and library backup
        if (parsed.userPresets && Array.isArray(parsed.userPresets)) {
          const validPatches: PresetPatch[] = parsed.userPresets.map((p: any) => ({
            ...p,
            id: p.id || `imported-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            params: patchParams(DEFAULT_SYNTH_PARAMS, p.params || {})
          }));
          const next = [...userPresets, ...validPatches];
          setUserPresets(next);
          localStorage.setItem(USER_PRESETS_STORAGE_KEY, JSON.stringify(next));
          showToast(`Imported ${validPatches.length} presets from backup!`);
        } else if (parsed.name && parsed.params) {
          const importedPatch: PresetPatch = {
            id: parsed.id || `user-imported-${Date.now()}`,
            name: parsed.name,
            category: parsed.category || 'User',
            author: parsed.author || 'Imported',
            description: parsed.description || '',
            tags: parsed.tags || ['imported'],
            params: patchParams(DEFAULT_SYNTH_PARAMS, parsed.params)
          };
          const next = [...userPresets, importedPatch];
          setUserPresets(next);
          localStorage.setItem(USER_PRESETS_STORAGE_KEY, JSON.stringify(next));
          onSelectPreset(importedPatch);
          setSelectedPresetId(importedPatch.id!);
          showToast(`Imported "${importedPatch.name}"!`);
        } else {
          alert('Invalid preset JSON format.');
        }
      } catch (err) {
        alert('Could not parse preset file. Ensure it is valid JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Keyboard Navigation: Esc to close, Arrow keys to navigate
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isSaveModalOpen) {
          setIsSaveModalOpen(false);
        } else {
          onClose();
        }
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (filteredPresets.length === 0) return;
        e.preventDefault();
        const currentIndex = filteredPresets.findIndex(p => (p.id || p.name) === selectedPresetId);
        let nextIndex = 0;
        if (e.key === 'ArrowDown') {
          nextIndex = currentIndex < filteredPresets.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : filteredPresets.length - 1;
        }
        const nextPatch = filteredPresets[nextIndex];
        if (nextPatch) {
          setSelectedPresetId(nextPatch.id || nextPatch.name);
          onSelectPreset(nextPatch);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSaveModalOpen, filteredPresets, selectedPresetId, onSelectPreset, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-6 bg-black/80 backdrop-blur-sm animate-fade-in select-none">
      <div 
        className="synth-panel w-full max-w-5xl h-[90vh] max-h-[850px] flex flex-col rounded-sm overflow-hidden border-2 shadow-2xl relative"
        style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }}
      >
        {/* Screw bolts */}
        <div className="synth-screw absolute top-2 left-2" />
        <div className="synth-screw absolute top-2 right-2" />
        <div className="synth-screw absolute bottom-2 left-2" />
        <div className="synth-screw absolute bottom-2 right-2" />

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: 'var(--section-border)', background: 'var(--section-bg)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-[#00e5ff] text-black font-brand font-black flex items-center justify-center transform skew-x-[-6deg] text-base shadow-[0_0_10px_#00e5ff]">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-brand font-black tracking-widest uppercase text-white">
                  PRESET VAULT
                </h2>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#00e5ff]/10 border border-[#00e5ff]/30 text-[#00e5ff]">
                  {allPresets.length} PATCHES
                </span>
              </div>
              <p className="text-[9px] font-mono text-gray-400">
                Studio Factory Soundbank • User Patches • Lossless Import/Export
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Save Current Patch Button */}
            <button
              onClick={() => setIsSaveModalOpen(true)}
              className="px-2.5 py-1.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff] hover:bg-[#00e5ff]/20 transition-all flex items-center gap-1.5"
            >
              <span>+</span>
              <span>Save Current Patch</span>
            </button>

            {/* Import Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-[#141b28] text-gray-300 border border-[#2b3548] hover:border-[#00e5ff] hover:text-white transition-all flex items-center gap-1"
            >
              <span>📥</span>
              <span>Import</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportFile} 
              accept=".json" 
              className="hidden" 
            />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded text-gray-400 hover:text-white hover:bg-red-500/20 hover:border-red-500 border border-transparent transition-all font-mono text-sm"
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Search & Filter Bar ── */}
        <div className="p-3 border-b flex flex-col md:flex-row items-center justify-between gap-2 shrink-0" style={{ borderColor: 'var(--section-border)' }}>
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patch name, author, tag..."
              className="w-full bg-[#080c14] border border-[#1e2638] focus:border-[#00e5ff] rounded px-3 py-1.5 text-xs font-mono text-[#00e5ff] placeholder-gray-500 outline-none transition-all pr-8"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs font-mono"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            {CATEGORIES.map((category) => {
              const isActive = selectedCategory === category;
              const count = categoryCounts[category] || 0;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider uppercase transition-all whitespace-nowrap flex items-center gap-1 ${
                    isActive
                      ? 'bg-[#00e5ff] text-black shadow-[0_0_8px_#00e5ff]'
                      : 'bg-[#0e131e] text-gray-400 hover:text-gray-200 border border-[#1e2638]'
                  }`}
                >
                  {category === 'Favorites' ? '★ Favs' : category}
                  <span className={`text-[8px] px-1 rounded ${isActive ? 'bg-black/20 text-black' : 'bg-black/40 text-gray-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Main Presets Grid / List ── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 content-start">
          {filteredPresets.length === 0 ? (
            <div className="col-span-full h-48 flex flex-col items-center justify-center text-gray-500 font-mono text-xs">
              <span className="text-2xl mb-2">🔍</span>
              No presets found matching "{searchQuery}" in {selectedCategory}
            </div>
          ) : (
            filteredPresets.map((patch) => {
              const idOrName = patch.id || patch.name;
              const isSelected = idOrName === selectedPresetId || patch.name === currentPresetName;
              const isFav = favorites.has(idOrName);
              const catColor = CATEGORY_COLORS[patch.category] || CATEGORY_COLORS.Basic;
              const isUserPatch = userPresets.some(u => (u.id || u.name) === idOrName);

              return (
                <div
                  key={idOrName}
                  onClick={() => {
                    setSelectedPresetId(idOrName);
                    onSelectPreset(patch);
                  }}
                  className={`p-3 rounded-sm border transition-all cursor-pointer flex flex-col justify-between group relative ${
                    isSelected
                      ? 'bg-[#00e5ff]/10 border-[#00e5ff] shadow-[0_0_12px_rgba(0,229,255,0.25)]'
                      : 'bg-[#0c1018] border-[#1c2436] hover:border-[#00e5ff]/60 hover:bg-[#111722]'
                  }`}
                >
                  {/* Top Row: Name + Favorite + Category Badge */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <button
                        onClick={(e) => toggleFavorite(idOrName, e)}
                        className={`text-sm transition-transform active:scale-125 ${
                          isFav ? 'text-[#ffaa00] drop-shadow-[0_0_6px_#ffaa00]' : 'text-gray-600 hover:text-gray-400'
                        }`}
                        title={isFav ? 'Remove Favorite' : 'Mark Favorite'}
                      >
                        ★
                      </button>
                      <span className={`font-mono text-xs font-bold truncate ${isSelected ? 'text-[#00e5ff]' : 'text-white'}`}>
                        {patch.name}
                      </span>
                    </div>

                    <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${catColor.bg} ${catColor.text} ${catColor.border}`}>
                      {patch.category}
                    </span>
                  </div>

                  {/* Middle Row: Description */}
                  <p className="text-[10px] font-mono text-gray-400 line-clamp-2 mb-2 leading-relaxed">
                    {patch.description || 'Rich analog modeling synthesizer patch.'}
                  </p>

                  {/* Bottom Row: Tags & Actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#182030] text-[8px] font-mono">
                    <div className="flex items-center gap-1 overflow-hidden">
                      <span className="text-gray-500 truncate">{patch.author || 'Subtractive'}</span>
                      {patch.tags?.slice(0, 2).map(tag => (
                        <span key={tag} className="text-gray-400 bg-black/40 px-1 rounded truncate">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      {/* Export button */}
                      <button
                        onClick={(e) => handleExportPreset(patch, e)}
                        className="text-gray-400 hover:text-[#00e5ff] px-1 py-0.5 rounded"
                        title="Export this preset (.json)"
                      >
                        💾
                      </button>

                      {/* Delete button (for user patches) */}
                      {isUserPatch && (
                        <button
                          onClick={(e) => handleDeleteUserPatch(idOrName, patch.name, e)}
                          className="text-gray-500 hover:text-red-400 px-1 py-0.5 rounded"
                          title="Delete user patch"
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer ── */}
        <div className="p-3 border-t flex items-center justify-between shrink-0 text-[10px] font-mono" style={{ borderColor: 'var(--section-border)', background: 'var(--section-bg)' }}>
          <div className="flex items-center gap-4 text-gray-400">
            <span>Showing <b className="text-white">{filteredPresets.length}</b> of {allPresets.length}</span>
            <span className="hidden sm:inline text-gray-600">•</span>
            <span className="hidden sm:inline">Use <kbd className="bg-black/40 px-1 rounded text-[#00e5ff]">↑</kbd> <kbd className="bg-black/40 px-1 rounded text-[#00e5ff]">↓</kbd> to audition patches</span>
          </div>

          <div className="flex items-center gap-2">
            {userPresets.length > 0 && (
              <button
                onClick={handleExportAll}
                className="text-[9px] font-mono text-gray-400 hover:text-[#00e5ff] transition-all"
              >
                📦 Backup User Library ({userPresets.length})
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider bg-[#00e5ff] text-black shadow-[0_0_10px_#00e5ff] hover:opacity-95 transition-all"
            >
              Done
            </button>
          </div>
        </div>

        {/* ── Save Patch Sub-Modal ── */}
        {isSaveModalOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
            <form
              onSubmit={handleSaveUserPatch}
              className="synth-panel max-w-md w-full p-5 rounded-sm border border-[#00e5ff] shadow-2xl relative flex flex-col gap-3"
              style={{ background: 'var(--panel-bg)' }}
            >
              <h3 className="font-brand font-black text-sm tracking-wider uppercase text-white">
                SAVE AS USER PATCH
              </h3>
              <p className="text-[10px] font-mono text-gray-400">
                Store your current dials, envelopes, and master FX rack settings into your custom preset library.
              </p>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-mono uppercase text-gray-400">Patch Name *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="e.g. My Heavy Reese"
                  className="bg-[#080c14] border border-[#1e2638] focus:border-[#00e5ff] rounded px-2.5 py-1.5 text-xs font-mono text-[#00e5ff] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-mono uppercase text-gray-400">Category</label>
                  <select
                    value={saveCategory}
                    onChange={(e) => setSaveCategory(e.target.value)}
                    className="bg-[#080c14] border border-[#1e2638] focus:border-[#00e5ff] rounded px-2 py-1.5 text-xs font-mono text-white outline-none cursor-pointer"
                  >
                    {['Bass', 'Lead', 'Pad', 'Pluck', 'Keys', 'Arp', 'FX', 'User'].map(cat => (
                      <option key={cat} value={cat} className="bg-[#080c14] text-white">{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-mono uppercase text-gray-400">Author</label>
                  <input
                    type="text"
                    value={saveAuthor}
                    onChange={(e) => setSaveAuthor(e.target.value)}
                    placeholder="Your Name"
                    className="bg-[#080c14] border border-[#1e2638] focus:border-[#00e5ff] rounded px-2.5 py-1.5 text-xs font-mono text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-mono uppercase text-gray-400">Description</label>
                <input
                  type="text"
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  placeholder="e.g. Dual saws with heavy drive and sub punch"
                  className="bg-[#080c14] border border-[#1e2638] focus:border-[#00e5ff] rounded px-2.5 py-1.5 text-xs font-mono text-white outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-mono uppercase text-gray-400">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={saveTags}
                  onChange={(e) => setSaveTags(e.target.value)}
                  placeholder="e.g. reese, dnb, heavy, detuned"
                  className="bg-[#080c14] border border-[#1e2638] focus:border-[#00e5ff] rounded px-2.5 py-1.5 text-xs font-mono text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-3 py-1.5 rounded text-xs font-mono text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider bg-[#00e5ff] text-black shadow-[0_0_10px_#00e5ff]"
                >
                  Save Patch
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Toast Notification Banner ── */}
        {notification && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded bg-[#00e5ff] text-black font-mono text-xs font-bold shadow-[0_0_16px_#00e5ff] z-50 animate-bounce">
            {notification}
          </div>
        )}
      </div>
    </div>
  );
};
