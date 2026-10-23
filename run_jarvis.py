#!/usr/bin/env python3
"""
JARVIS Desktop Application Launcher for Windows
------------------------------------------------
Initializes the JARVIS Core background server and launches the futuristic HUD interface.
"""
import os
import sys
import time
import webbrowser
import threading
import subprocess

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from backend.server import JarvisServer

def launch_windows_app_window(url: str):
    edge_paths = [
        os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
        "msedge"
    ]
    for path in edge_paths:
        try:
            subprocess.Popen([path, f"--app={url}", "--window-size=1280,840"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return True
        except Exception:
            continue

    webbrowser.open(url)
    return False

def main():
    port = int(os.getenv("PORT", 8080))
    host = os.getenv("HOST", "127.0.0.1")

    print("=" * 60)
    print("  PROJECT JARVIS - JUST A RATHER VERY INTELLIGENT SYSTEM")
    print("  Designed for Windows | Powered by Google Gemini")
    print("=" * 60)

    server = JarvisServer(host=host, port=port, web_dir="dist")
    threading.Thread(target=server.run, daemon=True).start()

    time.sleep(1.0)
    app_url = f"http://{host}:{port}"
    print(f"[*] Core active at: {app_url}")
    print("[*] Holographic Desktop HUD launched.")

    if sys.platform == "win32":
        launch_windows_app_window(app_url)
    else:
        webbrowser.open(app_url)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n[*] Shutting down JARVIS systems. Farewell, Sir.")

if __name__ == "__main__":
    main()
