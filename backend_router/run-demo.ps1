# Run the AgentFi router locally on Windows
# 1) Ensure Python 3.10+ installed
# 2) From this folder, run: powershell -ExecutionPolicy Bypass -File .\run-demo.ps1

$ErrorActionPreference = "Stop"

Write-Host "[Router] Creating virtual environment..."
if (-not (Test-Path .\.venv)) {
  python -m venv .venv
}

Write-Host "[Router] Activating virtual environment..."
. .\.venv\Scripts\Activate.ps1

Write-Host "[Router] Installing requirements..."
pip install --upgrade pip
pip install -r requirements.txt

if (-not (Test-Path .\.env)) {
  if (Test-Path .\env.example) {
    Write-Host "[Router] Creating .env from env.example (edit values before running again)" -ForegroundColor Yellow
    Copy-Item .\env.example .\.env -Force
    Write-Host "Edit .env and re-run this script." -ForegroundColor Yellow
    exit 0
  } else {
    Write-Host "env.example not found. Please create .env manually." -ForegroundColor Red
    exit 1
  }
}

if (-not (Test-Path .\abis\AgentCallManagerWithVerify.json)) {
  Write-Host "ABI missing: backend_router/abis/AgentCallManagerWithVerify.json" -ForegroundColor Yellow
  Write-Host "After compiling contracts, copy the ABI JSON from contracts/artifacts/... to backend_router/abis/." -ForegroundColor Yellow
}

Write-Host "[Router] Starting poller..."
python .\router.py
