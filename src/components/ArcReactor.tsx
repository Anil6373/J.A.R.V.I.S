/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AssistantState } from '../types';

interface ArcReactorProps {
  state: AssistantState;
  onClick?: () => void;
  audioLevel?: number; // 0 to 1
}

export const ArcReactor: React.FC<ArcReactorProps> = ({ state, onClick, audioLevel = 0 }) => {
  const getStateConfig = () => {
    switch (state) {
      case 'listening':
        return {
          glow: 'rgba(6, 182, 212, 0.85)',
          outerRing: 'border-cyan-400',
          middleRing: 'border-cyan-300',
          coreGradient: 'from-cyan-300 via-sky-500 to-blue-600',
          speed: 'animate-spin-fast',
          pulseScale: 1 + audioLevel * 0.15,
          statusText: 'ACOUSTIC RECEPTOR ENGAGED',
          badgeColor: 'text-cyan-300 border-cyan-500/40 bg-cyan-950/40',
        };
      case 'processing':
        return {
          glow: 'rgba(59, 130, 246, 0.9)',
          outerRing: 'border-blue-400',
          middleRing: 'border-indigo-400',
          coreGradient: 'from-blue-400 via-indigo-600 to-cyan-500',
          speed: 'animate-spin-fast',
          pulseScale: 1.05,
          statusText: 'NEURAL COGNITION IN PROGRESS',
          badgeColor: 'text-blue-300 border-blue-500/40 bg-blue-950/40',
        };
      case 'speaking':
        return {
          glow: 'rgba(14, 165, 233, 0.95)',
          outerRing: 'border-sky-300',
          middleRing: 'border-cyan-400',
          coreGradient: 'from-sky-300 via-cyan-400 to-blue-600',
          speed: 'animate-spin-slow',
          pulseScale: 1 + audioLevel * 0.2,
          statusText: 'VOCAL SYNTHESIS ACTIVE',
          badgeColor: 'text-sky-300 border-sky-500/40 bg-sky-950/40',
        };
      case 'error':
        return {
          glow: 'rgba(239, 68, 68, 0.85)',
          outerRing: 'border-rose-500',
          middleRing: 'border-red-400',
          coreGradient: 'from-rose-500 via-red-600 to-amber-600',
          speed: 'animate-spin-slow',
          pulseScale: 1.0,
          statusText: 'SYSTEM ALERT // ANOMALY DETECTED',
          badgeColor: 'text-rose-300 border-rose-500/40 bg-rose-950/40',
        };
      default:
        return {
          glow: 'rgba(6, 182, 212, 0.35)',
          outerRing: 'border-cyan-500/40',
          middleRing: 'border-cyan-500/20',
          coreGradient: 'from-cyan-500 via-blue-600 to-slate-800',
          speed: 'animate-spin-slow',
          pulseScale: 1.0,
          statusText: 'STANDBY // READY FOR DIRECTIVE',
          badgeColor: 'text-cyan-400 border-cyan-500/30 bg-slate-900/60',
        };
    }
  };

  const cfg = getStateConfig();

  return (
    <div
      onClick={onClick}
      className="relative flex flex-col items-center justify-center p-4 cursor-pointer select-none group"
      title="Click Arc Reactor to toggle voice listening (Push-to-Talk)"
    >
      {/* Outer Holographic Glow Field */}
      <div
        className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 flex items-center justify-center rounded-full transition-all duration-700"
        style={{
          boxShadow: `0 0 50px ${cfg.glow}, inset 0 0 40px ${cfg.glow}`,
          background: 'radial-gradient(circle, rgba(15,23,42,0.92) 0%, rgba(3,7,18,0.98) 75%)',
          transform: `scale(${cfg.pulseScale})`,
        }}
      >
        {/* Outer Ring 1: Slotted Tachymeter Ring */}
        <div
          className={`absolute inset-0 rounded-full border border-dashed ${cfg.outerRing} opacity-75 ${cfg.speed}`}
          style={{ animationDuration: state === 'processing' ? '2.8s' : '26s' }}
        />

        {/* Outer Ring 2: Counter-rotating geometric coordinate ring */}
        <div
          className="absolute inset-2 sm:inset-3 rounded-full border border-dotted border-cyan-400/30 animate-spin-reverse"
          style={{ animationDuration: '40s' }}
        />

        {/* 16 Radial Holographic Rays */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {[...Array(16)].map((_, i) => (
            <div
              key={i}
              className="absolute w-0.5 h-3 bg-cyan-400/60"
              style={{
                transform: `rotate(${i * 22.5}deg) translateY(-102px)`,
                boxShadow: '0 0 4px rgba(6, 182, 212, 0.8)',
              }}
            />
          ))}
        </div>

        {/* Middle Segmented Arc Layer */}
        <div
          className={`absolute inset-6 sm:inset-8 rounded-full border-2 border-dashed ${cfg.middleRing} opacity-60 ${cfg.speed}`}
          style={{ animationDuration: '14s' }}
        />

        {/* Inner Geometric Hexagonal Bracket Layer */}
        <div className="absolute inset-10 sm:inset-12 rounded-full border border-cyan-500/40 flex items-center justify-center">
          <div className="w-full h-full rounded-full border border-cyan-400/20 rotate-45" />
        </div>

        {/* Central Core Arc Reactor */}
        <div
          className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr ${cfg.coreGradient} shadow-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105`}
          style={{
            boxShadow: `0 0 35px ${cfg.glow}`,
          }}
        >
          {/* Inner Dark Heat Shield */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-slate-950/90 border border-cyan-300/60 flex items-center justify-center shadow-inner">
            {/* Pulsing Core Singularity */}
            <div
              className={`w-4 h-4 rounded-full bg-cyan-200 shadow-[0_0_15px_#22d3ee] ${
                state === 'listening' || state === 'speaking' ? 'animate-ping' : 'animate-pulse'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Futuristic Status Label */}
      <div className={`mt-5 flex items-center gap-2 px-3 py-1 rounded-md border text-[11px] font-mono tracking-widest uppercase backdrop-blur-md transition-colors ${cfg.badgeColor}`}>
        <span
          className={`w-2 h-2 rounded-full ${
            state === 'error' ? 'bg-rose-400' : 'bg-cyan-400'
          } ${state !== 'idle' ? 'animate-pulse' : ''}`}
        />
        <span>{cfg.statusText}</span>
      </div>
    </div>
  );
};
