import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, createWalletClient, http, keccak256, encodePacked, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

// ── Contract addresses (Tenderly Ethereum, chain 9991) ──────────────────────
const ESCROW_ADDRESS = '0x32CB383405f866a84e42345aDb10b00228f52B3f' as `0x${string}`
const SETTLEMENT_ADDRESS = '0x7f8e2f2685c84aECA45CF6d6bfb1663781B9813A' as `0x${string}`
const WLD_ADDRESS = '0x163f8C2467924be0ae7B5347228CABF260318753' as `0x${string}`
const ETH_ADDRESS = '0x0000000000000000000000000000000000000000' as `0x${string}`

const TENDERLY_RPC = 'https://virtual.mainnet.eu.rpc.tenderly.co/fc856d53-a35a-4d03-8a54-ad1f88e48a6b'

// Deployer is set as creExecutor — used only for settlement on demo/test network
const DEPLOYER_KEY = (
  process.env.DEPLOYER_PRIVATE_KEY ??
  '0x251c2ccc0f55d5837809c93c9e775c8a7cd315a517fabbd52c794902a8a8bc36'
) as `0x${string}`

const tenderlyChain = {
  id: 9991,
  name: 'Tenderly Ethereum',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [TENDERLY_RPC] } },
} as const

const ESCROW_ABI = parseAbi([
  'function getBalance(bytes32 tradeId) view returns (uint256)',
])

const SETTLEMENT_ABI = parseAbi([
  'function settle(bytes32 tradeId, address buyer, address seller, address buyerToken, address sellerToken, uint256 buyerAmount, uint256 sellerAmount) external',
  'function isSettled(bytes32 tradeId) view returns (bool)',
])

/**
 * POST /api/escrow
 * Body: { matchId, tradeId, buyerAddress, sellerAddress, ethAmount, wldAmount }
 *
 * Checks whether both parties have deposited into EscrowVault on-chain.
 * If both have deposited, calls OTCSettlement.settle() using the deployer key
 * (deployer is the creExecutor on this test network).
 *
 * Escrow IDs mirror what OTCSettlement.sol computes internally:
 *   buyerEscrowId  = keccak256(abi.encodePacked(tradeId, buyerAddress))
 *   sellerEscrowId = keccak256(abi.encodePacked(tradeId, sellerAddress))
 */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { matchId, tradeId, buyerAddress, sellerAddress, ethAmount, wldAmount } = body

  if (!tradeId || !buyerAddress || !sellerAddress) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const tradeIdBytes = tradeId as `0x${string}`
  const buyerAddr = buyerAddress as `0x${string}`
  const sellerAddr = sellerAddress as `0x${string}`

  // Compute escrow IDs — must exactly match OTCSettlement.sol's keccak256 computation
  const buyerEscrowId = keccak256(encodePacked(['bytes32', 'address'], [tradeIdBytes, buyerAddr]))
  const sellerEscrowId = keccak256(encodePacked(['bytes32', 'address'], [tradeIdBytes, sellerAddr]))

  const publicClient = createPublicClient({
    chain: tenderlyChain,
    transport: http(TENDERLY_RPC),
  })

  // Check if already settled
  const alreadySettled = await publicClient.readContract({
    address: SETTLEMENT_ADDRESS,
    abi: SETTLEMENT_ABI,
    functionName: 'isSettled',
    args: [tradeIdBytes],
  })

  if (alreadySettled) {
    return NextResponse.json({ settled: true, bothDeposited: true })
  }

  // Check on-chain escrow balances
  const [buyerBalance, sellerBalance] = await Promise.all([
    publicClient.readContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'getBalance',
      args: [buyerEscrowId],
    }),
    publicClient.readContract({
      address: ESCROW_ADDRESS,
      abi: ESCROW_ABI,
      functionName: 'getBalance',
      args: [sellerEscrowId],
    }),
  ])

  const buyerBalance_ = buyerBalance as bigint
  const sellerBalance_ = sellerBalance as bigint
  const buyerDeposited = buyerBalance_ > 0n
  const sellerDeposited = sellerBalance_ > 0n

  console.log(`[escrow] ${matchId} — buyer: ${buyerBalance_}, seller: ${sellerBalance_}`)

  if (!buyerDeposited || !sellerDeposited) {
    return NextResponse.json({
      settled: false,
      bothDeposited: false,
      buyerDeposited,
      sellerDeposited,
      buyerBalance: buyerBalance_.toString(),
      sellerBalance: sellerBalance_.toString(),
    })
  }

  // Both have deposited — trigger on-chain settlement
  const account = privateKeyToAccount(DEPLOYER_KEY)
  const walletClient = createWalletClient({
    account,
    chain: tenderlyChain,
    transport: http(TENDERLY_RPC),
  })

  console.log(`[escrow] Both deposited — calling settle() for ${matchId}`)

  // Re-check isSettled right before writing (prevents duplicate settle from concurrent polls)
  const alreadySettledNow = await publicClient.readContract({
    address: SETTLEMENT_ADDRESS,
    abi: SETTLEMENT_ABI,
    functionName: 'isSettled',
    args: [tradeIdBytes],
  })
  if (alreadySettledNow) {
    return NextResponse.json({ settled: true, bothDeposited: true })
  }

  try {
    const txHash = await walletClient.writeContract({
      address: SETTLEMENT_ADDRESS,
      abi: SETTLEMENT_ABI,
      functionName: 'settle',
      args: [
        tradeIdBytes,
        buyerAddr,
        sellerAddr,
        WLD_ADDRESS,  // buyer's token (WLD)
        ETH_ADDRESS,  // seller's token (ETH, address(0))
        BigInt(wldAmount),  // buyerAmount
        BigInt(ethAmount),  // sellerAmount
      ],
    })

    console.log(`[escrow] settle() tx: ${txHash}`)

    // Mark match as settled in the match store
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/matches`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId }),
    }).catch(() => {}) // non-critical

    return NextResponse.json({ settled: true, bothDeposited: true, txHash })
  } catch (err: any) {
    // SettlementAlreadyExecuted (0x94ce95d2) — another concurrent request won the race
    // Treat as success since the trade is settled on-chain
    const sig = err?.cause?.signature ?? err?.data ?? ''
    if (sig === '0x94ce95d2' || err?.message?.includes('SettlementAlreadyExecuted')) {
      console.log(`[escrow] settle() already executed by concurrent request — returning settled`)
      return NextResponse.json({ settled: true, bothDeposited: true })
    }
    console.error(`[escrow] settle() failed:`, err)
    return NextResponse.json(
      { error: `Settlement failed: ${err.shortMessage ?? err.message}` },
      { status: 500 }
    )
  }
}
