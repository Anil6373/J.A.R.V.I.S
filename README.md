# Project JARVIS — Personal AI Assistant for Windows

An executive personal AI assistant inspired by Iron Man's JARVIS, engineered for Windows 10 and 11 laptops. Powered by **Google Gemini** through the official Google Gen AI architecture, JARVIS features real-time voice interaction, an animated holographic Arc Reactor, persistent SQLite memory, live hardware telemetry, and an allowlisted Windows computer-control tool suite.

---

## Key Features

- **Google Gemini Cognitive Core**: Official `@google/genai` TypeScript SDK and Python client with multi-turn function calling, context memory injection, and strict secret protection.
- **Natural Voice Interaction**: Web Speech API with composed British voices, dynamic audio waveform visualizer, instant speech interruption, and configurable wake-word listener ("Hey JARVIS").
- **Holographic Arc Reactor HUD**: Animated central reactor displaying real-time states (Standby, Acoustic Reception, Neural Cognition, Vocal Synthesis, and System Alert).
- **Persistent Neural Memory**: Local SQLite database storing user facts, preferences, project notes, and conversation turns across sessions with keyword retrieval and zero data leakage.
- **Real Windows Hardware Telemetry**: Live CPU load, RAM utilization (GB and %), Primary Disk (C:) storage meters, Power/Battery status with charging detection, and Host Network monitoring.
- **Strictly Allowlisted Computer Control**: Structured function tools to launch approved Windows applications (Calculator, Notepad, File Explorer, Terminal, VS Code, Browser), open verified URLs, and search files in approved user folders.
- **Security & Privacy Architecture**: Path traversal prevention, scheme validation, allowlist enforcement, master killswitch, and automatic secret scrubbing from traces and audit logs.

---

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Canvas Web Audio Spectrum Visualizer
- **Backend**: Multi-threaded Python server + Node.js / Express proxy router
- **AI**: `@google/genai` (SDK 2.4.0) with `gemini-3.8-flash` / `gemini-2.5-flash`
- **Database**: Local SQLite (`jarvis_memory.db`) & JSON persistence (`jarvis_data/`)
- **Desktop Packaging**: Microsoft Edge App Mode runner (`run_jarvis.py`), PyInstaller, and Tauri 2 (`src-tauri/`)

---

## Getting Started

### 1. Web Preview & Development Mode
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 2. Standalone Windows Desktop Launcher
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
npm run build
python run_jarvis.py
```

### 3. Automated Tests
Run the test suite (100% mocked, requires no paid API calls):
```bash
python3 -m unittest discover -s tests
```
All 21 tests pass out of the box.

---

## Security Model

1. **No Arbitrary Shell Execution**: The model is restricted to structured function calling declarations.
2. **Approved Directory Boundaries**: File search operations cannot escape approved user directories (e.g., Documents, Desktop, Downloads, Projects).
3. **Application Allowlist**: Only pre-approved executables (`calc.exe`, `notepad.exe`, `explorer.exe`, `cmd.exe`, `taskmgr.exe`, `code.cmd`, `msedge.exe`, `chrome.exe`, `wt.exe`) can be launched.
4. **URL Scheme Whitelist**: Only `http://` and `https://` destinations are permitted; `file://`, `javascript:`, `powershell:`, and loopback IP addresses are blocked.
5. **Secret Redaction**: API keys and bearer tokens are automatically scrubbed from logs and user-facing traces.
