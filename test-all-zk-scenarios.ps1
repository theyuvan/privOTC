# PrivOTC ZK Proof Testing Script
# Tests multiple balance scenarios automatically

Write-Host "🧪 Starting ZK Proof Test Suite..." -ForegroundColor Cyan
Write-Host ""

# Test scenarios
$scenarios = @(
    @{
        name = "Insufficient Balance"
        wallet = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
        balance = "300000000000000000"
        token = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
        salt = "987654321"
        required_amount = "500000000000000000"
        expected_result = "0"
    },
    @{
        name = "Sufficient Balance"
        wallet = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
        balance = "1000000000000000000"
        token = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
        salt = "111222333"
        required_amount = "500000000000000000"
        expected_result = "1"
    },
    @{
        name = "Exact Balance Match"
        wallet = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
        balance = "1000000000000000000"
        token = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
        salt = "444555666"
        required_amount = "1000000000000000000"
        expected_result = "1"
    },
    @{
        name = "Large Balance"
        wallet = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
        balance = "10000000000000000000"
        token = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
        salt = "777888999"
        required_amount = "500000000000000000"
        expected_result = "1"
    }
)

$passed = 0
$failed = 0

# Navigate to ZK circuits directory
Set-Location "zk-circuits\build\balanceProof_js"

foreach ($scenario in $scenarios) {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
    Write-Host "📋 Test: $($scenario.name)" -ForegroundColor Yellow
    Write-Host "   Balance: $($scenario.balance) wei" -ForegroundColor White
    Write-Host "   Required: $($scenario.required_amount) wei" -ForegroundColor White
    Write-Host ""

    # Create input JSON
    $inputJson = @{
        wallet = $scenario.wallet
        balance = $scenario.balance
        token = $scenario.token
        salt = $scenario.salt
        required_amount = $scenario.required_amount
    } | ConvertTo-Json

    $inputFile = "..\..\input\test-$($scenario.name -replace ' ', '-').json"
    $inputJson | Out-File -FilePath $inputFile -Encoding UTF8
    
    Write-Host "   Step 1: Generating witness..." -ForegroundColor Cyan
    $witnessOutput = node generate_witness.js balanceProof.wasm $inputFile witness.wtns 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ Witness generation failed!" -ForegroundColor Red
        Write-Host "   Error: $witnessOutput" -ForegroundColor Red
        $failed++
        continue
    }
    Write-Host "   ✅ Witness generated" -ForegroundColor Green
    
    Write-Host "   Step 2: Generating proof..." -ForegroundColor Cyan
    $proofOutput = npx snarkjs groth16 prove ..\balanceProof_final.zkey witness.wtns proof.json public.json 2>&1
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ Proof generation failed!" -ForegroundColor Red
        Write-Host "   Error: $proofOutput" -ForegroundColor Red
        $failed++
        continue
    }
    Write-Host "   ✅ Proof generated" -ForegroundColor Green
    
    Write-Host "   Step 3: Verifying proof..." -ForegroundColor Cyan
    $verifyOutput = npx snarkjs groth16 verify ..\verification_key.json public.json proof.json 2>&1
    
    if ($verifyOutput -match "OK!") {
        Write-Host "   ✅ Proof verification PASSED" -ForegroundColor Green
        
        # Check the balance_sufficient output
        $publicData = Get-Content public.json | ConvertFrom-Json
        $balanceSufficient = $publicData[0]
        
        if ($balanceSufficient -eq $scenario.expected_result) {
            Write-Host "   ✅ Result matches expected: $balanceSufficient" -ForegroundColor Green
            $passed++
        } else {
            Write-Host "   ❌ Result mismatch! Expected: $($scenario.expected_result), Got: $balanceSufficient" -ForegroundColor Red
            $failed++
        }
    } else {
        Write-Host "   ❌ Proof verification FAILED" -ForegroundColor Red
        Write-Host "   Output: $verifyOutput" -ForegroundColor Red
        $failed++
    }
    
    Write-Host ""
}

# Summary
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "📊 Test Summary" -ForegroundColor Cyan
Write-Host "   Total Tests: $($passed + $failed)" -ForegroundColor White
Write-Host "   ✅ Passed: $passed" -ForegroundColor Green
Write-Host "   ❌ Failed: $failed" -ForegroundColor Red
Write-Host ""

if ($failed -eq 0) {
    Write-Host "🎉 All tests passed! Your ZK proofs are working correctly!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some tests failed. Review the errors above." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "💡 Next Step: Run 'cre workflow simulate' to test the full CRE workflow" -ForegroundColor Magenta

# Return to root directory
Set-Location "..\..\..\"
