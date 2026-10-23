import unittest
import os
from backend.security.validator import SecurityValidator

class TestSecurityValidator(unittest.TestCase):
    def setUp(self):
        self.temp_dir = os.path.realpath(os.path.abspath("test_approved_dir"))
        os.makedirs(self.temp_dir, exist_ok=True)
        self.validator = SecurityValidator(approved_directories=[self.temp_dir])

    def tearDown(self):
        if os.path.exists(self.temp_dir):
            try:
                os.rmdir(self.temp_dir)
            except Exception:
                pass

    def test_url_validation_valid(self):
        self.assertTrue(self.validator.validate_url("https://www.google.com"))
        self.assertTrue(self.validator.validate_url("http://github.com/project"))

    def test_url_validation_invalid_schemes(self):
        self.assertFalse(self.validator.validate_url("file:///etc/passwd"))
        self.assertFalse(self.validator.validate_url("javascript:alert(1)"))
        self.assertFalse(self.validator.validate_url("ftp://server.local"))
        self.assertFalse(self.validator.validate_url("powershell:iex(...)"))

    def test_url_validation_loopback_blocked(self):
        self.assertFalse(self.validator.validate_url("http://localhost:8080/admin"))
        self.assertFalse(self.validator.validate_url("http://127.0.0.1:3000"))

    def test_path_traversal_prevention(self):
        inside = os.path.join(self.temp_dir, "notes.txt")
        self.assertTrue(self.validator.validate_path(inside))

        outside = os.path.join(self.temp_dir, "..", "..", "windows", "system32")
        self.assertFalse(self.validator.validate_path(outside))

    def test_app_allowlist(self):
        self.assertEqual(self.validator.validate_app("notepad"), "notepad.exe")
        self.assertEqual(self.validator.validate_app("calculator"), "calc.exe")
        self.assertIsNone(self.validator.validate_app("powershell.exe -enc ..."))
        self.assertIsNone(self.validator.validate_app("malicious_script.bat"))

    def test_secret_redaction(self):
        raw = "Error calling Gemini key=AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567 with Bearer secret_token_xyz"
        cleaned = SecurityValidator.redact_secrets(raw)
        self.assertNotIn("AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567", cleaned)
        self.assertIn("[REDACTED_API_KEY]", cleaned)
        self.assertIn("[REDACTED_TOKEN]", cleaned)

if __name__ == "__main__":
    unittest.main()
