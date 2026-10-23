"""
Windows Speech API (SAPI5) and PowerShell vocalization fallback
"""
import platform
import subprocess
import threading
from typing import Optional

class WindowsVoiceEngine:
    def __init__(self, voice_name: Optional[str] = None, rate: int = 1):
        self.voice_name = voice_name
        self.rate = rate
        self.current_proc: Optional[subprocess.Popen] = None
        self.lock = threading.Lock()

    def speak(self, text: str, block: bool = False):
        if not text or not text.strip():
            return
        clean_text = text.replace('"', '""').replace("`", " ")

        def _run():
            with self.lock:
                self.stop()
                if platform.system() == "Windows":
                    ps_script = f"""
                    Add-Type -AssemblyName System.Speech;
                    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
                    $synth.Rate = {self.rate};
                    $synth.Speak("{clean_text}");
                    """
                    try:
                        self.current_proc = subprocess.Popen(
                            ["powershell", "-NoProfile", "-NonInteractive", "-Command", ps_script],
                            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0)
                        )
                        self.current_proc.wait()
                    except Exception:
                        pass

        if block:
            _run()
        else:
            threading.Thread(target=_run, daemon=True).start()

    def stop(self):
        with self.lock:
            if self.current_proc and self.current_proc.poll() is None:
                try:
                    self.current_proc.terminate()
                except Exception:
                    pass
                self.current_proc = None
