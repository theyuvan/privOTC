# Manual CRE Matching Script
# Run this to manually trigger CRE matching until you get deployment access

Write-Host "`n🚀 Running CRE Matching Engine...`n" -ForegroundColor Cyan

cd c:\Users\thame\chain.link\privotc-cre\my-workflow

Write-Host "Fetching and matching trades from Vercel...`n" -ForegroundColor Yellow

cre workflow simulate . --project-root . --target privotc-staging --trigger-index 2 --non-interactive 2>&1 | Select-String "Received|Found|Match posted" -Context 0,1

Write-Host "`n✅ Check matches at:" -ForegroundColor Green
Write-Host "   https://chain-phi-seven.vercel.app/api/matches?wallet=YOUR_WALLET`n" -ForegroundColor White

Write-Host "📊 Or check in PowerShell:" -ForegroundColor Cyan
Write-Host "   Invoke-WebRequest 'https://chain-phi-seven.vercel.app/api/matches?wallet=0xYOUR_ADDRESS' -UseBasicParsing | ConvertFrom-Json`n" -ForegroundColor White
