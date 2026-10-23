/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { exec, spawn } from 'child_process';
import { SecurityValidator } from './securityValidator.js';
import { MemoryStore } from './memoryStore.js';
import { SystemMonitor } from './systemMonitor.js';

export interface ToolResult {
  success: boolean;
  message?: string;
  error?: string;
  [key: string]: any;
}

export class ToolService {
  constructor(
    public validator: SecurityValidator,
    public memory: MemoryStore,
    public monitor: SystemMonitor
  ) {}

  async openApplication(appName: string): Promise<ToolResult> {
    if (!this.validator.toolsEnabled) {
      return { success: false, error: 'Tools execution is disabled by the master security switch.' };
    }

    const executable = this.validator.validateApp(appName);
    if (!executable) {
      this.memory.logAction('open_application', { app_name: appName }, 'BLOCKED', 'Not in approved application allowlist');
      return {
        success: false,
        error: `Application '${appName}' is not in the approved allowlist (${Object.keys(this.validator.appAllowlist).join(', ')}).`,
      };
    }

    try {
      if (process.platform === 'win32') {
        const proc = spawn(executable, [], { detached: true, stdio: 'ignore', shell: true });
        proc.unref();
      }
      this.memory.logAction('open_application', { app_name: appName }, 'SUCCESS', `Dispatched executable: ${executable}`);
      return {
        success: true,
        message: `Successfully initiated execution of ${appName} (${executable}).`,
        executable,
      };
    } catch (err: any) {
      const msg = SecurityValidator.redactSecrets(err.message || String(err));
      this.memory.logAction('open_application', { app_name: appName }, 'ERROR', msg);
      return { success: false, error: msg };
    }
  }

  async openWebsite(url: string): Promise<ToolResult> {
    if (!this.validator.toolsEnabled) {
      return { success: false, error: 'Tools execution is disabled by the master security switch.' };
    }

    if (!this.validator.validateUrl(url)) {
      this.memory.logAction('open_website', { url }, 'BLOCKED', 'Invalid or unsafe URL scheme');
      return {
        success: false,
        error: `The URL '${url}' violates security protocol. Only HTTP/HTTPS destinations are permitted.`,
      };
    }

    try {
      if (process.platform === 'win32') {
        exec(`start "" "${url}"`);
      }
      this.memory.logAction('open_website', { url }, 'SUCCESS', `Navigating to ${url}`);
      return {
        success: true,
        message: `Navigating to ${url} via default browser.`,
        url,
      };
    } catch (err: any) {
      const msg = SecurityValidator.redactSecrets(err.message || String(err));
      this.memory.logAction('open_website', { url }, 'ERROR', msg);
      return { success: false, error: msg };
    }
  }

  async searchFiles(query: string, targetFolder?: string, maxResults: number = 10): Promise<ToolResult> {
    if (!this.validator.toolsEnabled) {
      return { success: false, error: 'Tools execution is disabled by the master security switch.' };
    }

    if (!query || query.trim().length < 2) {
      return { success: false, error: 'Search query must contain at least 2 characters.' };
    }

    let searchRoots = this.validator.approvedDirectories;
    if (targetFolder) {
      const resolved = path.resolve(targetFolder);
      if (!this.validator.validatePath(resolved)) {
        return { success: false, error: `Folder '${targetFolder}' is outside approved directories.` };
      }
      searchRoots = [resolved];
    }

    const results: Array<{ name: string; path: string; sizeBytes: number; modified: string }> = [];
    const qLower = query.trim().toLowerCase();

    for (const root of searchRoots) {
      if (!fs.existsSync(root)) continue;
      this.walkDirectory(root, qLower, results, maxResults);
      if (results.length >= maxResults) break;
    }

    this.memory.logAction('search_files', { query, targetFolder }, 'SUCCESS', `Located ${results.length} files`);
    return {
      success: true,
      query,
      count: results.length,
      files: results,
    };
  }

  private walkDirectory(dir: string, query: string, acc: any[], max: number, depth = 0) {
    if (depth > 4 || acc.length >= max) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const ent of entries) {
        if (ent.name.startsWith('.') || ent.name === 'node_modules') continue;
        const fullPath = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          this.walkDirectory(fullPath, query, acc, max, depth + 1);
        } else if (ent.isFile() && ent.name.toLowerCase().includes(query)) {
          const stat = fs.statSync(fullPath);
          acc.push({
            name: ent.name,
            path: fullPath,
            sizeBytes: stat.size,
            modified: stat.mtime.toISOString(),
          });
          if (acc.length >= max) return;
        }
      }
    } catch {
      // Permission or unreadable path ignored
    }
  }

  async readSystemStats(): Promise<ToolResult> {
    const stats = await this.monitor.getMetrics();
    this.memory.logAction('read_system_stats', {}, 'SUCCESS', 'Hardware metrics queried');
    return {
      success: true,
      telemetry: stats,
    };
  }

  getSystemTime(): ToolResult {
    const now = new Date();
    const formatted = now.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    return {
      success: true,
      formattedTime: formatted,
      iso: now.toISOString(),
    };
  }

  createLocalNote(title: string, content: string): ToolResult {
    const note = this.memory.saveNote(title, content);
    this.memory.logAction('create_local_note', { title }, 'SUCCESS', `Archived Note #${note.id}`);
    return {
      success: true,
      noteId: note.id,
      message: `Note '${title}' saved successfully into persistent memory.`,
    };
  }

  searchLocalNotes(query: string): ToolResult {
    const notes = this.memory.searchNotes(query);
    return {
      success: true,
      count: notes.length,
      notes,
    };
  }

  savePersonalMemory(category: any, key: string, value: string): ToolResult {
    const mem = this.memory.saveMemory(category || 'general', key, value);
    this.memory.logAction('save_personal_memory', { key, category }, 'SUCCESS', `Stored memory #${mem.id}`);
    return {
      success: true,
      memory: mem,
      message: `Memory updated: '${key}' stored under category '${category}'.`,
    };
  }

  searchPersonalMemories(query: string): ToolResult {
    const memories = this.memory.searchMemories(query);
    return {
      success: true,
      count: memories.length,
      memories,
    };
  }

  async executeByName(name: string, args: Record<string, any>): Promise<ToolResult> {
    switch (name) {
      case 'open_application':
        return this.openApplication(args.app_name);
      case 'open_website':
        return this.openWebsite(args.url);
      case 'search_files':
        return this.searchFiles(args.query, args.target_folder, args.max_results);
      case 'read_system_stats':
        return this.readSystemStats();
      case 'get_system_time':
        return this.getSystemTime();
      case 'create_local_note':
        return this.createLocalNote(args.title, args.content);
      case 'search_local_notes':
        return this.searchLocalNotes(args.query);
      case 'save_personal_memory':
        return this.savePersonalMemory(args.category, args.key, args.value);
      case 'search_personal_memories':
        return this.searchPersonalMemories(args.query);
      default:
        return { success: false, error: `Unrecognized tool '${name}'.` };
    }
  }
}
