"""
Multi-threaded HTTP and REST API server for Python desktop runtime
"""
import os
import json
import urllib.parse
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from typing import Dict, Any

from .security.validator import SecurityValidator
from .memory.db import MemoryManager
from .tools.monitor import SystemMonitor
from .tools.system_tools import SystemToolService
from .tools.registry import ToolRegistry
from .voice.native_tts import WindowsVoiceEngine
from .ai.gemini_client import GeminiClient

class JarvisServer:
    def __init__(self, host: str = "127.0.0.1", port: int = 8080, db_path: str = "jarvis_memory.db", web_dir: str = "dist"):
        self.host = host
        self.port = port
        self.web_dir = web_dir
        self.validator = SecurityValidator()
        self.memory = MemoryManager(db_path)
        self.monitor = SystemMonitor()
        self.tool_service = SystemToolService(self.validator, self.memory, self.monitor)
        self.tool_registry = ToolRegistry(self.tool_service)
        self.voice = WindowsVoiceEngine()
        self.gemini = GeminiClient(
            api_key=os.getenv("GEMINI_API_KEY", ""),
            model=os.getenv("GEMINI_MODEL", "gemini-3.8-flash"),
            tool_registry=self.tool_registry,
            memory_manager=self.memory,
            validator=self.validator
        )

    @staticmethod
    def create_handler(server_instance):
        class JarvisHandler(SimpleHTTPRequestHandler):
            def __init__(self, *args, **kwargs):
                self.server_instance = server_instance
                kwargs["directory"] = server_instance.web_dir if os.path.isdir(server_instance.web_dir) else "."
                super().__init__(*args, **kwargs)

            def _send_cors(self):
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
                self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

            def _send_json(self, status: int, data: Dict[str, Any]):
                b = json.dumps(data).encode("utf-8")
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(b)))
                self._send_cors()
                self.end_headers()
                self.wfile.write(b)

            def do_OPTIONS(self):
                self.send_response(204)
                self._send_cors()
                self.end_headers()

            def do_GET(self):
                path = urllib.parse.urlparse(self.path).path
                if path == "/api/status":
                    stats = self.server_instance.monitor.get_metrics()
                    self._send_json(200, {
                        "online": True,
                        "os": stats["os"],
                        "gemini_connected": bool(self.server_instance.gemini.api_key),
                        "model": self.server_instance.gemini.model,
                        "tools_enabled": self.server_instance.validator.tools_enabled,
                        "network_online": stats["network_online"]
                    })
                elif path == "/api/system/stats":
                    self._send_json(200, self.server_instance.monitor.get_metrics())
                elif path == "/api/chat/history":
                    self._send_json(200, {"history": self.server_instance.memory.get_recent_history("default", 50)})
                elif path == "/api/memories":
                    self._send_json(200, {"memories": self.server_instance.memory.get_memories()})
                elif path == "/api/tools":
                    self._send_json(200, {
                        "tools": self.server_instance.tool_registry.get_declarations(),
                        "allowed_apps": list(self.server_instance.validator.app_allowlist.keys()),
                        "approved_directories": self.server_instance.validator.approved_directories,
                        "tools_enabled": self.server_instance.validator.tools_enabled
                    })
                elif path == "/api/logs":
                    self._send_json(200, {"logs": self.server_instance.memory.get_action_logs(50)})
                elif path == "/api/settings":
                    self._send_json(200, {
                        "model": self.server_instance.gemini.model,
                        "tools_enabled": self.server_instance.validator.tools_enabled
                    })
                else:
                    super().do_GET()

            def do_POST(self):
                path = urllib.parse.urlparse(self.path).path
                l = int(self.headers.get("Content-Length", 0))
                payload = json.loads(self.rfile.read(l).decode("utf-8")) if l > 0 else {}

                if path == "/api/chat":
                    msg = payload.get("message", "")
                    res = self.server_instance.gemini.chat(msg, session_id=payload.get("session_id", "default"))
                    self._send_json(200, res)
                elif path == "/api/chat/clear":
                    self.server_instance.memory.clear_history()
                    self._send_json(200, {"success": True})
                elif path == "/api/memories":
                    self.server_instance.memory.save_memory(payload.get("category", "preference"), payload.get("key"), payload.get("value"))
                    self._send_json(200, {"success": True})
                elif path == "/api/memories/clear":
                    self.server_instance.memory.clear_all_memories(confirmed=payload.get("confirmed", False))
                    self._send_json(200, {"success": True})
                elif path == "/api/tools/execute":
                    res = self.server_instance.tool_registry.execute_tool(payload.get("name") or payload.get("tool_name"), payload.get("arguments", {}))
                    self._send_json(200, res)
                elif path == "/api/voice/speak":
                    self.server_instance.voice.speak(payload.get("text", ""))
                    self._send_json(200, {"success": True})
                elif path == "/api/voice/stop":
                    self.server_instance.voice.stop()
                    self._send_json(200, {"success": True})
                elif path == "/api/settings":
                    if payload.get("model"):
                        self.server_instance.gemini.update_config(model=payload["model"])
                    if "tools_enabled" in payload:
                        self.server_instance.validator.tools_enabled = bool(payload["tools_enabled"])
                    self._send_json(200, {"success": True})
                else:
                    self._send_json(404, {"error": "Not Found"})

            def do_DELETE(self):
                path = urllib.parse.urlparse(self.path).path
                if path.startswith("/api/memories/"):
                    mem_id = int(path.split("/")[-1])
                    self._send_json(200, {"success": self.server_instance.memory.delete_memory(mem_id)})
                else:
                    self._send_json(404, {"error": "Not Found"})

        return JarvisHandler

    def run(self):
        handler_cls = JarvisServer.create_handler(self)
        httpd = ThreadingHTTPServer((self.host, self.port), handler_cls)
        print(f"[*] JARVIS Core online at http://{self.host}:{self.port}")
        httpd.serve_forever()
