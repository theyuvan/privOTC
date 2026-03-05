// Contract ABIs and Configuration
export const CONTRACT_ADDRESSES = {
  ethereum: {
    escrowVault: process.env.NEXT_PUBLIC_ESCROW_ETHEREUM_ADDRESS || '',
    otcSettlement: process.env.NEXT_PUBLIC_SETTLEMENT_ETHEREUM_ADDRESS || '',
    proofVerifier: process.env.NEXT_PUBLIC_PROOF_VERIFIER_ETHEREUM_ADDRESS || '',
  },
  worldChain: {
    escrowVault: process.env.NEXT_PUBLIC_ESCROW_WORLD_CHAIN_ADDRESS || '',
    otcSettlement: process.env.NEXT_PUBLIC_SETTLEMENT_WORLD_CHAIN_ADDRESS || '',
    proofVerifier: process.env.NEXT_PUBLIC_PROOF_VERIFIER_WORLD_CHAIN_ADDRESS || '',
  },
}

export const ESCROW_VAULT_ABI = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [],
    name: 'DEFAULT_TIMEOUT',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'tradeId', type: 'bytes32' },
      { internalType: 'address', name: 'token', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
      { internalType: 'uint256', name: 'expiryTime', type: 'uint256' },
    ],
    name: 'deposit',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'tradeId', type: 'bytes32' }],
    name: 'getBalance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'tradeId', type: 'bytes32' }],
    name: 'isActive',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'tradeId', type: 'bytes32' }],
    name: 'refund',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'tradeId', type: 'bytes32' },
      { indexed: true, internalType: 'address', name: 'depositor', type: 'address' },
      { indexed: false, internalType: 'address', name: 'token', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'amount', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'expiryTime', type: 'uint256' },
    ],
    name: 'Deposited',
    type: 'event',
  },
] as const

export const OTC_SETTLEMENT_ABI = [
  {
    inputs: [{ internalType: 'address', name: '_escrowVault', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'tradeId', type: 'bytes32' }],
    name: 'isSettled',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'tradeId', type: 'bytes32' },
      { internalType: 'address', name: 'buyer', type: 'address' },
      { internalType: 'address', name: 'seller', type: 'address' },
      { internalType: 'address', name: 'buyerToken', type: 'address' },
      { internalType: 'address', name: 'sellerToken', type: 'address' },
      { internalType: 'uint256', name: 'buyerAmount', type: 'uint256' },
      { internalType: 'uint256', name: 'sellerAmount', type: 'uint256' },
    ],
    name: 'settle',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'tradeId', type: 'bytes32' },
      { internalType: 'address', name: 'participant', type: 'address' },
    ],
    name: 'generateEscrowId',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'bytes32', name: 'tradeId', type: 'bytes32' },
      { indexed: true, internalType: 'address', name: 'buyer', type: 'address' },
      { indexed: true, internalType: 'address', name: 'seller', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' },
    ],
    name: 'TradeSettled',
    type: 'event',
  },
] as const

export const PROOF_VERIFIER_ABI = [
  {
    inputs: [
      { internalType: 'contract IWorldID', name: '_worldId', type: 'address' },
      { internalType: 'string', name: '_appId', type: 'string' },
      { internalType: 'string', name: '_actionId', type: 'string' },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [
      { internalType: 'address', name: 'signal', type: 'address' },
      { internalType: 'uint256', name: 'root', type: 'uint256' },
      { internalType: 'uint256', name: 'nullifierHash', type: 'uint256' },
      { internalType: 'uint256[8]', name: 'proof', type: 'uint256[8]' },
    ],
    name: 'verifyHuman',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'nullifierHash', type: 'uint256' }],
    name: 'isNullifierUsed',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'nullifierHash', type: 'uint256' },
    ],
    name: 'HumanVerified',
    type: 'event',
  },
] as const

// Mock ERC20 ABI for testing
export const ERC20_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const
