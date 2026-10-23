"""
System control tools service for Windows laptop
"""
import os
import subprocess
import webbrowser
import platform
from datetime import datetime
from typing import Dict, Any, Optional
from ..security.validator import SecurityValidator
from ..memory.db import MemoryManager
from .monitor import SystemMonitor

class SystemToolService:
    def __init__(self, validator: SecurityValidator, memory: MemoryManager, monitor: SystemMonitor):
        self.validator = validator
        self.memory = memory
        self.monitor = monitor

    def open_application(self, app_name: str) -> Dict[str, Any]:
        executable = self.validator.validate_app(app_name)
        if not executable:
            self.memory.log_action("open_application", {"app_name": app_name}, "BLOCKED", "Not in allowlist")
            return {"success": False, "error": f"Application '{app_name}' is not in the approved allowlist."}

        try:
            if platform.system() == "Windows":
                subprocess.Popen([executable], shell=False)
            self.memory.log_action("open_application", {"app_name": app_name}, "SUCCESS", f"Launched {executable}")
            return {"success": True, "message": f"Successfully launched {app_name} ({executable})."}
        except Exception as e:
            err = self.validator.redact_secrets(str(e))
            self.memory.log_action("open_application", {"app_name": app_name}, "ERROR", err)
            return {"success": False, "error": err}

    def open_website(self, url: str) -> Dict[str, Any]:
        if not self.validator.validate_url(url):
            self.memory.log_action("open_website", {"url": url}, "BLOCKED", "Invalid/unsafe URL")
            return {"success": False, "error": f"The URL '{url}' is unauthorized or unsafe. Only HTTP and HTTPS are permitted."}

        try:
            webbrowser.open(url)
            self.memory.log_action("open_website", {"url": url}, "SUCCESS", f"Opened {url}")
            return {"success": True, "message": f"Navigating to {url}."}
        except Exception as e:
            err = self.validator.redact_secrets(str(e))
            return {"success": False, "error": err}

    def search_files(self, query: str, target_folder: Optional[str] = None, max_results: int = 15) -> Dict[str, Any]:
        if not query or len(query.strip()) < 2:
            return {"success": False, "error": "Search query must be at least 2 characters long."}

        search_roots = self.validator.approved_directories
        if target_folder:
            resolved_target = os.path.realpath(target_folder)
            if not self.validator.validate_path(resolved_target):
                return {"success": False, "error": f"Path '{target_folder}' is outside approved directories."}
            search_roots = [resolved_target]

        results = []
        q_lower = query.strip().lower()
        for root_dir in search_roots:
            if not os.path.exists(root_dir):
                continue
            for dirpath, _, filenames in os.walk(root_dir):
                for fname in filenames:
                    if q_lower in fname.lower():
                        fpath = os.path.join(dirpath, fname)
                        try:
                            stat = os.stat(fpath)
                            results.append({
                                "name": fname,
                                "path": fpath,
                                "size_bytes": stat.st_size,
                                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
                            })
                            if len(results) >= max_results:
                                break
                        except (PermissionError, FileNotFoundError):
                            continue
                if len(results) >= max_results:
                    break

        self.memory.log_action("search_files", {"query": query}, "SUCCESS", f"Found {len(results)} matches")
        return {"success": True, "query": query, "count": len(results), "files": results}

    def read_system_stats(self) -> Dict[str, Any]:
        stats = self.monitor.get_metrics()
        self.memory.log_action("read_system_stats", {}, "SUCCESS", "Metrics retrieved")
        return {"success": True, "telemetry": stats}

    def get_system_time(self) -> Dict[str, Any]:
        now = datetime.now()
        return {"success": True, "formatted_time": now.strftime("%A, %B %d, %Y at %I:%M:%S %p")}

    def create_local_note(self, title: str, content: str) -> Dict[str, Any]:
        note_id = self.memory.save_note(title.strip(), content.strip())
        self.memory.log_action("create_local_note", {"title": title}, "SUCCESS", f"Note #{note_id}")
        return {"success": True, "note_id": note_id, "message": f"Note '{title}' saved."}

    def search_local_notes(self, query: str) -> Dict[str, Any]:
        notes = self.memory.search_notes(query)
        return {"success": True, "count": len(notes), "notes": notes}

    def save_personal_memory(self, category: str, key: str, value: str) -> Dict[str, Any]:
        self.memory.save_memory(category or "general", key, value)
        self.memory.log_action("save_personal_memory", {"key": key}, "SUCCESS", "Memory stored")
        return {"success": True, "message": f"Recorded: '{key}' is '{value}'."}

    def search_personal_memories(self, query: str) -> Dict[str, Any]:
        memories = self.memory.search_memories(query)
        return {"success": True, "count": len(memories), "memories": memories}
