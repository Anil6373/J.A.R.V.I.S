/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { ToolService } from './toolService.js';
import { MemoryStore } from './memoryStore.js';
import { SecurityValidator } from './securityValidator.js';

export interface ChatResponse {
  reply: string;
  tools_used: Array<{
    name: string;
    args: Record<string, any>;
    result: any;
  }>;
  model: string;
}

export class GeminiService {
  private ai: GoogleGenAI | null = null;
  public model: string = 'gemini-3.8-flash';

  constructor(
    private toolService: ToolService,
    private memory: MemoryStore,
    private validator: SecurityValidator
  ) {
    this.initClient();
  }

  private initClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }

  public setModel(newModel: string) {
    if (newModel && typeof newModel === 'string') {
      this.model = newModel;
    }
  }

  public isConnected(): boolean {
    return Boolean(this.ai && process.env.GEMINI_API_KEY);
  }

  private getFunctionDeclarations(): FunctionDeclaration[] {
    return [
      {
        name: 'open_application',
        description: 'Opens an approved Windows application on the user laptop (notepad, calculator, explorer, cmd, taskmgr, code, edge, chrome, terminal).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            app_name: {
              type: Type.STRING,
              description: 'The exact application name, e.g., notepad, calculator, explorer, cmd, taskmgr, code, edge, chrome, terminal',
            },
          },
          required: ['app_name'],
        },
      },
      {
        name: 'open_website',
        description: 'Opens an authorized HTTP/HTTPS website URL in the user default web browser.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            url: {
              type: Type.STRING,
              description: 'The web destination URL (must begin with http:// or https://)',
            },
          },
          required: ['url'],
        },
      },
      {
        name: 'search_files',
        description: 'Searches for files by filename or keyword in approved Windows folders (Documents, Downloads, Desktop, Projects).',
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: {
              type: Type.STRING,
              description: 'Filename or query keyword to search for',
            },
            target_folder: {
              type: Type.STRING,
              description: 'Optional specific folder path to search within',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'read_system_stats',
        description: 'Retrieves current live hardware telemetry: CPU load, RAM utilization, Disk space, and Network status.',
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
      {
        name: 'get_system_time',
        description: 'Returns the exact current date, day of week, and local time from the host machine.',
        parameters: {
          type: Type.OBJECT,
          properties: {},
        },
      },
      {
        name: 'create_local_note',
        description: 'Creates and saves a quick text note or memo into local persistent memory.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: 'Brief title for the note' },
            content: { type: Type.STRING, description: 'Note body content' },
          },
          required: ['title', 'content'],
        },
      },
      {
        name: 'search_local_notes',
        description: 'Searches through stored local notes for keywords.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING, description: 'Search term' },
          },
          required: ['query'],
        },
      },
      {
        name: 'save_personal_memory',
        description: 'Permanently records a user-approved fact, preference, or project memory into SQLite memory for future sessions.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              description: 'Category: preference, fact, identity, or project',
            },
            key: { type: Type.STRING, description: 'Unique memory label or identifier' },
            value: { type: Type.STRING, description: 'The specific fact or preference to remember' },
          },
          required: ['category', 'key', 'value'],
        },
      },
      {
        name: 'search_personal_memories',
        description: 'Searches permanent saved user memories and preferences.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: { type: Type.STRING, description: 'Query keyword to lookup' },
          },
          required: ['query'],
        },
      },
    ];
  }

  private buildSystemInstruction(userMessage: string): string {
    const relevantMemories = this.memory.getContextMemories(userMessage, 4);

    let prompt = `You are J.A.R.V.I.S. (Just A Rather Very Intelligent System), the premier personal AI assistant engineered for Windows laptops.
Your persona is composed, articulate, highly capable, British-accented, respectfully witty, and laser-focused on executive assistance.
Always address the user politely (typically "Sir" or by name if specified in memory).
Keep spoken responses concise, cinematic, and natural for speech playback—avoid giant walls of markdown unless asked for detailed code or technical listings.

Key Guidelines:
1. Always prefer using your available function tools for real actions: opening approved apps, navigating URLs, querying real hardware metrics, saving personal memories, and searching notes or files.
2. If the user asks about the current system status, time, battery, CPU, RAM, or files, call the corresponding tool first rather than inventing answers.
3. If the user asks you to remember something about their preferences, workflow, or identity, call save_personal_memory.
4. If an action fails or is blocked by security policy, calmly state the exact cause and suggest an authorized course of action.`;

    if (relevantMemories.length > 0) {
      prompt += `\n\n[Active Relevant Memories]\n` +
        relevantMemories.map(m => `- ${m.key} (${m.category}): ${m.value}`).join('\n');
    }

    return prompt;
  }

  async chat(userMessage: string, sessionId: string = 'default'): Promise<ChatResponse> {
    if (!this.ai) {
      this.initClient();
    }

    if (!this.ai) {
      return {
        reply: "Sir, my neural link is currently offline. Please ensure the GEMINI_API_KEY environment variable is configured in the environment settings.",
        tools_used: [],
        model: this.model,
      };
    }

    const toolsUsed: Array<{ name: string; args: any; result: any }> = [];
    const systemInstruction = this.buildSystemInstruction(userMessage);
    const history = this.memory.getRecentHistory(sessionId, 6);

    // Prepare contents
    const contents: any[] = [];
    for (const h of history) {
      contents.push({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }],
      });
    }
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }],
    });

    const declarations = this.getFunctionDeclarations();

    try {
      // Up to 4 multi-turn tool calling steps
      for (let turn = 0; turn < 4; turn++) {
        const response = await this.ai.models.generateContent({
          model: this.model,
          contents,
          config: {
            systemInstruction,
            tools: [{ functionDeclarations: declarations }],
          },
        });

        const candidates = response.candidates;
        if (!candidates || candidates.length === 0) {
          return {
            reply: 'Audio relay silent, sir. No candidate returned from cognitive core.',
            tools_used: toolsUsed,
            model: this.model,
          };
        }

        const candidate = candidates[0];
        const content = candidate.content;
        const parts = content?.parts || [];
        const functionCalls = response.functionCalls;

        if (!functionCalls || functionCalls.length === 0) {
          // Direct text response
          const text = response.text || 'At your command, sir.';
          this.memory.addMessage(sessionId, 'user', userMessage);
          this.memory.addMessage(sessionId, 'assistant', text);
          return {
            reply: text,
            tools_used: toolsUsed,
            model: this.model,
          };
        }

        // Handle tool calls
        contents.push(content);
        const toolResponseParts: any[] = [];

        for (const fc of functionCalls) {
          const name = fc.name || 'unnamed_tool';
          const args = (fc.args as Record<string, any>) || {};
          const result = await this.toolService.executeByName(name, args);

          toolsUsed.push({ name, args, result });
          toolResponseParts.push({
            functionResponse: {
              name,
              response: { name, content: result },
            },
          });
        }

        contents.push({
          role: 'user',
          parts: toolResponseParts,
        });
      }

      const finalReply = 'Directives executed and verified, sir.';
      this.memory.addMessage(sessionId, 'user', userMessage);
      this.memory.addMessage(sessionId, 'assistant', finalReply);
      return {
        reply: finalReply,
        tools_used: toolsUsed,
        model: this.model,
      };
    } catch (err: any) {
      const sanitized = SecurityValidator.redactSecrets(err.message || String(err));
      console.error('Gemini API Error:', sanitized);
      return {
        reply: `Sir, I encountered an anomaly within my reasoning relays: ${sanitized}`,
        tools_used: toolsUsed,
        model: this.model,
      };
    }
  }
}
