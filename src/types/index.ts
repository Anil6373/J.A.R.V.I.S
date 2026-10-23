/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AssistantState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export interface SystemStats {
  os: string;
  hostname: string;
  platform: string;
  uptimeSeconds: number;
  cpu_percent: number;
  ram_percent: number;
  ram_used_gb: number;
  ram_total_gb: number;
  disk_percent: number;
  disk_used_gb: number;
  disk_total_gb: number;
  battery_percent: number | null;
  is_charging: boolean | null;
  network_online: boolean;
  timestamp: string;
}

export interface ChatMessage {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  tools_used?: Array<{
    name: string;
    args: Record<string, any>;
    result: any;
  }>;
}

export interface MemoryItem {
  id: number;
  category: 'preference' | 'fact' | 'identity' | 'project' | 'general';
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteItem {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActionLogItem {
  id: number;
  toolName: string;
  arguments: Record<string, any>;
  status: 'SUCCESS' | 'BLOCKED' | 'ERROR';
  result: string;
  timestamp: string;
}

export interface ServerStatus {
  online: boolean;
  name: string;
  version: string;
  model: string;
  gemini_connected: boolean;
  tools_enabled: boolean;
  platform: string;
  os: string;
  network_online: boolean;
}
