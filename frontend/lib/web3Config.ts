import { http, createConfig } from 'wagmi'
import { defineChain } from 'viem'
import { injected, walletConnect } from 'wagmi/connectors'

// Define Tenderly Virtual TestNet chains
export const tenderlyEthereum = defineChain({
  id: 9991,
  name: 'Tenderly Ethereum TestNet',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_ETHEREUM_RPC ||
          'https://virtual.mainnet.eu.rpc.tenderly.co/fc856d53-a35a-4d03-8a54-ad1f88e48a6b',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'Tenderly Explorer',
      url: 'https://dashboard.tenderly.co',
    },
  },
  testnet: true,
})

export const tenderlyWorldChain = defineChain({
  id: 999480,
  name: 'Tenderly World Chain TestNet',
  nativeCurrency: {
    name: 'World',
    symbol: 'WLD',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_WORLD_CHAIN_RPC ||
          'https://virtual.worldchain-mainnet.eu.rpc.tenderly.co/9351a25c-a4fe-452b-86b5-ed87acd05ce8',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'Tenderly Explorer',
      url: 'https://dashboard.tenderly.co',
    },
  },
  testnet: true,
})

export const config = createConfig({
  chains: [tenderlyEthereum, tenderlyWorldChain],
  connectors: [
    injected(),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'demo',
      metadata: {
        name: 'PrivOTC',
        description: 'Private OTC Trading Platform',
        url: 'https://privotc.app',
        icons: [],
      },
    }),
  ],
  transports: {
    [tenderlyEthereum.id]: http(),
    [tenderlyWorldChain.id]: http(),
  },
  ssr: true,
})
