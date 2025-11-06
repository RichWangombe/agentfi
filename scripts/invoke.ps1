param(
  [ValidateSet("sepolia","somnia")] [string]$Network = $env:NETWORK,
  [int]$AgentId = 1,
  [string]$ValueWei = "1000000000000000"
)
if (-not $Network) { $Network = "sepolia" }
Write-Host "Invoking agent $AgentId on $Network with $ValueWei wei..."
Push-Location ..\contracts
$env:NETWORK=$Network
$env:AGENT_ID="$AgentId"
$env:VALUE_WEI=$ValueWei
npx hardhat run scripts\invoke.js --network $Network
Pop-Location
