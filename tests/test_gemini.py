import unittest
from backend.ai.gemini_client import GeminiClient
from backend.security.validator import SecurityValidator

class TestGeminiClient(unittest.TestCase):
    def test_missing_api_key_safe_response(self):
        client = GeminiClient(api_key="")
        resp = client.chat("Status report")
        self.assertIn("cognitive core is inactive", resp["reply"])
        self.assertEqual(resp["tools_used"], [])

    def test_connection_test_without_key(self):
        client = GeminiClient(api_key="")
        conn = client.test_connection()
        self.assertFalse(conn["connected"])
        self.assertIn("No Gemini API key supplied", conn["error"])

    def test_model_update(self):
        client = GeminiClient(model="gemini-3.8-flash")
        client.update_config(model="gemini-2.5-flash")
        self.assertEqual(client.model, "gemini-2.5-flash")

if __name__ == "__main__":
    unittest.main()
