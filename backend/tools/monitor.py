"""
Hardware telemetry collector for Windows and POSIX hosts
"""
import os
import platform
import shutil
import subprocess
import socket
from datetime import datetime
from typing import Dict, Any

class SystemMonitor:
    def __init__(self):
        self.is_windows = platform.system() == "Windows"

    def get_metrics(self) -> Dict[str, Any]:
        metrics = {
            "os": f"{platform.system()} {platform.release()}",
            "hostname": socket.gethostname(),
            "platform": platform.system().lower(),
            "uptimeSeconds": 3600,
            "cpu_percent": 0.0,
            "ram_percent": 0.0,
            "ram_used_gb": 0.0,
            "ram_total_gb": 0.0,
            "disk_percent": 0.0,
            "disk_used_gb": 0.0,
            "disk_total_gb": 0.0,
            "battery_percent": None,
            "is_charging": None,
            "network_online": self.check_network(),
            "timestamp": datetime.now().isoformat()
        }

        # 1. Try psutil if installed
        try:
            import psutil
            metrics["cpu_percent"] = float(psutil.cpu_percent(interval=0.05))
            mem = psutil.virtual_memory()
            metrics["ram_percent"] = float(mem.percent)
            metrics["ram_used_gb"] = round((mem.total - mem.available) / (1024**3), 2)
            metrics["ram_total_gb"] = round(mem.total / (1024**3), 2)
            
            root_drive = 'C:\\' if self.is_windows else '/'
            disk = psutil.disk_usage(root_drive)
            metrics["disk_percent"] = float(disk.percent)
            metrics["disk_used_gb"] = round(disk.used / (1024**3), 2)
            metrics["disk_total_gb"] = round(disk.total / (1024**3), 2)

            battery = psutil.sensors_battery()
            if battery:
                metrics["battery_percent"] = round(battery.percent, 1)
                metrics["is_charging"] = bool(battery.power_plugged)
            return metrics
        except ImportError:
            pass
        except Exception:
            pass

        # 2. Windows CIM fallback
        if self.is_windows:
            self._fill_windows_cim_stats(metrics)
            return metrics

        # 3. POSIX fallback
        self._fill_posix_stats(metrics)
        return metrics

    def check_network(self, host: str = "8.8.8.8", port: int = 53, timeout: float = 1.0) -> bool:
        try:
            socket.setdefaulttimeout(timeout)
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.connect((host, port))
            return True
        except Exception:
            return False

    def _fill_posix_stats(self, metrics: Dict[str, Any]):
        try:
            total, used, free = shutil.disk_usage('/')
            metrics["disk_total_gb"] = round(total / (1024**3), 2)
            metrics["disk_used_gb"] = round(used / (1024**3), 2)
            metrics["disk_percent"] = round((used / total) * 100, 1) if total else 0.0
        except Exception:
            pass

        if platform.system() == "Linux":
            try:
                with open("/proc/meminfo") as f:
                    mem = dict(line.split(":") for line in f if ":" in line)
                    total_kb = float(mem.get("MemTotal", "0").split()[0])
                    avail_kb = float(mem.get("MemAvailable", "0").split()[0])
                    if total_kb > 0:
                        metrics["ram_total_gb"] = round(total_kb / 1024 / 1024, 2)
                        metrics["ram_used_gb"] = round((total_kb - avail_kb) / 1024 / 1024, 2)
                        metrics["ram_percent"] = round(((total_kb - avail_kb) / total_kb) * 100, 1)
            except Exception:
                pass

    def _fill_windows_cim_stats(self, metrics: Dict[str, Any]):
        try:
            total, used, free = shutil.disk_usage('C:\\')
            metrics["disk_total_gb"] = round(total / (1024**3), 2)
            metrics["disk_used_gb"] = round(used / (1024**3), 2)
            metrics["disk_percent"] = round((used / total) * 100, 1) if total else 0.0
        except Exception:
            pass

        ps_cmd = (
            "powershell -NoProfile -Command \""
            "$cpu = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average;"
            "$os = Get-CimInstance Win32_OperatingSystem;"
            "$tot = [math]::Round($os.TotalVisibleMemorySize / 1MB, 2);"
            "$free = [math]::Round($os.FreePhysicalMemory / 1MB, 2);"
            "$batt = Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue;"
            "$bPct = if ($batt) { $batt.EstimatedChargeRemaining } else { -1 };"
            "$bChg = if ($batt) { $batt.BatteryStatus -eq 2 } else { $false };"
            "Write-Output \\\"$cpu,$tot,$free,$bPct,$bChg\\\""
            "\""
        )
        try:
            proc = subprocess.run(ps_cmd, shell=True, capture_output=True, text=True, timeout=2.0)
            if proc.returncode == 0 and proc.stdout.strip():
                parts = proc.stdout.strip().split(",")
                if len(parts) >= 3:
                    cpu = float(parts[0]) if parts[0] else 0.0
                    tot_gb = float(parts[1]) if parts[1] else 0.0
                    free_gb = float(parts[2]) if parts[2] else 0.0
                    used_gb = max(0.0, round(tot_gb - free_gb, 2))
                    metrics["cpu_percent"] = cpu
                    metrics["ram_total_gb"] = tot_gb
                    metrics["ram_used_gb"] = used_gb
                    metrics["ram_percent"] = round((used_gb / tot_gb) * 100, 1) if tot_gb else 0.0
                if len(parts) >= 5 and parts[3] != "-1":
                    metrics["battery_percent"] = float(parts[3])
                    metrics["is_charging"] = parts[4].strip().lower() == "true"
        except Exception:
            pass
