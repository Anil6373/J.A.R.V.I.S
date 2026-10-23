"""
Security validation module for JARVIS:
- Path traversal prevention
- Approved directories allowlist
- Application execution allowlist
- URL scheme validation
- Secret redaction from logs and error traces
"""
import os
import re
from typing import Optional, List, Dict

class SecurityValidator:
    ALLOWED_SCHEMES = {'http', 'https'}

    def __init__(self, approved_directories: Optional[List[str]] = None, app_allowlist: Optional[Dict[str, str]] = None):
        user_home = os.path.expanduser("~")
        default_dirs = [
            os.path.join(user_home, "Documents"),
            os.path.join(user_home, "Downloads"),
            os.path.join(user_home, "Desktop"),
            os.path.join(user_home, "Projects"),
            os.path.join(user_home, "JARVIS_Notes"),
            os.path.realpath(os.getcwd())
        ]
        self.approved_directories = [
            os.path.realpath(d) for d in (approved_directories or default_dirs)
        ]

        self.app_allowlist = app_allowlist or {
            "notepad": "notepad.exe",
            "calculator": "calc.exe",
            "explorer": "explorer.exe",
            "cmd": "cmd.exe",
            "taskmgr": "taskmgr.exe",
            "code": "code.cmd",
            "edge": "msedge.exe",
            "chrome": "chrome.exe",
            "terminal": "wt.exe"
        }
        self.tools_enabled = True

    def validate_url(self, url: str) -> bool:
        if not url or not isinstance(url, str):
            return False
        url_strip = url.strip()
        match = re.match(r'^([a-zA-Z0-9+-.]+):', url_strip)
        if not match:
            return False
        scheme = match.group(1).lower()
        if scheme not in self.ALLOWED_SCHEMES:
            return False
        lower = url_strip.lower()
        if 'localhost' in lower or '127.0.0.1' in lower or 'file://' in lower or 'javascript:' in lower:
            return False
        return True

    def validate_path(self, path: str) -> bool:
        if not path or not isinstance(path, str):
            return False
        try:
            resolved = os.path.realpath(os.path.abspath(path))
            return any(resolved == app_dir or resolved.startswith(app_dir + os.sep)
                       for app_dir in self.approved_directories)
        except Exception:
            return False

    def validate_app(self, app_name: str) -> Optional[str]:
        if not app_name or not isinstance(app_name, str):
            return None
        cleaned = app_name.strip().lower()
        return self.app_allowlist.get(cleaned)

    @staticmethod
    def redact_secrets(text: str) -> str:
        if not text:
            return ""
        text = str(text)
        # Redact Google API keys: AIzaSy...
        text = re.sub(r'AIzaSy[A-Za-z0-9_-]{33}', '[REDACTED_API_KEY]', text)
        # Redact generic bearer tokens
        text = re.sub(r'Bearer\s+[A-Za-z0-9_.-]+', 'Bearer [REDACTED_TOKEN]', text, flags=re.IGNORECASE)
        # Redact query param key=AIza...
        text = re.sub(r'key=[A-Za-z0-9_-]{20,}', 'key=[REDACTED_KEY]', text, flags=re.IGNORECASE)
        return text
