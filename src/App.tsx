/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ArcReactor } from './components/ArcReactor';
import { AudioVisualizer } from './components/AudioVisualizer';
import { SystemTelemetry } from './components/SystemTelemetry';
import { ChatPanel } from './components/ChatPanel';
import { MemoryDrawer } from './components/MemoryDrawer';
import { ActionLogModal } from './components/ActionLogModal';
import { SettingsModal } from './components/SettingsModal';
import { useVoiceEngine } from './hooks/useVoiceEngine';
import { useSystemStats } from './hooks/useSystemStats';
import { AssistantState, ChatMessage, MemoryItem, ActionLogItem, ServerStatus } from './types';
import {
  Volume2,
  VolumeX,
  Brain,
  ShieldCheck,
  Settings,
  Calculator,
  FileText,
  Folder,
  Globe,
  Activity,
  Terminal,
} from 'lucide-react';

export default function App() {
  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [actionLogs, setActionLogs] = useState<ActionLogItem[]>([]);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);

  // Modals & Panels state
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Settings
  const [currentModel, setCurrentModel] = useState('gemini-3.8-flash');
  const [toolsEnabled, setToolsEnabled] = useState(true);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false);

  // System statistics hook
  const { stats, refetch: refetchStats } = useSystemStats(3000);

  // Forward declaration of handleSendMessage
  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setAssistantState('processing');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: 'default' }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.reply || 'Directive acknowledged, sir.',
        timestamp: new Date().toISOString(),
        tools_used: data.tools_used,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      speak(assistantMsg.content);

      // Refresh memories and action logs if tools were executed
      if (data.tools_used && data.tools_used.length > 0) {
        fetchMemories();
        fetchActionLogs();
        refetchStats();
      }
    } catch (err: any) {
      setAssistantState('error');
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sir, an interruption occurred within my communication relay. Please check the network or server logs.',
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, [refetchStats]);

  // Voice engine hook
  const {
    speak,
    stopSpeech,
    toggleListening,
    availableVoices,
    selectedVoiceName,
    setSelectedVoiceName,
    speechRate,
    setSpeechRate,
    isMuted,
    setIsMuted,
    audioEnergy,
  } = useVoiceEngine({
    onTranscript: (transcript) => handleSendMessage(transcript),
    onStateChange: (state) => setAssistantState(state),
    wakeWordEnabled,
  });

  // Fetch initial data
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data: ServerStatus = await res.json();
        setServerStatus(data);
        setCurrentModel(data.model);
        setToolsEnabled(data.tools_enabled);
      }
    } catch {}
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/chat/history');
      if (res.ok) {
        const data = await res.json();
        if (data.history && data.history.length > 0) {
          setMessages(
            data.history.map((h: any) => ({
              role: h.role,
              content: h.content,
              timestamp: h.timestamp,
            }))
          );
        }
      }
    } catch {}
  };

  const fetchMemories = async () => {
    try {
      const res = await fetch('/api/memories');
      if (res.ok) {
        const data = await res.json();
        setMemories(data.memories || []);
      }
    } catch {}
  };

  const fetchActionLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        const data = await res.json();
        setActionLogs(data.logs || []);
      }
    } catch {}
  };

  useEffect(() => {
    fetchStatus();
    fetchHistory();
    fetchMemories();
    fetchActionLogs();
  }, []);

  // Quick Action Launcher
  const handleQuickTool = async (toolName: string, args: Record<string, any>) => {
    setAssistantState('processing');
    try {
      const res = await fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: toolName, arguments: args }),
      });
      const data = await res.json();
      const reply = data.message || (data.success ? `Executed ${toolName} successfully.` : `Failed: ${data.error}`);

      setMessages((prev) => [
        ...prev,
        {
          role: 'user',
          content: `Launch quick action: ${toolName}`,
          timestamp: new Date().toISOString(),
        },
        {
          role: 'assistant',
          content: reply,
          timestamp: new Date().toISOString(),
          tools_used: [{ name: toolName, args, result: data }],
        },
      ]);
      speak(reply);
      fetchActionLogs();
      refetchStats();
    } catch (e: any) {
      setAssistantState('error');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#030712] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200 overflow-hidden relative">
      {/* Subtle Background Radial Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.07] pointer-events-none" />

      {/* Top Bar Contract: Zone 1 (Wordmark) — Zone 2 (Clean single-line links) — Zone 3 (Primary action) */}
      <header className="h-14 border-b border-cyan-500/20 bg-slate-950/85 backdrop-blur-md px-6 flex items-center justify-between gap-8 z-20 shrink-0">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse" />
          <span className="font-mono text-sm tracking-wider font-extrabold text-cyan-300">
            PROJECT J.A.R.V.I.S.
          </span>
          <span className="text-[10px] font-mono text-cyan-500 border border-cyan-500/30 px-1.5 py-0.5 rounded bg-cyan-950/30">
            WINDOWS OS v2.5
          </span>
        </div>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 font-mono text-xs text-slate-400">
          <button
            onClick={() => setIsMemoryOpen(true)}
            className="hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <Brain className="w-3.5 h-3.5 text-cyan-400" />
            <span>NEURAL MEMORY ({memories.length})</span>
          </button>

          <button
            onClick={() => setIsLogsOpen(true)}
            className="hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>SECURITY AUDIT</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5 text-cyan-400" />
            <span>CORE SETTINGS</span>
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-medium transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              isMuted
                ? 'bg-rose-950/50 border-rose-500 text-rose-300'
                : 'bg-cyan-500/10 border-cyan-400/40 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400'
            }`}
            title="Toggle speech synthesis vocalization"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{isMuted ? 'AUDIO MUTED' : 'VOICE ARMED'}</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 overflow-hidden z-10">
        {/* Left Column (5 Cols): Holographic Arc Reactor, Audio Spectrum & Real Hardware Telemetry */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-3.5 h-full overflow-y-auto pr-0.5">
          {/* Arc Reactor & Audio Waveform Panel */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-950/70 rounded-xl border border-cyan-500/20 backdrop-blur-md relative overflow-hidden shadow-xl min-h-[310px]">
            {/* Corner Decorative Tech Markers */}
            <div className="absolute top-2 left-2 text-[9px] font-mono text-cyan-800">ARC-01 // COG.CORE</div>
            <div className="absolute top-2 right-2 text-[9px] font-mono text-cyan-800">
              {wakeWordEnabled ? 'WAKE: READY' : 'WAKE: OFF'}
            </div>
            <div className="absolute bottom-2 left-2 text-[9px] font-mono text-cyan-800">SYSTEM STABLE</div>
            <div className="absolute bottom-2 right-2 text-[9px] font-mono text-cyan-800">
              MODEL: {currentModel.replace('gemini-', '')}
            </div>

            <ArcReactor
              state={assistantState}
              onClick={toggleListening}
              audioLevel={audioEnergy}
            />

            <AudioVisualizer state={assistantState} audioEnergy={audioEnergy} />
          </div>

          {/* Quick Windows Computer Control Toolbar */}
          <div className="p-3 bg-slate-950/70 rounded-xl border border-cyan-500/20 backdrop-blur-md">
            <div className="text-[10px] font-mono font-bold text-cyan-400 mb-2 flex items-center justify-between uppercase tracking-wider">
              <span>APPROVED WINDOWS WORKSPACE LAUNCHERS</span>
              <span className={toolsEnabled ? 'text-emerald-400' : 'text-rose-400'}>
                {toolsEnabled ? 'ALLOWLIST ENABLED' : 'RESTRICTED'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 font-mono text-xs">
              <button
                onClick={() => handleQuickTool('open_application', { app_name: 'calculator' })}
                disabled={!toolsEnabled}
                className="p-2 rounded bg-slate-900 border border-cyan-500/20 hover:border-cyan-400 text-cyan-300 flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-40"
                title="Launch Windows Calculator"
              >
                <Calculator className="w-4 h-4 text-cyan-400" />
                <span className="text-[10px]">CALC</span>
              </button>

              <button
                onClick={() => handleQuickTool('open_application', { app_name: 'notepad' })}
                disabled={!toolsEnabled}
                className="p-2 rounded bg-slate-900 border border-cyan-500/20 hover:border-cyan-400 text-cyan-300 flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-40"
                title="Launch Windows Notepad"
              >
                <FileText className="w-4 h-4 text-cyan-400" />
                <span className="text-[10px]">NOTEPAD</span>
              </button>

              <button
                onClick={() => handleQuickTool('open_application', { app_name: 'explorer' })}
                disabled={!toolsEnabled}
                className="p-2 rounded bg-slate-900 border border-cyan-500/20 hover:border-cyan-400 text-cyan-300 flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-40"
                title="Open Windows File Explorer"
              >
                <Folder className="w-4 h-4 text-cyan-400" />
                <span className="text-[10px]">FILES</span>
              </button>

              <button
                onClick={() => handleQuickTool('open_website', { url: 'https://google.com' })}
                disabled={!toolsEnabled}
                className="p-2 rounded bg-slate-900 border border-cyan-500/20 hover:border-cyan-400 text-cyan-300 flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-40"
                title="Open Web Browser"
              >
                <Globe className="w-4 h-4 text-cyan-400" />
                <span className="text-[10px]">BROWSER</span>
              </button>
            </div>
          </div>

          {/* Real System Telemetry Gauges */}
          <SystemTelemetry stats={stats} />
        </div>

        {/* Right Column (7 Cols): Communication Terminal */}
        <div className="lg:col-span-7 h-full">
          <ChatPanel
            messages={messages}
            assistantState={assistantState}
            onSendMessage={handleSendMessage}
            onToggleMic={toggleListening}
            onStopSpeech={stopSpeech}
            toolsEnabled={toolsEnabled}
          />
        </div>
      </main>

      {/* Persistent Neural Memory Drawer */}
      <MemoryDrawer
        isOpen={isMemoryOpen}
        onClose={() => setIsMemoryOpen(false)}
        memories={memories}
        onAddMemory={async (category, key, value) => {
          const res = await fetch('/api/memories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category, key, value }),
          });
          if (res.ok) fetchMemories();
        }}
        onDeleteMemory={async (id) => {
          const res = await fetch(`/api/memories/${id}`, { method: 'DELETE' });
          if (res.ok) fetchMemories();
        }}
      />

      {/* Security Audit Log Modal */}
      <ActionLogModal
        isOpen={isLogsOpen}
        onClose={() => setIsLogsOpen(false)}
        logs={actionLogs}
      />

      {/* Core Configuration & Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentModel={currentModel}
        onSelectModel={async (m) => {
          setCurrentModel(m);
          await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: m }),
          });
        }}
        toolsEnabled={toolsEnabled}
        onToggleTools={async (enabled) => {
          setToolsEnabled(enabled);
          await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tools_enabled: enabled }),
          });
        }}
        wakeWordEnabled={wakeWordEnabled}
        onToggleWakeWord={(enabled) => setWakeWordEnabled(enabled)}
        availableVoices={availableVoices}
        selectedVoiceName={selectedVoiceName}
        onSelectVoice={(vName) => setSelectedVoiceName(vName)}
        speechRate={speechRate}
        onChangeSpeechRate={(rate) => setSpeechRate(rate)}
        onClearHistory={async () => {
          await fetch('/api/chat/clear', { method: 'POST' });
          setMessages([]);
        }}
        onPurgeMemories={async () => {
          await fetch('/api/memories/clear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ confirmed: true }),
          });
          fetchMemories();
        }}
        geminiConnected={Boolean(serverStatus?.gemini_connected)}
      />
    </div>
  );
}
