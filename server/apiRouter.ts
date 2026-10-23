/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IncomingMessage, ServerResponse } from 'http';
import { SecurityValidator } from './securityValidator.js';
import { MemoryStore } from './memoryStore.js';
import { SystemMonitor } from './systemMonitor.js';
import { ToolService } from './toolService.js';
import { GeminiService } from './geminiService.js';

export class ApiRouter {
  public validator: SecurityValidator;
  public memory: MemoryStore;
  public monitor: SystemMonitor;
  public toolService: ToolService;
  public gemini: GeminiService;

  constructor() {
    this.validator = new SecurityValidator();
    this.memory = new MemoryStore();
    this.monitor = new SystemMonitor();
    this.toolService = new ToolService(this.validator, this.memory, this.monitor);
    this.gemini = new GeminiService(this.toolService, this.memory, this.validator);
  }

  private sendJson(res: ServerResponse, statusCode: number, data: any) {
    const payload = JSON.stringify(data);
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.end(payload);
  }

  private async parseBody(req: IncomingMessage): Promise<any> {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', chunk => {
        body += chunk;
      });
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch {
          resolve({});
        }
      });
    });
  }

  async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    if (!pathname.startsWith('/api')) {
      return false;
    }

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.end();
      return true;
    }

    // GET /api/status
    if (pathname === '/api/status' && req.method === 'GET') {
      const stats = await this.monitor.getMetrics();
      this.sendJson(res, 200, {
        online: true,
        name: 'Project JARVIS',
        version: '2.5.0-PRO',
        model: this.gemini.model,
        gemini_connected: this.gemini.isConnected(),
        tools_enabled: this.validator.toolsEnabled,
        platform: stats.platform,
        os: stats.os,
        network_online: stats.network_online,
      });
      return true;
    }

    // GET /api/system/stats
    if (pathname === '/api/system/stats' && req.method === 'GET') {
      const stats = await this.monitor.getMetrics();
      this.sendJson(res, 200, stats);
      return true;
    }

    // GET /api/chat/history
    if (pathname === '/api/chat/history' && req.method === 'GET') {
      const history = this.memory.getRecentHistory('default', 50);
      this.sendJson(res, 200, { history });
      return true;
    }

    // POST /api/chat
    if (pathname === '/api/chat' && req.method === 'POST') {
      const body = await this.parseBody(req);
      const message = body.message || '';
      const sessionId = body.sessionId || 'default';
      const result = await this.gemini.chat(message, sessionId);
      this.sendJson(res, 200, result);
      return true;
    }

    // POST /api/chat/clear
    if (pathname === '/api/chat/clear' && req.method === 'POST') {
      this.memory.clearHistory();
      this.sendJson(res, 200, { success: true, message: 'Conversation history cleared.' });
      return true;
    }

    // GET /api/memories
    if (pathname === '/api/memories' && req.method === 'GET') {
      const category = url.searchParams.get('category') || undefined;
      const memories = this.memory.getMemories(category);
      this.sendJson(res, 200, { memories });
      return true;
    }

    // POST /api/memories
    if (pathname === '/api/memories' && req.method === 'POST') {
      const body = await this.parseBody(req);
      const entry = this.memory.saveMemory(body.category || 'general', body.key || '', body.value || '');
      this.sendJson(res, 200, { success: true, memory: entry });
      return true;
    }

    // DELETE /api/memories/:id
    if (pathname.startsWith('/api/memories/') && req.method === 'DELETE') {
      const idStr = pathname.replace('/api/memories/', '');
      const id = parseInt(idStr, 10);
      const deleted = this.memory.deleteMemory(id);
      this.sendJson(res, 200, { success: deleted });
      return true;
    }

    // POST /api/memories/clear
    if (pathname === '/api/memories/clear' && req.method === 'POST') {
      const body = await this.parseBody(req);
      try {
        this.memory.clearAllMemories(Boolean(body.confirmed));
        this.sendJson(res, 200, { success: true, message: 'All persistent memories purged.' });
      } catch (err: any) {
        this.sendJson(res, 400, { success: false, error: err.message });
      }
      return true;
    }

    // GET /api/notes
    if (pathname === '/api/notes' && req.method === 'GET') {
      const notes = this.memory.getNotes();
      this.sendJson(res, 200, { notes });
      return true;
    }

    // POST /api/notes
    if (pathname === '/api/notes' && req.method === 'POST') {
      const body = await this.parseBody(req);
      const note = this.memory.saveNote(body.title || 'Untitled Note', body.content || '');
      this.sendJson(res, 200, { success: true, note });
      return true;
    }

    // GET /api/tools
    if (pathname === '/api/tools' && req.method === 'GET') {
      this.sendJson(res, 200, {
        tools_enabled: this.validator.toolsEnabled,
        allowed_apps: Object.keys(this.validator.appAllowlist),
        approved_directories: this.validator.approvedDirectories,
      });
      return true;
    }

    // POST /api/tools/execute
    if (pathname === '/api/tools/execute' && req.method === 'POST') {
      const body = await this.parseBody(req);
      const result = await this.toolService.executeByName(body.name, body.arguments || {});
      this.sendJson(res, 200, result);
      return true;
    }

    // GET /api/logs
    if (pathname === '/api/logs' && req.method === 'GET') {
      const logs = this.memory.getActionLogs(50);
      this.sendJson(res, 200, { logs });
      return true;
    }

    // GET /api/settings
    if (pathname === '/api/settings' && req.method === 'GET') {
      this.sendJson(res, 200, {
        model: this.gemini.model,
        tools_enabled: this.validator.toolsEnabled,
        gemini_connected: this.gemini.isConnected(),
      });
      return true;
    }

    // POST /api/settings
    if (pathname === '/api/settings' && req.method === 'POST') {
      const body = await this.parseBody(req);
      if (body.model) {
        this.gemini.setModel(body.model);
      }
      if (typeof body.tools_enabled === 'boolean') {
        this.validator.toolsEnabled = body.tools_enabled;
      }
      this.sendJson(res, 200, {
        success: true,
        model: this.gemini.model,
        tools_enabled: this.validator.toolsEnabled,
      });
      return true;
    }

    this.sendJson(res, 404, { error: 'Endpoint not found' });
    return true;
  }
}
