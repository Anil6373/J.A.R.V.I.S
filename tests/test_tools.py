import unittest
import os
from backend.security.validator import SecurityValidator
from backend.memory.db import MemoryManager
from backend.tools.monitor import SystemMonitor
from backend.tools.system_tools import SystemToolService
from backend.tools.registry import ToolRegistry

class TestTools(unittest.TestCase):
    def setUp(self):
        self.db_path = "test_tools_mem.db"
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        self.validator = SecurityValidator()
        self.memory = MemoryManager(self.db_path)
        self.monitor = SystemMonitor()
        self.service = SystemToolService(self.validator, self.memory, self.monitor)
        self.registry = ToolRegistry(self.service)

    def tearDown(self):
        self.memory.conn.close()
        if os.path.exists(self.db_path):
            try:
                os.remove(self.db_path)
            except Exception:
                pass

    def test_declarations_valid(self):
        decls = self.registry.get_declarations()
        self.assertIsInstance(decls, list)
        names = [d["name"] for d in decls]
        self.assertIn("open_application", names)
        self.assertIn("open_website", names)
        self.assertIn("search_files", names)
        self.assertIn("read_system_stats", names)
        self.assertIn("get_system_time", names)

    def test_open_application_allowlist(self):
        res = self.registry.execute_tool("open_application", {"app_name": "calculator"})
        self.assertTrue(res["success"])

        bad_res = self.registry.execute_tool("open_application", {"app_name": "cmd_injection; rm -rf /"})
        self.assertFalse(bad_res["success"])

    def test_open_website_validation(self):
        good = self.registry.execute_tool("open_website", {"url": "https://aistudio.google.com"})
        self.assertTrue(good["success"])

        bad = self.registry.execute_tool("open_website", {"url": "file:///C:/Windows/win.ini"})
        self.assertFalse(bad["success"])

    def test_system_time(self):
        res = self.registry.execute_tool("get_system_time", {})
        self.assertTrue(res["success"])
        self.assertIn("formatted_time", res)

    def test_tools_killswitch(self):
        self.validator.tools_enabled = False
        res = self.registry.execute_tool("open_application", {"app_name": "calculator"})
        self.assertFalse(res["success"])
        self.assertIn("disabled", res["error"])

if __name__ == "__main__":
    unittest.main()
