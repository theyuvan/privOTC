# Setup Vercel Environment Variables
# Run this after deploying to Vercel

Write-Host "🚀 Setting up Vercel environment variables..." -ForegroundColor Cyan

# World ID Configuration (STAGING)
npx vercel env add NEXT_PUBLIC_APP_ID production <<EOF
app_356707253a6f729610327063d51fe46e
EOF

npx vercel env add NEXT_PUBLIC_WORLD_ACTION production <<EOF
verify-trade
EOF

npx vercel env add WORLD_RP_ID production <<EOF
rp_8842282259915d97
EOF

npx vercel env add RP_SIGNING_KEY production <<EOF
0xd95bb18195c4c39b9753973d3c6b9af4ea597f93afe2c9cbe9a35073dd22218f
EOF

npx vercel env add NEXT_PUBLIC_WORLD_ENVIRONMENT production <<EOF
staging
EOF

# Tenderly RPC URLs
npx vercel env add NEXT_PUBLIC_ETHEREUM_RPC production <<EOF
https://virtual.mainnet.eu.rpc.tenderly.co/9b993a3b-a915-4d11-9283-b43800cd39a5
EOF

npx vercel env add NEXT_PUBLIC_WORLD_CHAIN_RPC production <<EOF
https://virtual.worldchain-mainnet.eu.rpc.tenderly.co/9351a25c-a4fe-452b-86b5-ed87acd05ce8
EOF

npx vercel env add NEXT_PUBLIC_ETHEREUM_CHAIN_ID production <<EOF
9991
EOF

npx vercel env add NEXT_PUBLIC_WORLD_CHAIN_CHAIN_ID production <<EOF
999480
EOF

# Contract Addresses - Ethereum
npx vercel env add NEXT_PUBLIC_ESCROW_ETHEREUM_ADDRESS production <<EOF
0xB61eC46b61E2B5eAdCB00DEED3EaB87B8f1dbC9f
EOF

npx vercel env add NEXT_PUBLIC_SETTLEMENT_ETHEREUM_ADDRESS production <<EOF
0x41A580044F41C9D6BDe5821A4dF5b664A09cc370
EOF

npx vercel env add NEXT_PUBLIC_PROOF_VERIFIER_ETHEREUM_ADDRESS production <<EOF
0x30da6632366698aB59d7BDa01Eb22B7cb474D57C
EOF

npx vercel env add NEXT_PUBLIC_BALANCE_VERIFIER_ETHEREUM_ADDRESS production <<EOF
0xd76578726b87A5c62FC235C9805De20c12453a43
EOF

# Contract Addresses - World Chain
npx vercel env add NEXT_PUBLIC_ESCROW_WORLD_CHAIN_ADDRESS production <<EOF
0x8fC5337902A1EF5e699B2C19f1EBe892E5DBf294
EOF

npx vercel env add NEXT_PUBLIC_SETTLEMENT_WORLD_CHAIN_ADDRESS production <<EOF
0x615807920BEA0751AbE4682f18b55C0e1BaA0112
EOF

npx vercel env add NEXT_PUBLIC_PROOF_VERIFIER_WORLD_CHAIN_ADDRESS production <<EOF
0x73416Bc510C031708558F4f8796214A29e2FFdb7
EOF

# Groq API Key
npx vercel env add GROQ_API_KEY production <<EOF
YOUR_GROQ_API_KEY_HERE
EOF

Write-Host "✅ All environment variables configured!" -ForegroundColor Green
Write-Host "🔄 Redeploy to apply: npx vercel --prod" -ForegroundColor Yellow
