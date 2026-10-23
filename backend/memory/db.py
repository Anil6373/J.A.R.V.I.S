"""
Persistent SQLite database for JARVIS:
- Conversations table
- Memories table (facts, preferences, identity)
- Local notes table
- Action logs table for security auditing
"""
import sqlite3
import json
import os
from typing import List, Dict, Any, Optional
from datetime import datetime

class MemoryManager:
    def __init__(self, db_path: str = "jarvis_memory.db"):
        self.db_path = db_path
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._init_db()

    def _init_db(self):
        with self.conn:
            self.conn.executescript("""
                CREATE TABLE IF NOT EXISTS conversations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS memories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    category TEXT NOT NULL,
                    key TEXT NOT NULL UNIQUE,
                    value TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS notes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS action_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tool_name TEXT NOT NULL,
                    arguments TEXT NOT NULL,
                    status TEXT NOT NULL,
                    result TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            """)

    def save_memory(self, category: str, key: str, value: str):
        with self.conn:
            self.conn.execute("""
                INSERT INTO memories (category, key, value, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(key) DO UPDATE SET
                    category=excluded.category,
                    value=excluded.value,
                    updated_at=CURRENT_TIMESTAMP
            """, (category.strip(), key.strip().lower(), value.strip()))

    def get_memories(self, category: Optional[str] = None) -> List[Dict[str, Any]]:
        cur = self.conn.cursor()
        if category:
            cur.execute("SELECT * FROM memories WHERE category = ? ORDER BY updated_at DESC", (category,))
        else:
            cur.execute("SELECT * FROM memories ORDER BY updated_at DESC")
        return [dict(row) for row in cur.fetchall()]

    def search_memories(self, query: str) -> List[Dict[str, Any]]:
        cur = self.conn.cursor()
        param = f"%{query.strip()}%"
        cur.execute("SELECT * FROM memories WHERE key LIKE ? OR value LIKE ? OR category LIKE ? ORDER BY updated_at DESC", 
                    (param, param, param))
        return [dict(row) for row in cur.fetchall()]

    def get_context_memories(self, user_query: str, limit: int = 5) -> List[Dict[str, Any]]:
        words = [w.lower() for w in user_query.split() if len(w) > 3]
        if not words:
            return []
        
        cur = self.conn.cursor()
        results = []
        seen_ids = set()
        for w in words[:4]:
            param = f"%{w}%"
            cur.execute("SELECT * FROM memories WHERE key LIKE ? OR value LIKE ? LIMIT 3", (param, param))
            for row in cur.fetchall():
                r_dict = dict(row)
                if r_dict["id"] not in seen_ids:
                    seen_ids.add(r_dict["id"])
                    results.append(r_dict)
                    if len(results) >= limit:
                        return results
        return results

    def delete_memory(self, memory_id: int) -> bool:
        with self.conn:
            cur = self.conn.execute("DELETE FROM memories WHERE id = ?", (memory_id,))
            return cur.rowcount > 0

    def clear_all_memories(self, confirmed: bool = False):
        if not confirmed:
            raise ValueError("Explicit confirmation is required to wipe persistent memory.")
        with self.conn:
            self.conn.execute("DELETE FROM memories")

    def add_message(self, session_id: str, role: str, content: str):
        with self.conn:
            self.conn.execute(
                "INSERT INTO conversations (session_id, role, content) VALUES (?, ?, ?)",
                (session_id, role, content)
            )

    def get_recent_history(self, session_id: str = "default", limit: int = 15) -> List[Dict[str, Any]]:
        cur = self.conn.cursor()
        cur.execute(
            "SELECT role, content, timestamp FROM conversations WHERE session_id = ? ORDER BY id DESC LIMIT ?",
            (session_id, limit)
        )
        rows = cur.fetchall()
        return [dict(r) for r in reversed(rows)]

    def clear_history(self, session_id: Optional[str] = None):
        with self.conn:
            if session_id:
                self.conn.execute("DELETE FROM conversations WHERE session_id = ?", (session_id,))
            else:
                self.conn.execute("DELETE FROM conversations")

    def log_action(self, tool_name: str, arguments: dict, status: str, result: str):
        with self.conn:
            self.conn.execute(
                "INSERT INTO action_logs (tool_name, arguments, status, result) VALUES (?, ?, ?, ?)",
                (tool_name, json.dumps(arguments), status, str(result))
            )

    def get_action_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        cur = self.conn.cursor()
        cur.execute("SELECT * FROM action_logs ORDER BY id DESC LIMIT ?", (limit,))
        return [dict(r) for r in cur.fetchall()]

    def save_note(self, title: str, content: str) -> int:
        with self.conn:
            cur = self.conn.execute("INSERT INTO notes (title, content) VALUES (?, ?)", (title, content))
            return cur.lastrowid

    def search_notes(self, query: str) -> List[Dict[str, Any]]:
        cur = self.conn.cursor()
        param = f"%{query}%"
        cur.execute("SELECT * FROM notes WHERE title LIKE ? OR content LIKE ? ORDER BY updated_at DESC", (param, param))
        return [dict(r) for r in cur.fetchall()]
