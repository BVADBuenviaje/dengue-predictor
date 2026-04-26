# Web App Quick Start (View the Page)

This guide is only for running the dashboard and seeing it work in your browser.

## What you need
- VS Code terminal
- Python virtual environment already in this project: `.venv`
- Node.js and npm installed

## Start the app (use 2 terminals)
You must run backend and frontend at the same time.

### Terminal 1: Start backend (FastAPI)
```powershell
cd "web-app\backend"
..\..\.venv\Scripts\python.exe -m pip install -r requirements.txt
..\..\.venv\Scripts\python.exe -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Expected output includes:
- `Uvicorn running on http://127.0.0.1:8000`

### Terminal 2: Start frontend (Vite + React)
```powershell
cd "web-app\frontend"
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Expected output includes:
- `Local: http://127.0.0.1:5173/`

## Open the webpage
Open this URL in your browser:
- http://127.0.0.1:5173/

## Confirm everything works
1. Page loads successfully.
2. Fill the form in Prediction Dashboard.
3. Click `Run Prediction`.
4. You receive a result card (not `Prediction request failed`).

## Quick checks if something fails
- Backend check:
  - Open http://127.0.0.1:8000/health
  - Should return: `{"status":"ok"}`
- Frontend check:
  - Open http://127.0.0.1:5173/
- If `Prediction request failed` appears:
  - Make sure both terminals are still running.
  - Restart frontend after config changes.
  - Ensure backend is running on port `8000`.

## Stop the servers
- Click each terminal and press `Ctrl + C`.
