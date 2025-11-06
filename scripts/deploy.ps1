param([ValidateSet("sepolia","somnia")] [string]$Network = $env:NETWORK)
if (-not $Network) { $Network = "sepolia" }
Write-Host "Deploying contracts to $Network ..."
Push-Location ..\contracts
$env:NETWORK = $Network
npx hardhat compile
npx hardhat run scripts\deploy.js --network $Network
Pop-Location
