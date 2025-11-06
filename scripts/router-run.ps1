param([ValidateSet("sepolia","somnia")] [string]$Network = $env:NETWORK)
if (-not $Network) { $Network = "sepolia" }
Write-Host "Starting router for $Network ..."
Push-Location ..\backend_router
$env:NETWORK=$Network
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python router.py
Pop-Location
