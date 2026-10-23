/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';

export interface ConversationTurn {
  id: number;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface MemoryEntry {
  id: number;
  category: 'preference' | 'fact' | 'identity' | 'project' | 'general';
  key: string;
  value: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteEntry {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActionLogEntry {
  id: number;
  toolName: string;
  arguments: Record<string, any>;
  status: 'SUCCESS' | 'BLOCKED' | 'ERROR';
  result: string;
  timestamp: string;
}

interface DatabaseSchema {
  conversations: ConversationTurn[];
  memories: MemoryEntry[];
  notes: NoteEntry[];
  actionLogs: ActionLogEntry[];
  counter: number;
}

export class MemoryStore {
  private filePath: string;
  private data: DatabaseSchema;

  constructor(filePath?: string) {
    const dataDir = path.resolve(process.cwd(), 'jarvis_data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch {}
    }
    this.filePath = filePath || path.join(dataDir, 'jarvis_memory.json');
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(raw);
      } catch {
        // Fallback to fresh store
      }
    }
    return {
      conversations: [],
      memories: [
        {
          id: 1,
          category: 'identity',
          key: 'primary_directive',
          value: 'Serve as personal executive AI assistant for Windows computing and productivity.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 2,
          category: 'preference',
          key: 'communication_style',
          value: 'Composed, articulate, British-inspired, razor-sharp technical insight.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      notes: [
        {
          id: 1,
          title: 'System Initialization Memo',
          content: 'JARVIS Core initialized. Windows tool capabilities registered and standby for directives.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      actionLogs: [],
      counter: 10,
    };
  }

  private persist() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to persist memory store:', e);
    }
  }

  // Conversation methods
  addMessage(sessionId: string, role: 'user' | 'assistant', content: string): ConversationTurn {
    const turn: ConversationTurn = {
      id: ++this.data.counter,
      sessionId,
      role,
      content,
      timestamp: new Date().toISOString(),
    };
    this.data.conversations.push(turn);
    if (this.data.conversations.length > 200) {
      this.data.conversations = this.data.conversations.slice(-200);
    }
    this.persist();
    return turn;
  }

  getRecentHistory(sessionId: string = 'default', limit: number = 20): ConversationTurn[] {
    return this.data.conversations
      .filter(c => c.sessionId === sessionId)
      .slice(-limit);
  }

  clearHistory(sessionId?: string) {
    if (sessionId) {
      this.data.conversations = this.data.conversations.filter(c => c.sessionId !== sessionId);
    } else {
      this.data.conversations = [];
    }
    this.persist();
  }

  // Memory methods
  saveMemory(category: MemoryEntry['category'], key: string, value: string): MemoryEntry {
    const cleanKey = key.trim().toLowerCase();
    const existingIdx = this.data.memories.findIndex(m => m.key.toLowerCase() === cleanKey);
    const now = new Date().toISOString();

    if (existingIdx >= 0) {
      this.data.memories[existingIdx].category = category;
      this.data.memories[existingIdx].value = value.trim();
      this.data.memories[existingIdx].updatedAt = now;
      this.persist();
      return this.data.memories[existingIdx];
    }

    const entry: MemoryEntry = {
      id: ++this.data.counter,
      category,
      key: cleanKey,
      value: value.trim(),
      createdAt: now,
      updatedAt: now,
    };
    this.data.memories.unshift(entry);
    this.persist();
    return entry;
  }

  getMemories(category?: string): MemoryEntry[] {
    if (category) {
      return this.data.memories.filter(m => m.category === category);
    }
    return [...this.data.memories];
  }

  searchMemories(query: string): MemoryEntry[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.getMemories();
    return this.data.memories.filter(
      m => m.key.toLowerCase().includes(q) || m.value.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)
    );
  }

  getContextMemories(userQuery: string, limit: number = 5): MemoryEntry[] {
    const words = userQuery
      .toLowerCase()
      .split(/\W+/)
      .filter(w => w.length > 3);

    if (words.length === 0) return [];

    const matches: MemoryEntry[] = [];
    const seenIds = new Set<number>();

    for (const w of words.slice(0, 6)) {
      for (const m of this.data.memories) {
        if (!seenIds.has(m.id)) {
          if (m.key.toLowerCase().includes(w) || m.value.toLowerCase().includes(w)) {
            seenIds.add(m.id);
            matches.push(m);
            if (matches.length >= limit) return matches;
          }
        }
      }
    }
    return matches;
  }

  deleteMemory(id: number): boolean {
    const prevLen = this.data.memories.length;
    this.data.memories = this.data.memories.filter(m => m.id !== id);
    if (this.data.memories.length !== prevLen) {
      this.persist();
      return true;
    }
    return false;
  }

  clearAllMemories(confirmed: boolean = false) {
    if (!confirmed) {
      throw new Error('Explicit confirmation is required to wipe persistent memory.');
    }
    this.data.memories = [];
    this.persist();
  }

  // Notes methods
  saveNote(title: string, content: string): NoteEntry {
    const now = new Date().toISOString();
    const note: NoteEntry = {
      id: ++this.data.counter,
      title: title.trim(),
      content: content.trim(),
      createdAt: now,
      updatedAt: now,
    };
    this.data.notes.unshift(note);
    this.persist();
    return note;
  }

  getNotes(): NoteEntry[] {
    return [...this.data.notes];
  }

  searchNotes(query: string): NoteEntry[] {
    const q = query.trim().toLowerCase();
    return this.data.notes.filter(
      n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    );
  }

  // Action logs
  logAction(toolName: string, args: Record<string, any>, status: 'SUCCESS' | 'BLOCKED' | 'ERROR', result: string): ActionLogEntry {
    const entry: ActionLogEntry = {
      id: ++this.data.counter,
      toolName,
      arguments: args,
      status,
      result: String(result),
      timestamp: new Date().toISOString(),
    };
    this.data.actionLogs.unshift(entry);
    if (this.data.actionLogs.length > 100) {
      this.data.actionLogs = this.data.actionLogs.slice(0, 100);
    }
    this.persist();
    return entry;
  }

  getActionLogs(limit: number = 50): ActionLogEntry[] {
    return this.data.actionLogs.slice(0, limit);
  }
}
