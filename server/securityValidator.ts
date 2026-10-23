/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import os from 'os';

export class SecurityValidator {
  readonly allowedSchemes = new Set(['http', 'https']);
  approvedDirectories: string[];
  appAllowlist: Record<string, string>;
  toolsEnabled: boolean = true;

  constructor(customApprovedDirs?: string[]) {
    const home = os.homedir();
    const defaultDirs = [
      path.join(home, 'Documents'),
      path.join(home, 'Downloads'),
      path.join(home, 'Desktop'),
      path.join(home, 'Projects'),
      path.join(home, 'JARVIS_Notes'),
      path.resolve(process.cwd(), 'workspace_data'),
    ];

    this.approvedDirectories = (customApprovedDirs || defaultDirs).map(d => path.resolve(d));
    this.appAllowlist = {
      notepad: 'notepad.exe',
      calculator: 'calc.exe',
      explorer: 'explorer.exe',
      cmd: 'cmd.exe',
      taskmgr: 'taskmgr.exe',
      code: 'code.cmd',
      edge: 'msedge.exe',
      chrome: 'chrome.exe',
      terminal: 'wt.exe',
    };
  }

  validateUrl(urlStr: string): boolean {
    if (!urlStr || typeof urlStr !== 'string') return false;
    const trimmed = urlStr.trim();
    try {
      const parsed = new URL(trimmed);
      const protocol = parsed.protocol.replace(':', '').toLowerCase();
      if (!this.allowedSchemes.has(protocol)) return false;
      const host = parsed.hostname.toLowerCase();
      if (host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.')) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  validatePath(targetPath: string): boolean {
    if (!targetPath || typeof targetPath !== 'string') return false;
    try {
      const resolved = path.resolve(targetPath);
      return this.approvedDirectories.some(
        dir => resolved === dir || resolved.startsWith(dir + path.sep)
      );
    } catch {
      return false;
    }
  }

  validateApp(appName: string): string | null {
    if (!appName || typeof appName !== 'string') return null;
    const cleaned = appName.trim().toLowerCase();
    return this.appAllowlist[cleaned] || null;
  }

  static redactSecrets(text: string): string {
    if (!text) return '';
    let result = String(text);
    // Redact Google API keys: AIzaSy...
    result = result.replace(/AIzaSy[A-Za-z0-9_-]{33}/g, '[REDACTED_API_KEY]');
    // Redact generic bearer tokens
    result = result.replace(/Bearer\s+[A-Za-z0-9_.-]+/gi, 'Bearer [REDACTED_TOKEN]');
    // Redact query parameter key=
    result = result.replace(/key=[A-Za-z0-9_-]{20,}/gi, 'key=[REDACTED_KEY]');
    return result;
  }
}
