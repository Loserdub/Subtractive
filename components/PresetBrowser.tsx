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
  Bass: { bg: 'bg-[var(--signal-soft)]', text: 'text-[var(--signal-ink)]', border: 'border-[var(--signal)]' },
  Lead: { bg: 'bg-[var(--signal-soft)]', text: 'text-[var(--signal-ink)]', border: 'border-[var(--signal)]' },
  Pad: { bg: 'bg-[var(--signal-soft)]', text: 'text-[var(--signal-ink)]', border: 'border-[var(--signal)]' },
  Pluck: { bg: 'bg-[var(--signal-soft)]', text: 'text-[var(--signal-ink)]', border: 'border-[var(--signal)]' },
  Keys: { bg: 'bg-[var(--signal-soft)]', text: 'text-[var(--signal-ink)]', border: 'border-[var(--signal)]' },
  Arp: { bg: 'bg-[var(--signal-soft)]', text: 'text-[var(--signal-ink)]', border: 'border-[var(--signal)]' },
  FX: { bg: 'bg-[var(--signal-soft)]', text: 'text-[var(--signal-ink)]', border: 'border-[var(--signal)]' },
  User: { bg: 'bg-[var(--signal-soft)]', text: 'text-[var(--signal-ink)]', border: 'border-[var(--signal)]' },
  Basic: { bg: 'bg-[var(--section-bg)]', text: 'text-[var(--text-secondary)]', border: 'border-[var(--section-border)]' },
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
  const [isDocked, setIsDocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem('subtractive_vault_docked') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleDock = () => {
    setIsDocked(prev => {
      const next = !prev;
      try {
        localStorage.setItem('subtractive_vault_docked', String(next));
      } catch {}
      return next;
    });
  };
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
    <div 
      className={`fixed z-50 animate-fade-in select-none ${
        isDocked
          ? 'inset-y-0 right-0 w-full sm:w-[500px] xl:w-[580px] bg-[var(--section-bg)] backdrop-blur-xs flex flex-col pointer-events-auto'
          : 'inset-0 flex items-center justify-center p-2 md:p-6 bg-[var(--section-bg)] backdrop-blur-sm'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDocked) onClose();
      }}
    >
      <div 
        className={`synth-panel flex flex-col overflow-hidden relative  ${
          isDocked
            ? 'w-full h-full rounded-none sm:rounded-l-lg border-l border-[var(--section-border)] '
            : 'w-full max-w-5xl h-[90vh] max-h-[850px] rounded-md'
        }`}
      >
        {/* Chassis machine bolts */}
        <div className="synth-screw-chassis absolute top-2 left-2" />
        <div className="synth-screw-chassis absolute top-2 right-2" />
        <div className="synth-screw-chassis absolute bottom-2 left-2" />
        <div className="synth-screw-chassis absolute bottom-2 right-2" />

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b shrink-0 gap-2" style={{ borderColor: 'var(--section-border)', background: 'var(--section-bg)' }}>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-sm bg-[var(--signal)] text-black font-brand font-black flex items-center justify-center transform skew-x-[-6deg] text-sm sm:text-base  shrink-0">
              P
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-xs sm:text-base font-brand font-black tracking-normal uppercase text-[var(--text-primary)] truncate">
                  PRESET VAULT
                </h2>
                <span className="text-[8px] sm:text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--signal-soft)] border border-[var(--signal)] text-[var(--signal-ink)] shrink-0">
                  {allPresets.length} PATCHES
                </span>
              </div>
              <p className="text-[8px] sm:text-[9px] font-mono text-[var(--text-secondary)] hidden sm:block truncate">
                Studio Factory Soundbank • User Patches • Lossless Import/Export
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Dock / Expand Toggle Button (Desktop & Tablet) */}
            <button
              onClick={handleToggleDock}
              className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-normal bg-[var(--panel-bg-alt)] text-[var(--text-primary)] border border-[var(--section-border)] hover:border-[var(--signal)] hover:text-[var(--text-primary)] active:scale-95 transition-all flex items-center gap-1 hidden md:flex"
              title={isDocked ? "Expand to Full Modal Vault" : "Dock to Side Drawer (Live Synth & Audition View)"}
            >
              <span>{isDocked ? '🗖' : '◧'}</span>
              <span className="hidden sm:inline">{isDocked ? 'Full' : 'Dock'}</span>
            </button>

            {/* Save Current Patch Button */}
            <button
              onClick={() => setIsSaveModalOpen(true)}
              className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-normal bg-[var(--signal-soft)] text-[var(--signal-ink)] border border-[var(--signal)] hover:bg-[var(--signal-soft)] active:scale-95 transition-all flex items-center gap-1"
              title="Save current synthesizer parameters as a preset"
            >
              <span>+</span>
              <span className="hidden sm:inline">Save Current Patch</span>
              <span className="sm:hidden">Save</span>
            </button>

            {/* Import Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2 sm:px-2.5 py-1 sm:py-1.5 rounded text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-normal bg-[var(--panel-bg-alt)] text-[var(--text-primary)] border border-[var(--section-border)] hover:border-[var(--signal)] hover:text-[var(--text-primary)] active:scale-95 transition-all flex items-center gap-1"
              title="Import Presets from JSON"
            >
              <span>📥</span>
              <span className="hidden sm:inline">Import</span>
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
              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--signal-soft)] hover:border-[var(--signal)] border border-transparent transition-all font-mono text-sm active:scale-95"
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ── Search & Filter Bar ── */}
        <div className="p-2 sm:p-3 border-b flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 shrink-0" style={{ borderColor: 'var(--section-border)' }}>
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patch name, author, tag..."
              className="w-full bg-[var(--panel-bg-alt)] border border-[var(--section-border)] focus:border-[var(--signal)] rounded px-3 py-1.5 text-xs font-mono text-[var(--signal-ink)] placeholder-gray-500 outline-none transition-all pr-8"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-mono p-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Tabs (Touch-scrollable) */}
          <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none touch-pan-x">
            {CATEGORIES.map((category) => {
              const isActive = selectedCategory === category;
              const count = categoryCounts[category] || 0;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-2.5 py-1 sm:py-1.5 rounded text-[9.5px] sm:text-[10px] font-mono font-bold tracking-normal uppercase transition-all whitespace-nowrap flex items-center gap-1 shrink-0 ${
                    isActive
                      ? 'bg-[var(--signal)] text-black '
                      : 'bg-[var(--panel-bg-alt)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--section-border)]'
                  }`}
                >
                  {category === 'Favorites' ? '★ Favs' : category}
                  <span className={`text-[8px] px-1 rounded ${isActive ? 'bg-[var(--section-bg)] text-black font-black' : 'bg-[var(--section-bg)] text-[var(--text-secondary)]'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Main Presets Grid / List ── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-2.5 sm:p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-2.5 content-start">
          {filteredPresets.length === 0 ? (
            <div className="col-span-full h-48 flex flex-col items-center justify-center text-[var(--text-secondary)] font-mono text-xs">
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
                  className={`p-2.5 sm:p-3 rounded border transition-all cursor-pointer flex flex-col justify-between group relative touch-manipulation select-none ${
                    isSelected
                      ? 'bg-[var(--signal-soft)] border-[var(--signal)]  ring-1 ring-[var(--signal)]'
                      : 'bg-[var(--panel-bg-alt)] border-[var(--section-border)] hover:border-[var(--signal)] hover:bg-[var(--panel-bg-alt)]'
                  }`}
                >
                  {/* Top Row: Favorite + Name + Category Badge + Active Indicator */}
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(idOrName, e)}
                        className={`w-6 h-6 flex items-center justify-center rounded text-sm transition-transform active:scale-125 touch-manipulation shrink-0 ${
                          isFav ? 'text-[var(--signal-ink)] ' : 'text-[var(--text-secondary)] hover:text-[var(--text-secondary)]'
                        }`}
                        title={isFav ? 'Remove Favorite' : 'Mark Favorite'}
                      >
                        ★
                      </button>
                      <span className={`font-mono text-xs sm:text-sm font-bold truncate ${isSelected ? 'text-[var(--signal-ink)]' : 'text-[var(--text-primary)]'}`}>
                        {patch.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {isSelected ? (
                        <span className="text-[7.5px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-[var(--signal)] text-black  flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
                          ACTIVE
                        </span>
                      ) : (
                        <span className="hidden sm:inline text-[7px] font-mono font-bold uppercase px-1.5 py-0.5 rounded text-[var(--text-secondary)] bg-[var(--section-bg)] border border-[var(--section-border)] group-hover:text-[var(--signal-ink)] group-hover:border-[var(--signal)] transition-colors">
                          LOAD ▶
                        </span>
                      )}
                      <span className={`text-[7.5px] sm:text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${catColor.bg} ${catColor.text} ${catColor.border}`}>
                        {patch.category}
                      </span>
                    </div>
                  </div>

                  {/* Middle Row: Description */}
                  <p className="text-[9.5px] sm:text-[10px] font-mono text-[var(--text-secondary)] line-clamp-2 mb-2 leading-relaxed">
                    {patch.description || 'Rich analog modeling synthesizer patch.'}
                  </p>

                  {/* Bottom Row: Tags & Actions */}
                  <div className="flex items-center justify-between pt-1 border-t border-[var(--section-border)] text-[8px] font-mono">
                    <div className="flex items-center gap-1 overflow-hidden">
                      <span className="text-[var(--text-secondary)] truncate">{patch.author || 'Subtractive'}</span>
                      {patch.tags?.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[var(--text-secondary)] bg-[var(--section-bg)] px-1 rounded truncate">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      {/* Export button */}
                      <button
                        onClick={(e) => handleExportPreset(patch, e)}
                        className="text-[var(--text-secondary)] hover:text-[var(--signal-ink)] px-1 py-0.5 rounded"
                        title="Export this preset (.json)"
                      >
                        💾
                      </button>

                      {/* Delete button (for user patches) */}
                      {isUserPatch && (
                        <button
                          onClick={(e) => handleDeleteUserPatch(idOrName, patch.name, e)}
                          className="text-[var(--text-secondary)] hover:text-[var(--signal-ink)] px-1 py-0.5 rounded"
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
        <div className="p-2.5 sm:p-3 border-t flex items-center justify-between shrink-0 text-[9.5px] sm:text-[10px] font-mono gap-2" style={{ borderColor: 'var(--section-border)', background: 'var(--section-bg)' }}>
          <div className="flex items-center gap-3 text-[var(--text-secondary)] min-w-0">
            <span className="truncate">Showing <b className="text-[var(--text-primary)]">{filteredPresets.length}</b> of {allPresets.length}</span>
            <span className="hidden md:inline text-[var(--text-secondary)]">•</span>
            <span className="hidden md:inline">Use <kbd className="bg-[var(--section-bg)] px-1 rounded text-[var(--signal-ink)]">↑</kbd> <kbd className="bg-[var(--section-bg)] px-1 rounded text-[var(--signal-ink)]">↓</kbd> to audition patches</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {userPresets.length > 0 && (
              <button
                onClick={handleExportAll}
                className="hidden sm:inline text-[9px] font-mono text-[var(--text-secondary)] hover:text-[var(--signal-ink)] transition-all"
              >
                📦 Backup User Library ({userPresets.length})
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 sm:px-5 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-normal bg-[var(--signal)] text-black  hover:opacity-95 active:scale-95 transition-all"
            >
              Done
            </button>
          </div>
        </div>

        {/* ── Save Patch Sub-Modal ── */}
        {isSaveModalOpen && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-[var(--section-bg)] backdrop-blur-sm animate-fade-in">
            <form
              onSubmit={handleSaveUserPatch}
              className="synth-panel max-w-md w-full p-5 rounded-sm border border-[var(--signal)]  relative flex flex-col gap-3"
              style={{ background: 'var(--panel-bg)' }}
            >
              <h3 className="font-brand font-black text-sm tracking-normal uppercase text-[var(--text-primary)]">
                SAVE AS USER PATCH
              </h3>
              <p className="text-[10px] font-mono text-[var(--text-secondary)]">
                Store your current dials, envelopes, and master FX rack settings into your custom preset library.
              </p>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-mono uppercase text-[var(--text-secondary)]">Patch Name *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="e.g. My Heavy Reese"
                  className="bg-[var(--panel-bg-alt)] border border-[var(--section-border)] focus:border-[var(--signal)] rounded px-2.5 py-1.5 text-xs font-mono text-[var(--signal-ink)] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-mono uppercase text-[var(--text-secondary)]">Category</label>
                  <select
                    value={saveCategory}
                    onChange={(e) => setSaveCategory(e.target.value)}
                    className="bg-[var(--panel-bg-alt)] border border-[var(--section-border)] focus:border-[var(--signal)] rounded px-2 py-1.5 text-xs font-mono text-[var(--text-primary)] outline-none cursor-pointer"
                  >
                    {['Bass', 'Lead', 'Pad', 'Pluck', 'Keys', 'Arp', 'FX', 'User'].map(cat => (
                      <option key={cat} value={cat} className="bg-[var(--panel-bg-alt)] text-[var(--text-primary)]">{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-mono uppercase text-[var(--text-secondary)]">Author</label>
                  <input
                    type="text"
                    value={saveAuthor}
                    onChange={(e) => setSaveAuthor(e.target.value)}
                    placeholder="Your Name"
                    className="bg-[var(--panel-bg-alt)] border border-[var(--section-border)] focus:border-[var(--signal)] rounded px-2.5 py-1.5 text-xs font-mono text-[var(--text-primary)] outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-mono uppercase text-[var(--text-secondary)]">Description</label>
                <input
                  type="text"
                  value={saveDescription}
                  onChange={(e) => setSaveDescription(e.target.value)}
                  placeholder="e.g. Dual saws with heavy drive and sub punch"
                  className="bg-[var(--panel-bg-alt)] border border-[var(--section-border)] focus:border-[var(--signal)] rounded px-2.5 py-1.5 text-xs font-mono text-[var(--text-primary)] outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-mono uppercase text-[var(--text-secondary)]">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={saveTags}
                  onChange={(e) => setSaveTags(e.target.value)}
                  placeholder="e.g. reese, dnb, heavy, detuned"
                  className="bg-[var(--panel-bg-alt)] border border-[var(--section-border)] focus:border-[var(--signal)] rounded px-2.5 py-1.5 text-xs font-mono text-[var(--text-primary)] outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsSaveModalOpen(false)}
                  className="px-3 py-1.5 rounded text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-normal bg-[var(--signal)] text-black "
                >
                  Save Patch
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Toast Notification Banner ── */}
        {notification && (
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded bg-[var(--signal)] text-black font-mono text-xs font-bold  z-50 animate-bounce">
            {notification}
          </div>
        )}
      </div>
    </div>
  );
};
