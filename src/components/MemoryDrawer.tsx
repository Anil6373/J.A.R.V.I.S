/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Search, Trash2, Plus, Brain, Shield, Lock } from 'lucide-react';
import { MemoryItem } from '../types';

interface MemoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  memories: MemoryItem[];
  onAddMemory: (category: MemoryItem['category'], key: string, value: string) => Promise<void>;
  onDeleteMemory: (id: number) => Promise<void>;
}

export const MemoryDrawer: React.FC<MemoryDrawerProps> = ({
  isOpen,
  onClose,
  memories,
  onAddMemory,
  onDeleteMemory,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryItem['category']>('preference');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const filtered = memories.filter((m) => {
    const matchesSearch =
      m.key.toLowerCase().includes(search.toLowerCase()) ||
      m.value.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;
    setSubmitting(true);
    try {
      await onAddMemory(newCategory, newKey, newValue);
      setNewKey('');
      setNewValue('');
      setIsAdding(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-slate-950/95 border-l border-cyan-500/30 backdrop-blur-2xl p-5 flex flex-col font-mono text-xs shadow-2xl">
      {/* Drawer Header */}
      <div className="flex items-center justify-between pb-4 border-b border-cyan-500/20">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-cyan-300 tracking-wider">
            PERSISTENT NEURAL MEMORY
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-slate-900 text-slate-400 hover:text-cyan-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Privacy Guarantee Banner */}
      <div className="my-3 p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-cyan-400 flex items-start gap-2">
        <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-[10px] leading-tight text-slate-300">
          <strong className="text-cyan-300">Air-Gapped Local Storage:</strong> All memories and preferences are stored exclusively on your host machine. JARVIS retrieves and passes only relevant facts to Gemini.
        </div>
      </div>

      {/* Search Bar & Add Button */}
      <div className="flex items-center gap-2 my-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search memories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-cyan-500/20 rounded pl-8 pr-3 py-1.5 text-cyan-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-3 py-1.5 rounded bg-cyan-500/20 border border-cyan-400 text-cyan-300 hover:bg-cyan-500/30 flex items-center gap-1 font-semibold"
        >
          <Plus className="w-3.5 h-3.5" /> ADD
        </button>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1 my-2 overflow-x-auto pb-1 text-[10px]">
        {['all', 'preference', 'fact', 'identity', 'project'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-2.5 py-1 rounded transition-colors uppercase whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-cyan-500/30 text-cyan-200 border border-cyan-400 font-bold'
                : 'bg-slate-900 text-slate-400 border border-transparent hover:text-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Add Memory Inline Form */}
      {isAdding && (
        <form onSubmit={handleAddSubmit} className="my-2 p-3 rounded-lg bg-slate-900 border border-cyan-500/40 space-y-2">
          <div className="font-bold text-cyan-300 text-[11px]">ARCHIVE NEW MEMORY</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">CATEGORY</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-cyan-500/30 rounded p-1 text-cyan-200 text-xs"
              >
                <option value="preference">Preference</option>
                <option value="fact">Fact</option>
                <option value="identity">Identity</option>
                <option value="project">Project</option>
                <option value="general">General</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">LABEL / KEY</label>
              <input
                type="text"
                placeholder="e.g., wake_time"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="w-full bg-slate-950 border border-cyan-500/30 rounded px-2 py-1 text-cyan-200 text-xs"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">VALUE / CONTENT</label>
            <textarea
              rows={2}
              placeholder="e.g., Prefers technical briefings at 07:00 AM."
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="w-full bg-slate-950 border border-cyan-500/30 rounded p-1.5 text-cyan-200 text-xs"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-2.5 py-1 text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !newKey.trim() || !newValue.trim()}
              className="px-3 py-1 bg-cyan-600 border border-cyan-400 rounded text-slate-950 font-bold hover:bg-cyan-500 disabled:opacity-40"
            >
              Archive
            </button>
          </div>
        </form>
      )}

      {/* Memory List */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 mt-2">
        {filtered.length === 0 ? (
          <div className="text-center text-slate-500 py-12">
            NO MATCHING MEMORIES LOCATED
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-lg bg-slate-900/80 border border-cyan-500/20 hover:border-cyan-400/50 transition-all flex items-start justify-between gap-3 group"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                    {item.category}
                  </span>
                  <span className="font-bold text-cyan-200">{item.key}</span>
                </div>
                <div className="text-slate-300 leading-relaxed text-[11px]">{item.value}</div>
                <div className="text-[9px] text-slate-500">
                  Updated {new Date(item.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => onDeleteMemory(item.id)}
                className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-300 p-1 transition-opacity"
                title="Erase memory item"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
