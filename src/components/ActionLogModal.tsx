/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, ShieldAlert, CheckCircle2, Ban, AlertCircle } from 'lucide-react';
import { ActionLogItem } from '../types';

interface ActionLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ActionLogItem[];
}

export const ActionLogModal: React.FC<ActionLogModalProps> = ({ isOpen, onClose, logs }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-cyan-500/40 rounded-xl overflow-hidden shadow-2xl font-mono text-xs text-cyan-100 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-cyan-500/30 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            <span className="font-bold tracking-wider text-cyan-300">
              SECURITY AUDIT & TOOL EXECUTION LOG
            </span>
          </div>
          <button onClick={onClose} className="p-1 hover:text-cyan-300 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Log Stream */}
        <div className="p-4 flex-1 overflow-y-auto space-y-2.5">
          {logs.length === 0 ? (
            <div className="text-center text-slate-500 py-12">
              NO ACTION LOGS RECORDED IN THIS SESSION
            </div>
          ) : (
            logs.map((log) => {
              const isSuccess = log.status === 'SUCCESS';
              const isBlocked = log.status === 'BLOCKED';
              const isError = log.status === 'ERROR';

              return (
                <div
                  key={log.id}
                  className="p-3 rounded-lg bg-slate-950/80 border border-cyan-500/20 flex flex-col space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isSuccess && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      {isBlocked && <Ban className="w-3.5 h-3.5 text-amber-400" />}
                      {isError && <AlertCircle className="w-3.5 h-3.5 text-rose-400" />}
                      <span className="font-bold text-cyan-200">{log.toolName}</span>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        isSuccess
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                          : isBlocked
                          ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                          : 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400">
                    <span className="text-cyan-500 font-semibold">Arguments:</span>{' '}
                    <span className="font-mono">{JSON.stringify(log.arguments)}</span>
                  </div>

                  <div className="text-[11px] text-slate-300">
                    <span className="text-cyan-500 font-semibold">Result:</span> {log.result}
                  </div>

                  <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
