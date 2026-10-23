import unittest
import os
from backend.memory.db import MemoryManager

class TestMemoryManager(unittest.TestCase):
    def setUp(self):
        self.db_path = "test_memory.db"
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        self.manager = MemoryManager(self.db_path)

    def tearDown(self):
        self.manager.conn.close()
        if os.path.exists(self.db_path):
            try:
                os.remove(self.db_path)
            except Exception:
                pass

    def test_save_and_retrieve_memory(self):
        self.manager.save_memory("preference", "theme", "dark_cyan")
        memories = self.manager.get_memories()
        self.assertEqual(len(memories), 1)
        self.assertEqual(memories[0]["key"], "theme")
        self.assertEqual(memories[0]["value"], "dark_cyan")

    def test_search_memories(self):
        self.manager.save_memory("preference", "wake_hour", "07:00 AM")
        self.manager.save_memory("fact", "favorite_editor", "VS Code")
        results = self.manager.search_memories("editor")
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["key"], "favorite_editor")

    def test_context_memory_retrieval(self):
        self.manager.save_memory("project", "iron_suit", "Mark 85 armor diagnostic")
        matches = self.manager.get_context_memories("Please check status of iron_suit")
        self.assertGreaterEqual(len(matches), 1)
        self.assertEqual(matches[0]["key"], "iron_suit")

    def test_conversation_history(self):
        self.manager.add_message("test_sess", "user", "System status report")
        self.manager.add_message("test_sess", "assistant", "All systems operational, Sir.")
        history = self.manager.get_recent_history("test_sess")
        self.assertEqual(len(history), 2)
        self.assertEqual(history[0]["role"], "user")
        self.assertEqual(history[1]["role"], "assistant")

    def test_clear_all_memories_requires_confirmation(self):
        self.manager.save_memory("fact", "secure_code", "4291")
        with self.assertRaises(ValueError):
            self.manager.clear_all_memories(confirmed=False)

        self.manager.clear_all_memories(confirmed=True)
        self.assertEqual(len(self.manager.get_memories()), 0)

if __name__ == "__main__":
    unittest.main()
