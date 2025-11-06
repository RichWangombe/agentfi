param([ValidateSet("sepolia","somnia")] [string]$Network = "sepolia")
$env:NETWORK = $Network
Write-Host "Switched NETWORK=$Network"
Write-Host "contracts -> .env.$Network"
Write-Host "backend_router -> .env.$Network"
