param(
  [switch]$GenerateRouterKey
)

$ErrorActionPreference = "Stop"

# Resolve important paths relative to this script
$Root = Split-Path -Parent $PSScriptRoot
$Contracts = Join-Path $Root "contracts"
$Router = Join-Path $Root "backend_router"

function Read-EnvFile($Path) {
  $map = @{}
  if (Test-Path $Path) {
    Get-Content $Path | ForEach-Object {
      $line = $_.Trim()
      if ($line -eq "" -or $line.StartsWith("#")) { return }
      $kv = $line -split "=", 2
      if ($kv.Length -eq 2) {
        $key = $kv[0].Trim()
        $val = $kv[1].Trim()
        $map[$key] = $val
      }
    }
  }
  return $map
}

function Write-EnvFile($Path, $Map) {
  $lines = @()
  foreach ($k in $Map.Keys) {
    $lines += "$k=$($Map[$k])"
  }
  Set-Content -Path $Path -Value ($lines -join "`n") -Encoding UTF8
}

# 1) Ensure contracts/.env exists
$ContractsEnv = Join-Path $Contracts ".env"
if (-not (Test-Path $ContractsEnv)) {
  $Example = Join-Path $Contracts "env.example"
  if (Test-Path $Example) {
    Copy-Item $Example $ContractsEnv -Force
    Write-Host "[INFO] Created $ContractsEnv from env.example. Edit it with your RPC/CHAIN_ID/PRIVATE_KEY, then re-run this script." -ForegroundColor Yellow
    exit 0
  } else {
    throw "Missing $ContractsEnv and env.example"
  }
}

# 2) Validate contracts/.env
$CE = Read-EnvFile $ContractsEnv
if (-not $CE.ContainsKey('SOMNIA_RPC_URL') -or [string]::IsNullOrWhiteSpace($CE['SOMNIA_RPC_URL'])) {
  throw "Set SOMNIA_RPC_URL in $ContractsEnv"
}
if (-not $CE.ContainsKey('CHAIN_ID')) { throw "Set CHAIN_ID=5031 in $ContractsEnv" }
if ($CE['CHAIN_ID'] -ne '5031') { Write-Host "[WARN] CHAIN_ID is $($CE['CHAIN_ID']); expected 5031 for Somnia testnet" -ForegroundColor Yellow }
if (-not $CE.ContainsKey('PRIVATE_KEY') -or -not ($CE['PRIVATE_KEY'] -match '^0x[0-9a-fA-F]{64}$')) {
  throw "PRIVATE_KEY missing or invalid in $ContractsEnv (must be 0x + 64 hex)"
}

# 3) Deploy contracts with Hardhat
Push-Location $Contracts
try {
  Write-Host "[DEPLOY] Deploying contracts to Somnia testnet..." -ForegroundColor Cyan
  $deployOut = npx hardhat run scripts/deploy.js --network somnia 2>&1
} finally { Pop-Location }

# 4) Parse deployed addresses from output
$reg = ($deployOut | Select-String -Pattern 'AgentRegistry deployed to:\s*(0x[a-fA-F0-9]{40})').Matches.Groups[1].Value
$man = ($deployOut | Select-String -Pattern 'AgentCallManagerWithVerify deployed to:\s*(0x[a-fA-F0-9]{40})').Matches.Groups[1].Value
if (-not $reg -or -not $man) {
  Write-Host $deployOut
  throw "Could not parse deployed addresses from Hardhat output."
}

# 5) Prepare backend_router/.env
$RouterEnv = Join-Path $Router ".env"
if (-not (Test-Path $RouterEnv)) {
  $RExample = Join-Path $Router "env.example"
  if (Test-Path $RExample) { Copy-Item $RExample $RouterEnv -Force }
}
$RE = Read-EnvFile $RouterEnv
$RE['SOMNIA_RPC'] = $CE['SOMNIA_RPC_URL']
$RE['CHAIN_ID'] = $CE['CHAIN_ID']
$RE['CALL_MANAGER_ADDRESS'] = $man
$RE['REGISTRY_ADDRESS'] = $reg
$RE['MOCK_MODE'] = 'true'

