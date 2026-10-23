import unittest
from backend.tools.monitor import SystemMonitor

class TestSystemMonitor(unittest.TestCase):
    def setUp(self):
        self.monitor = SystemMonitor()

    def test_get_metrics_structure(self):
        metrics = self.monitor.get_metrics()
        self.assertIn("os", metrics)
        self.assertIn("cpu_percent", metrics)
        self.assertIn("ram_percent", metrics)
        self.assertIn("ram_total_gb", metrics)
        self.assertIn("disk_percent", metrics)
        self.assertIn("network_online", metrics)
        self.assertIn("timestamp", metrics)

    def test_values_within_physical_bounds(self):
        metrics = self.monitor.get_metrics()
        self.assertGreaterEqual(metrics["cpu_percent"], 0.0)
        self.assertLessEqual(metrics["cpu_percent"], 100.0)
        self.assertGreaterEqual(metrics["ram_percent"], 0.0)
        self.assertLessEqual(metrics["ram_percent"], 100.0)

if __name__ == "__main__":
    unittest.main()
