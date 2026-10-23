/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Cpu, HardDrive, Battery, BatteryCharging, Wifi, WifiOff, Laptop } from 'lucide-react';
import { SystemStats } from '../types';

interface SystemTelemetryProps {
  stats: SystemStats | null;
}

export const SystemTelemetry: React.FC<SystemTelemetryProps> = ({ stats }) => {
  if (!stats) {
    return (
      <div className="p-3 bg-slate-950/80 rounded-xl border border-cyan-950 text-cyan-600 font-mono text-xs animate-pulse text-center">
        CONNECTING TO SYSTEM TELEMETRY BUS...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 w-full font-mono text-xs">
      {/* CPU Utilization */}
      <div className="p-3 rounded-lg bg-slate-950/80 border border-cyan-500/20 backdrop-blur-md flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-cyan-400 mb-1">
          <span className="flex items-center gap-1.5 font-semibold text-[11px] tracking-wider">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" /> CPU
          </span>
          <span className="text-cyan-200 tabular-nums font-bold">{stats.cpu_percent.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-cyan-500 to-sky-400 h-1.5 transition-all duration-700"
            style={{ width: `${Math.min(100, Math.max(2, stats.cpu_percent))}%` }}
          />
        </div>
        <div className="text-[10px] text-slate-400 mt-1 truncate">
          {stats.platform.toUpperCase()} · HOST CORE
        </div>
      </div>

      {/* Memory (RAM) */}
      <div className="p-3 rounded-lg bg-slate-950/80 border border-cyan-500/20 backdrop-blur-md flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-cyan-400 mb-1">
          <span className="flex items-center gap-1.5 font-semibold text-[11px] tracking-wider">
            <HardDrive className="w-3.5 h-3.5 text-cyan-400" /> RAM
          </span>
          <span className="text-cyan-200 tabular-nums font-bold">{stats.ram_percent.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-sky-500 to-indigo-500 h-1.5 transition-all duration-700"
            style={{ width: `${Math.min(100, stats.ram_percent)}%` }}
          />
        </div>
        <div className="text-[10px] text-slate-400 mt-1 tabular-nums">
          {stats.ram_used_gb} / {stats.ram_total_gb} GB
        </div>
      </div>

      {/* Primary Storage (C:) */}
      <div className="p-3 rounded-lg bg-slate-950/80 border border-cyan-500/20 backdrop-blur-md flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-cyan-400 mb-1">
          <span className="flex items-center gap-1.5 font-semibold text-[11px] tracking-wider">
            <Laptop className="w-3.5 h-3.5 text-cyan-400" /> DISK (C:)
          </span>
          <span className="text-cyan-200 tabular-nums font-bold">{stats.disk_percent.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-cyan-600 to-teal-400 h-1.5 transition-all duration-700"
            style={{ width: `${Math.min(100, stats.disk_percent)}%` }}
          />
        </div>
        <div className="text-[10px] text-slate-400 mt-1 tabular-nums">
          {stats.disk_used_gb} / {stats.disk_total_gb} GB
        </div>
      </div>

      {/* Power & Network */}
      <div className="p-3 rounded-lg bg-slate-950/80 border border-cyan-500/20 backdrop-blur-md flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-cyan-400 mb-1">
          <span className="flex items-center gap-1.5 font-semibold text-[11px] tracking-wider">
            {stats.is_charging ? (
              <BatteryCharging className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Battery className="w-3.5 h-3.5 text-cyan-400" />
            )}
            POWER
          </span>
          <span className="text-cyan-200 tabular-nums font-bold">
            {stats.battery_percent !== null ? `${stats.battery_percent}%` : 'AC MAINS'}
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
          <span className="truncate">Uptime {Math.floor(stats.uptimeSeconds / 3600)}h {Math.floor((stats.uptimeSeconds % 3600) / 60)}m</span>
          <span className="flex items-center gap-1 font-semibold text-cyan-300">
            {stats.network_online ? (
              <>
                <Wifi className="w-3 h-3 text-cyan-400" /> ONLINE
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-rose-500" /> OFFLINE
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};