# 6) Ensure router private key
$routerAddr = ""
if (-not $RE.ContainsKey('ROUTER_PRIVATE_KEY') -or -not ($RE['ROUTER_PRIVATE_KEY'] -match '^0x[0-9a-fA-F]{64}$')) {
  if ($GenerateRouterKey) {
    Push-Location $Contracts
    try {
      $nodeOut = node -e "const { Wallet } = require('ethers'); const w=Wallet.createRandom(); console.log(w.address+'|'+w.privateKey)"
    } finally { Pop-Location }
    $parts = $nodeOut -split '\|'
    if ($parts.Length -eq 2) {
      $routerAddr = $parts[0].Trim()
      $RE['ROUTER_PRIVATE_KEY'] = $parts[1].Trim()
      Write-Host "[INFO] Generated router key: $routerAddr (fund this address with STT)" -ForegroundColor Yellow
    } else {
      throw "Failed to generate router key via node/ethers."
    }
  } else {
    Write-Host "[ACTION REQUIRED] Set ROUTER_PRIVATE_KEY in $RouterEnv (0x + 64 hex), or re-run this script with -GenerateRouterKey to auto-generate one." -ForegroundColor Yellow
  }
}

# If we have a router key, derive its address for registration
if ([string]::IsNullOrWhiteSpace($routerAddr)) {
  if ($RE.ContainsKey('ROUTER_PRIVATE_KEY') -and ($RE['ROUTER_PRIVATE_KEY'] -match '^0x[0-9a-fA-F]{64}$')) {
    Push-Location $Contracts
    try {
      $routerAddr = node -e "const { Wallet } = require('ethers'); const w=new Wallet('$($RE['ROUTER_PRIVATE_KEY'])'); console.log(w.address)"
    } finally { Pop-Location }
    $routerAddr = $routerAddr.Trim()
  }
}

Write-EnvFile $RouterEnv $RE

# 7) Register an agent (signer = router address)
$agentId = ""
if (-not [string]::IsNullOrWhiteSpace($routerAddr)) {
  $agentName = "AI DeFi Analyzer"
  $agentURI = "ipfs://demo"
  $agentFee = "1000000000000000"  # 0.001 in wei (example)

  Push-Location $Contracts
  try {
    $env:REGISTRY_ADDRESS = $reg
    $env:AGENT_NAME = $agentName
    $env:AGENT_URI = $agentURI
    $env:AGENT_FEE = $agentFee
    $env:AGENT_SIGNER = $routerAddr
    Write-Host "[REGISTER] Registering agent with signer $routerAddr ..." -ForegroundColor Cyan
    $regOut = npx hardhat run scripts/register.js --network somnia 2>&1
  } finally { Pop-Location }

  $m = ($regOut | Select-String -Pattern 'Agent registered with ID:\s*([0-9]+)')
  if ($m) { $agentId = $m.Matches.Groups[1].Value }
}

# 8) Summary
Write-Host ""; Write-Host "=========== SUMMARY ===========" -ForegroundColor Green
Write-Host "AgentRegistry:              $reg"
Write-Host "AgentCallManagerWithVerify: $man"
if ($routerAddr) { Write-Host "Router address:             $routerAddr" }
if ($agentId) { Write-Host "Agent ID:                   $agentId" }
Write-Host "Router env file:            $RouterEnv"
Write-Host "Contracts env file:         $ContractsEnv"
Write-Host "================================" -ForegroundColor Green

Write-Host "Next steps:" -ForegroundColor Green
Write-Host "  1) Fund the router address with STT using the faucet: https://testnet.somnia.network/"
Write-Host "  2) Start router: powershell -ExecutionPolicy Bypass -File `"$Router\run-demo.ps1`""
Write-Host "  3) Invoke agent (from contracts/): set MANAGER_ADDRESS=$man; AGENT_ID=$agentId; VALUE_WEI=[>= fee] and run scripts/invoke.js"
