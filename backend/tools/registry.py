"""
Tool registry and schema declarations for Google Gen AI function calling
"""
from typing import Dict, Any, List
from .system_tools import SystemToolService

class ToolRegistry:
    def __init__(self, tool_service: SystemToolService):
        self.service = tool_service

    def get_declarations(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "open_application",
                "description": "Opens an approved Windows application (notepad, calculator, explorer, cmd, taskmgr, code, edge, chrome, terminal).",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "app_name": {"type": "STRING", "description": "The exact application name"}
                    },
                    "required": ["app_name"]
                }
            },
            {
                "name": "open_website",
                "description": "Opens an HTTP/HTTPS URL in the default Windows web browser.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "url": {"type": "STRING", "description": "Destination URL"}
                    },
                    "required": ["url"]
                }
            },
            {
                "name": "search_files",
                "description": "Searches for files by name in approved user folders (Documents, Downloads, Desktop, Projects).",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "query": {"type": "STRING", "description": "Filename or substring to search for"}
                    },
                    "required": ["query"]
                }
            },
            {
                "name": "read_system_stats",
                "description": "Reads real-time hardware telemetry: CPU, RAM, Disk, and Battery status.",
                "parameters": {"type": "OBJECT", "properties": {}}
            },
            {
                "name": "get_system_time",
                "description": "Returns current date and time from the Windows OS.",
                "parameters": {"type": "OBJECT", "properties": {}}
            },
            {
                "name": "create_local_note",
                "description": "Archives a new note into local persistent storage.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "title": {"type": "STRING"},
                        "content": {"type": "STRING"}
                    },
                    "required": ["title", "content"]
                }
            },
            {
                "name": "search_local_notes",
                "description": "Searches stored local notes for keywords.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "query": {"type": "STRING"}
                    },
                    "required": ["query"]
                }
            },
            {
                "name": "save_personal_memory",
                "description": "Stores user facts, preferences, or project notes into permanent SQLite memory.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "category": {"type": "STRING"},
                        "key": {"type": "STRING"},
                        "value": {"type": "STRING"}
                    },
                    "required": ["category", "key", "value"]
                }
            },
            {
                "name": "search_personal_memories",
                "description": "Queries stored personal memories.",
                "parameters": {
                    "type": "OBJECT",
                    "properties": {
                        "query": {"type": "STRING"}
                    },
                    "required": ["query"]
                }
            }
        ]

    def execute_tool(self, name: str, args: Dict[str, Any]) -> Dict[str, Any]:
        if not self.service.validator.tools_enabled:
            return {"success": False, "error": "System tools are disabled by master security switch."}

        handler = getattr(self.service, name, None)
        if not handler:
            return {"success": False, "error": f"Tool '{name}' not found."}
        try:
            return handler(**args)
        except Exception as e:
            return {"success": False, "error": str(e)}
