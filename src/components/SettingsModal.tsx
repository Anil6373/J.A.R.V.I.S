/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Shield, Cpu, Volume2, Mic, Trash2, Check, RefreshCw, FolderLock } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentModel: string;
  onSelectModel: (model: string) => void;
  toolsEnabled: boolean;
  onToggleTools: (enabled: boolean) => void;
  wakeWordEnabled: boolean;
  onToggleWakeWord: (enabled: boolean) => void;
  availableVoices: SpeechSynthesisVoice[];
  selectedVoiceName: string;
  onSelectVoice: (name: string) => void;
  speechRate: number;
  onChangeSpeechRate: (rate: number) => void;
  onClearHistory: () => Promise<void>;
  onPurgeMemories: () => Promise<void>;
  geminiConnected: boolean;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentModel,
  onSelectModel,
  toolsEnabled,
  onToggleTools,
  wakeWordEnabled,
  onToggleWakeWord,
  availableVoices,
  selectedVoiceName,
  onSelectVoice,
  speechRate,
  onChangeSpeechRate,
  onClearHistory,
  onPurgeMemories,
  geminiConnected,
}) => {
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [clearingHistory, setClearingHistory] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-cyan-500/40 rounded-xl overflow-hidden shadow-2xl font-mono text-xs text-cyan-100 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-cyan-500/30 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="font-bold tracking-wider text-cyan-300">
              JARVIS CORE CONFIGURATION & SECURITY
            </span>
          </div>
          <button onClick={onClose} className="p-1 hover:text-cyan-300 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Gemini Cognitive Core Status */}
          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-cyan-500/30 flex items-center justify-between">
            <div>
              <div className="font-bold text-cyan-200 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                GEMINI COGNITIVE CORE
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Managed via server-side Google Gen AI SDK
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  geminiConnected ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400'
                }`}
              />
              <span className="font-bold text-[11px] text-emerald-300">
                {geminiConnected ? 'ACTIVE / SECURED' : 'CONNECTING'}
              </span>
            </div>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="font-bold text-cyan-300 flex items-center gap-2">
              REASONING MODEL
            </label>
            <select
              value={currentModel}
              onChange={(e) => onSelectModel(e.target.value)}
              className="w-full bg-slate-950 border border-cyan-500/30 rounded p-2.5 text-cyan-100 focus:outline-none focus:border-cyan-400"
            >
              <option value="gemini-3.8-flash">gemini-3.8-flash (Recommended: Low-latency & Function Tools)</option>
              <option value="gemini-2.5-flash">gemini-2.5-flash (Balanced Reasoning)</option>
              <option value="gemini-2.0-flash">gemini-2.0-flash (General Purpose)</option>
            </select>
          </div>

          {/* Voice Synthesizer Configuration */}
          <div className="space-y-3 p-3.5 rounded-lg bg-slate-950/80 border border-cyan-500/30">
            <div className="font-bold text-cyan-300 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              VOCAL SYNTHESIS ENGINE
            </div>

            {availableVoices.length > 0 && (
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">SELECT SYNTHESIZER VOICE</label>
                <select
                  value={selectedVoiceName}
                  onChange={(e) => onSelectVoice(e.target.value)}
                  className="w-full bg-slate-900 border border-cyan-500/30 rounded p-2 text-cyan-100 text-xs"
                >
                  {availableVoices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>SPEECH TEMPO (RATE)</span>
                <span className="font-bold text-cyan-300">{speechRate.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.4"
                step="0.05"
                value={speechRate}
                onChange={(e) => onChangeSpeechRate(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Wake Word Activation */}
          <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-950/80 border border-cyan-500/30">
            <div>
              <div className="font-bold text-cyan-200 flex items-center gap-2">
                <Mic className="w-4 h-4 text-cyan-400" />
                WAKE-WORD DETECTION ("Hey JARVIS")
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Listens continuously for vocal invocation phrase
              </div>
            </div>
            <button
              onClick={() => onToggleWakeWord(!wakeWordEnabled)}
              className={`px-3 py-1.5 rounded border text-[11px] font-bold transition-colors ${
                wakeWordEnabled
                  ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              {wakeWordEnabled ? 'ACTIVE' : 'STANDBY'}
            </button>
          </div>

          {/* Master Tool Privileges */}
          <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-950/80 border border-cyan-500/30">
            <div>
              <div className="font-bold text-cyan-200 flex items-center gap-2">
                <FolderLock className="w-4 h-4 text-cyan-400" />
                WINDOWS TOOL PRIVILEGES
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Master killswitch for application launching & file access
              </div>
            </div>
            <button
              onClick={() => onToggleTools(!toolsEnabled)}
              className={`px-3 py-1.5 rounded border text-[11px] font-bold transition-colors ${
                toolsEnabled
                  ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-500 text-rose-300'
              }`}
            >
              {toolsEnabled ? 'AUTHORIZED' : 'LOCKED'}
            </button>
          </div>

          {/* Memory & History Management */}
          <div className="pt-3 border-t border-cyan-900/40 space-y-3">
            <div className="font-bold text-cyan-300">DATA & SESSIONS</div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={async () => {
                  setClearingHistory(true);
                  await onClearHistory();
                  setClearingHistory(false);
                }}
                disabled={clearingHistory}
                className="py-2.5 px-3 rounded bg-slate-950 border border-cyan-500/30 text-cyan-300 hover:border-cyan-400 hover:bg-slate-900 transition-colors flex items-center justify-center gap-2 font-semibold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${clearingHistory ? 'animate-spin' : ''}`} />
                CLEAR SESSION
              </button>

              {!confirmPurge ? (
                <button
                  onClick={() => setConfirmPurge(true)}
                  className="py-2.5 px-3 rounded bg-rose-950/40 border border-rose-500/50 text-rose-300 hover:bg-rose-900/40 transition-colors flex items-center justify-center gap-2 font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  PURGE MEMORY
                </button>
              ) : (
                <button
                  onClick={async () => {
                    await onPurgeMemories();
                    setConfirmPurge(false);
                  }}
                  className="py-2.5 px-3 rounded bg-rose-600 border border-rose-400 text-white font-bold transition-colors"
                >
                  CONFIRM PURGE
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
