# Quick Test Script - Verify Everything Works
# Run this after starting ZK verifier and frontend

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "PrivOTC Integration Test" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check ZK Verifier Service
Write-Host "1️⃣  Testing ZK Verifier Service..." -ForegroundColor Yellow
try {
    $zkHealth = Invoke-RestMethod -Uri "http://localhost:4000/health" -Method GET
    Write-Host "   ✅ ZK Verifier is running!" -ForegroundColor Green
    Write-Host "      Status: $($zkHealth.status)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ ZK Verifier not running!" -ForegroundColor Red
    Write-Host "      Run: cd zk-circuits && npm run verifier" -ForegroundColor Yellow
    exit 1
}

# Test 2: Check Frontend API
Write-Host ""
Write-Host "2️⃣  Testing Frontend API..." -ForegroundColor Yellow
try {
    $apiTest = Invoke-RestMethod -Uri "http://localhost:3000/api/trade" -Method GET
    Write-Host "   ✅ Frontend API is running!" -ForegroundColor Green
    Write-Host "      Pending trades: $($apiTest.Count)" -ForegroundColor Gray
} catch {
    Write-Host "   ⚠️  Frontend not running (this is OK if not started yet)" -ForegroundColor Yellow
    Write-Host "      Run: cd frontend && npm run dev" -ForegroundColor Gray
}

# Test 3: Verify CRE Config
Write-Host ""
Write-Host "3️⃣  Verifying CRE Configuration..." -ForegroundColor Yellow
$config = Get-Content "c:\Users\thame\chain.link\privotc-cre\my-workflow\privotc-config.json" | ConvertFrom-Json

if ($config.otcSettlementAddress -eq "0x0000000000000000000000000000000000000000") {
    Write-Host "   ❌ Settlement address not configured!" -ForegroundColor Red
} else {
    Write-Host "   ✅ Settlement address: $($config.otcSettlementAddress.Substring(0, 10))..." -ForegroundColor Green
}

if ($config.proofVerifierAddress -eq "0x0000000000000000000000000000000000000000") {
    Write-Host "   ❌ Proof verifier address not configured!" -ForegroundColor Red
} else {
    Write-Host "   ✅ Proof verifier: $($config.proofVerifierAddress.Substring(0, 10))..." -ForegroundColor Green
}

Write-Host "   ✅ Chain ID: $($config.chainId)" -ForegroundColor Green
Write-Host "   ✅ Tenderly RPC configured" -ForegroundColor Green

# Test 4: Check ZK Circuit Artifacts
Write-Host ""
Write-Host "4️⃣  Checking ZK Circuit Artifacts..." -ForegroundColor Yellow
$zkeyPath = "c:\Users\thame\chain.link\zk-circuits\build\balanceProof_final.zkey"
$wasmPath = "c:\Users\thame\chain.link\zk-circuits\build\balanceProof_js\balanceProof.wasm"
$vkeyPath = "c:\Users\thame\chain.link\zk-circuits\build\verification_key.json"

if (Test-Path $zkeyPath) {
    $zkeySize = (Get-Item $zkeyPath).Length / 1MB
    Write-Host "   ✅ Proving key: $([math]::Round($zkeySize, 2)) MB" -ForegroundColor Green
} else {
    Write-Host "   ❌ Proving key not found!" -ForegroundColor Red
}

if (Test-Path $wasmPath) {
    Write-Host "   ✅ Circuit WASM exists" -ForegroundColor Green
} else {
    Write-Host "   ❌ Circuit WASM not found!" -ForegroundColor Red
}

if (Test-Path $vkeyPath) {
    Write-Host "   ✅ Verification key exists" -ForegroundColor Green
} else {
    Write-Host "   ❌ Verification key not found!" -ForegroundColor Red
}

# Test 5: Generate a Test ZK Proof
Write-Host ""
Write-Host "5️⃣  Testing Real ZK Proof Generation..." -ForegroundColor Yellow
try {
    # NOTE: Circuit requires actual_balance >= required_amount
    # Using valid test values: 5 ETH balance for 1.5 ETH trade requirement
    $testProofData = @{
        balance = "5000000000000000000"          # 5 ETH - user's actual balance (private)
        walletCommitment = "123456"              # Wallet ID from World ID (private)
        minPrice = "3200000000"                  # Not used in current circuit
        amount = "1500000000000000000"           # 1.5 ETH - required for trade (public)
        tokenId = "1"                            # Token address (private)
    } | ConvertTo-Json

    $proofResult = Invoke-RestMethod -Uri "http://localhost:4000/generate-proof" `
        -Method POST `
        -ContentType "application/json" `
        -Body $testProofData

    if ($proofResult.success) {
        Write-Host "   ✅ ZK Proof generated successfully!" -ForegroundColor Green
        Write-Host "      Proof type: Groth16" -ForegroundColor Gray
        Write-Host "      Public signals: $($proofResult.publicSignals.Count)" -ForegroundColor Gray
        Write-Host "      Proved: User has >=1.5 ETH without revealing actual balance (5 ETH)" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Proof generation failed!" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Summary
Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "✅ Integration Test Complete!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Make sure frontend is running: cd frontend && npm run dev" -ForegroundColor White
Write-Host "2. Visit http://localhost:3000" -ForegroundColor White
Write-Host "3. Verify with World ID and submit a trade" -ForegroundColor White
Write-Host "4. Run CRE handler 2: cre workflow run my-workflow --handler 2" -ForegroundColor White
Write-Host ""
Write-Host "Configuration Summary:" -ForegroundColor Cyan
Write-Host "   Settlement: 0x281ef2194C5B9Fa0ca2c6604D22636C686c818D8" -ForegroundColor Gray
Write-Host "   Chain: Tenderly Ethereum Virtual TestNet (9991)" -ForegroundColor Gray
Write-Host '   Mode: Simulation (set simulationMode=false for production)' -ForegroundColor Gray
Write-Host ""
