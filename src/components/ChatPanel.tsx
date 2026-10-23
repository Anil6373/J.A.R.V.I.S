/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Square, Terminal, ShieldCheck, Sparkles, Wrench } from 'lucide-react';
import { ChatMessage, AssistantState } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  assistantState: AssistantState;
  onSendMessage: (msg: string) => void;
  onToggleMic: () => void;
  onStopSpeech: () => void;
  toolsEnabled: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  assistantState,
  onSendMessage,
  onToggleMic,
  onStopSpeech,
  toolsEnabled,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, assistantState]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || assistantState === 'processing') return;
    onSendMessage(input);
    setInput('');
  };

  const sampleDirectives = [
    'System diagnostic check',
    'Open Calculator',
    'Open Notepad',
    'Remember I prefer dark theme and concise code',
    'What time is it in London and New York?',
    'Search local notes',
  ];

  return (
    <div className="flex flex-col h-full bg-slate-950/70 border border-cyan-500/20 rounded-xl overflow-hidden backdrop-blur-md shadow-2xl">
      {/* Header Bar */}
      <div className="px-4 py-3 border-b border-cyan-500/20 bg-slate-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span className="font-mono text-xs tracking-wider text-cyan-300 font-bold">
            COMMUNICATION PROTOCOL
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className={`w-3.5 h-3.5 ${toolsEnabled ? 'text-cyan-400' : 'text-amber-400'}`} />
            {toolsEnabled ? 'TOOLS ARMED' : 'TOOLS PAUSED'}
          </span>
          <span className="text-cyan-800">·</span>
          <span className="text-cyan-600">ENCRYPTION ACTIVE</span>
        </div>
      </div>

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="w-12 h-12 rounded-full border border-cyan-500/30 bg-cyan-950/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="text-cyan-300 font-bold text-sm tracking-wide">J.A.R.V.I.S. ONLINE</div>
              <p className="text-slate-400 text-xs mt-1 max-w-sm">
                Standing by, Sir. You may speak naturally via microphone or input instructions below.
              </p>
            </div>

            {/* Quick Directive Chips */}
            <div className="w-full max-w-md pt-2">
              <div className="text-[10px] text-cyan-600 uppercase tracking-wider mb-2 font-semibold">Suggested Directives</div>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {sampleDirectives.map((d, i) => (
                  <button
                    key={i}
                    onClick={() => onSendMessage(d)}
                    className="px-2.5 py-1 rounded bg-slate-900/80 border border-cyan-500/20 text-cyan-300/80 hover:text-cyan-200 hover:border-cyan-400 text-[11px] transition-colors"
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="text-[10px] text-slate-500 mb-1 flex items-center gap-2">
                <span className="font-semibold text-cyan-400/80">{m.role === 'user' ? 'STARK' : 'J.A.R.V.I.S.'}</span>
                <span>·</span>
                <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>

              <div
                className={`max-w-[88%] p-3.5 rounded-lg leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-cyan-950/40 border border-cyan-500/40 text-cyan-100 rounded-tr-none'
                    : 'bg-slate-900/90 border border-cyan-500/20 text-slate-200 rounded-tl-none shadow-md'
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>

                {/* Tool Invocations Badge List */}
                {m.tools_used && m.tools_used.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-cyan-500/20 space-y-1.5">
                    <div className="text-[10px] text-cyan-500 font-semibold flex items-center gap-1 uppercase tracking-wider">
                      <Wrench className="w-3 h-3" /> Executed System Actions
                    </div>
                    {m.tools_used.map((t, tIdx) => (
                      <div
                        key={tIdx}
                        className="p-2 rounded bg-slate-950/80 border border-cyan-500/30 text-[11px]"
                      >
                        <div className="flex items-center justify-between text-cyan-300 font-bold">
                          <span>&gt; {t.name}</span>
                          <span className={t.result?.success ? 'text-emerald-400 text-[10px]' : 'text-rose-400 text-[10px]'}>
                            {t.result?.success ? 'SUCCESS' : 'FAILED'}
                          </span>
                        </div>
                        {t.args && Object.keys(t.args).length > 0 && (
                          <div className="text-slate-400 text-[10px] mt-0.5 font-mono truncate">
                            Args: {JSON.stringify(t.args)}
                          </div>
                        )}
                        {t.result?.message && (
                          <div className="text-slate-300 text-[10px] mt-0.5">
                            {t.result.message}
                          </div>
                        )}
                        {t.result?.error && (
                          <div className="text-rose-300 text-[10px] mt-0.5">
                            Error: {t.result.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {assistantState === 'processing' && (
          <div className="flex items-center gap-2 p-2 text-cyan-400 text-xs animate-pulse">
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span>JARVIS is synthesizing response and checking tool operations...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Console */}
      <form onSubmit={handleSubmit} className="p-3 bg-slate-900/70 border-t border-cyan-500/20 flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleMic}
          className={`p-2.5 rounded-lg border transition-all ${
            assistantState === 'listening'
              ? 'bg-rose-950/70 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.6)] animate-pulse'
              : 'bg-slate-900 border-cyan-500/30 text-cyan-400 hover:border-cyan-400 hover:bg-cyan-950/40'
          }`}
          title={assistantState === 'listening' ? 'Click to stop listening' : 'Click to start voice recognition'}
        >
          {assistantState === 'listening' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {assistantState === 'speaking' && (
          <button
            type="button"
            onClick={onStopSpeech}
            className="p-2.5 rounded-lg bg-amber-950/70 border border-amber-500 text-amber-300 hover:bg-amber-900/60"
            title="Interrupt speech vocalization"
          >
            <Square className="w-4 h-4" />
          </button>
        )}

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={assistantState === 'listening' ? 'Listening to speech...' : 'Input directive for JARVIS (or press microphone)...'}
          className="flex-1 bg-slate-950 border border-cyan-500/30 rounded-lg px-4 py-2 font-mono text-xs text-cyan-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
        />

        <button
          type="submit"
          disabled={!input.trim() || assistantState === 'processing'}
          className="p-2.5 rounded-lg bg-cyan-500/20 border border-cyan-400 text-cyan-300 hover:bg-cyan-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          title="Transmit directive"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
