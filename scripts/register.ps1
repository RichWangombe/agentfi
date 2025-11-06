param(
  [ValidateSet("sepolia","somnia")] [string]$Network = $env:NETWORK,
  [string]$Name = "AI DeFi Analyzer",
  [string]$Uri = "ipfs://demo",
  [string]$FeeWei = "1000000000000000",
  [string]$Signer = "<ROUTER_ADDRESS>"
)
if (-not $Network) { $Network = "sepolia" }
Write-Host "Registering agent on $Network ..."
Push-Location ..\contracts
$env:NETWORK=$Network
$env:AGENT_NAME=$Name
$env:AGENT_URI=$Uri
$env:AGENT_FEE=$FeeWei
$env:AGENT_SIGNER=$Signer
npx hardhat run scripts\register.js --network $Network
Pop-Location
