"""
Gemini API client supporting official Google Gen AI SDK and direct REST fallback
"""
import os
import json
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional
from .prompts import JARVIS_SYSTEM_INSTRUCTION
from ..tools.registry import ToolRegistry
from ..memory.db import MemoryManager
from ..security.validator import SecurityValidator

class GeminiClient:
    DEFAULT_MODEL = "gemini-3.8-flash"

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None,
                 tool_registry: Optional[ToolRegistry] = None, memory_manager: Optional[MemoryManager] = None,
                 validator: Optional[SecurityValidator] = None):
        self.api_key = api_key if api_key is not None else os.getenv("GEMINI_API_KEY", "")
        self.model = model if model is not None else os.getenv("GEMINI_MODEL", self.DEFAULT_MODEL)
        self.tool_registry = tool_registry
        self.memory = memory_manager
        self.validator = validator or SecurityValidator()

    def update_config(self, api_key: Optional[str] = None, model: Optional[str] = None):
        if api_key is not None:
            self.api_key = api_key.strip()
        if model is not None:
            self.model = model.strip()

    def test_connection(self) -> Dict[str, Any]:
        if not self.api_key:
            return {"connected": False, "error": "No Gemini API key supplied."}
        try:
            payload = {"contents": [{"parts": [{"text": "Ping"}]}]}
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
            req = urllib.request.Request(
                url, data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json", "User-Agent": "aistudio-build"}, method="POST"
            )
            with urllib.request.urlopen(req, timeout=6.0):
                return {"connected": True, "model": self.model}
        except Exception as e:
            return {"connected": False, "error": self.validator.redact_secrets(str(e))}

    def chat(self, user_message: str, session_id: str = "default") -> Dict[str, Any]:
        if not self.api_key:
            return {
                "reply": "Sir, my cognitive core is inactive. Please configure a valid Gemini API key in the environment variables.",
                "tools_used": []
            }

        relevant_memories = self.memory.get_context_memories(user_message, limit=4) if self.memory else []
        system_instruction_text = JARVIS_SYSTEM_INSTRUCTION
        if relevant_memories:
            mem_summary = "\n".join([f"- {m['key']} ({m['category']}): {m['value']}" for m in relevant_memories])
            system_instruction_text += f"\n\nPersistent User Knowledge:\n{mem_summary}\n"

        history_contents = []
        if self.memory:
            for item in self.memory.get_recent_history(session_id, limit=8):
                history_contents.append({
                    "role": "user" if item["role"] == "user" else "model",
                    "parts": [{"text": item["content"]}]
                })

        history_contents.append({"role": "user", "parts": [{"text": user_message}]})
        tool_declarations = self.tool_registry.get_declarations() if self.tool_registry else []
        tools_executed = []

        # Tool calling loop (max 4 turns)
        for _ in range(4):
            request_body = {
                "contents": history_contents,
                "systemInstruction": {"parts": [{"text": system_instruction_text}]}
            }
            if tool_declarations:
                request_body["tools"] = [{"functionDeclarations": tool_declarations}]

            url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
            req = urllib.request.Request(
                url, data=json.dumps(request_body).encode("utf-8"),
                headers={"Content-Type": "application/json", "User-Agent": "aistudio-build"}, method="POST"
            )

            try:
                with urllib.request.urlopen(req, timeout=25.0) as resp:
                    resp_data = json.loads(resp.read().decode("utf-8"))
            except Exception as e:
                return {
                    "reply": f"Cognitive relay failure: {self.validator.redact_secrets(str(e))}",
                    "tools_used": tools_executed
                }

            candidates = resp_data.get("candidates", [])
            if not candidates:
                return {"reply": "Transmission empty, sir.", "tools_used": tools_executed}

            content = candidates[0].get("content", {})
            parts = content.get("parts", [])
            function_calls = [p["functionCall"] for p in parts if "functionCall" in p]

            if not function_calls:
                text_response = "".join([p.get("text", "") for p in parts]).strip() or "At your command, sir."
                if self.memory:
                    self.memory.add_message(session_id, "user", user_message)
                    self.memory.add_message(session_id, "assistant", text_response)
                return {"reply": text_response, "tools_used": tools_executed}

            # Function call requested by model
            history_contents.append(content)
            response_parts = []
            for fc in function_calls:
                fname = fc.get("name")
                fargs = fc.get("args", {})
                res = self.tool_registry.execute_tool(fname, fargs) if self.tool_registry else {}
                tools_executed.append({"name": fname, "args": fargs, "result": res})
                response_parts.append({
                    "functionResponse": {"name": fname, "response": {"name": fname, "content": res}}
                })

            history_contents.append({"role": "user", "parts": response_parts})

        return {"reply": "Operational steps completed, sir.", "tools_used": tools_executed}
