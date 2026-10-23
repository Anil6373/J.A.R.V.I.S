# Windows Setup & Deployment Guide — Project JARVIS

Follow these steps to run **Project JARVIS** natively on your Windows 10/11 laptop.

---

## Prerequisites
- **Windows 10 or 11** (64-bit)
- **Node.js 18+** or **20+**
- **Python 3.10+**
- **Google Gemini API Key** (Obtained free via [Google AI Studio](https://aistudio.google.com/))

---

## 1. Quick Launch (Python + Microsoft Edge App Mode)

This method provides an immediate, borderless native desktop experience using Edge's App Window runner without compiling Rust:

```powershell
# 1. Open PowerShell in the project directory
cd project-jarvis

# 2. Create and activate a Python virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Install Node dependencies and build the web bundle
npm install
npm run build

# 5. Set your Gemini API Key
$env:GEMINI_API_KEY="your-gemini-api-key-here"

# 6. Launch JARVIS
python run_jarvis.py
```

JARVIS will launch the background multi-threaded server on `127.0.0.1:8080` and open a standalone, clean window powered by Microsoft Edge.

---

## 2. Full-Stack Web Development Mode

To run in live development mode with Vite hot module replacement:

```powershell
$env:GEMINI_API_KEY="your-gemini-api-key-here"
npm install
npm run dev
```

Navigate to `http://localhost:3000` in Chrome or Edge.

---

## 3. Packaging as an Executable (.EXE)

### Option A: PyInstaller Standalone Package
```powershell
pip install pyinstaller
pyinstaller --noconfirm --onedir --windowed `
  --add-data "dist;dist" `
  --name "JARVIS" `
  run_jarvis.py
```
The output binary will be generated in `dist/JARVIS/JARVIS.exe`.

### Option B: Tauri 2 Desktop Binary
1. Install [Rust](https://rustup.rs/) and Microsoft Visual C++ Build Tools.
2. Build the desktop installer:
```powershell
npm run build
npm run tauri build
```
The Windows `.msi` and `.exe` will be generated in `src-tauri/target/release/bundle/`.

---

## 4. Troubleshooting & Verification

### Running the Test Suite
You can verify the security boundaries, SQLite memory persistence, and tool declarations at any time without spending API credits:
```powershell
python -m unittest discover -s tests
```

### Microphone Access
When launching for the first time, allow microphone access in Windows Settings (`Settings > Privacy & security > Microphone`).
