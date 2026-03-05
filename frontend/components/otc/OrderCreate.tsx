'use client'

import { useState } from 'react'
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, encodePacked, keccak256 } from 'viem'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { CONTRACT_ADDRESSES, ESCROW_VAULT_ABI } from '@/lib/contracts'

export function OrderCreate() {
  const { address } = useAccount()
  const chainId = useChainId()
  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const [formData, setFormData] = useState({
    orderType: 'buy' as 'buy' | 'sell',
    tokenOffered: '',
    amountOffered: '',
    tokenRequested: '',
    amountRequested: '',
    expiryHours: '24',
  })

  const isEthereum = chainId === 9991
  const contractAddress = isEthereum
    ? CONTRACT_ADDRESSES.ethereum.escrowVault
    : CONTRACT_ADDRESSES.worldChain.escrowVault
  
  const nativeToken = isEthereum ? 'ETH' : 'WLD'

  const handleCreateOrder = async () => {
    if (!address || !contractAddress) {
      toast.error('Please connect your wallet first')
      return
    }

    if (!formData.amountOffered || !formData.amountRequested) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      // Generate unique trade ID
      const timestamp = Date.now()
      const tradeId = keccak256(
        encodePacked(
          ['address', 'uint256', 'uint256'],
          [address, BigInt(timestamp), BigInt(Math.random() * 1000000)]
        )
      )

      const expiryTime = Math.floor(Date.now() / 1000) + parseInt(formData.expiryHours) * 3600
      const amount = parseEther(formData.amountOffered)
      
      // For native token deposits (ETH/WLD), tokenAddress is 0x0
      const isNativeToken = formData.tokenOffered === nativeToken
      const tokenAddress = isNativeToken ? '0x0000000000000000000000000000000000000000' : formData.tokenOffered

      writeContract({
        address: contractAddress as `0x${string}`,
        abi: ESCROW_VAULT_ABI,
        functionName: 'deposit',
        args: [tradeId, tokenAddress as `0x${string}`, amount, BigInt(expiryTime)],
        value: isNativeToken ? amount : 0n,
      })

      toast.success('Order creation transaction submitted!')
    } catch (error: any) {
      console.error('Error creating order:', error)
      toast.error(error.message || 'Failed to create order')
    }
  }

  if (isSuccess) {
    toast.success('Order created successfully!')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create OTC Order</CardTitle>
        <CardDescription>
          Deposit funds to create a new OTC trade order on {isEthereum ? 'Ethereum' : 'World Chain'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="orderType">Order Type</Label>
          <Select
            value={formData.orderType}
            onValueChange={(value: 'buy' | 'sell') =>
              setFormData({ ...formData, orderType: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="buy">Buy</SelectItem>
              <SelectItem value="sell">Sell</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tokenOffered">Token Offered</Label>
            <Input
              id="tokenOffered"
              placeholder={`${nativeToken} or token address`}
              value={formData.tokenOffered}
              onChange={(e) => setFormData({ ...formData, tokenOffered: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amountOffered">Amount Offered</Label>
            <Input
              id="amountOffered"
              type="number"
              step="0.01"
              placeholder="0.0"
              value={formData.amountOffered}
              onChange={(e) => setFormData({ ...formData, amountOffered: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tokenRequested">Token Requested</Label>
            <Input
              id="tokenRequested"
              placeholder="Token address"
              value={formData.tokenRequested}
              onChange={(e) => setFormData({ ...formData, tokenRequested: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amountRequested">Amount Requested</Label>
            <Input
              id="amountRequested"
              type="number"
              step="0.01"
              placeholder="0.0"
              value={formData.amountRequested}
              onChange={(e) => setFormData({ ...formData, amountRequested: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="expiryHours">Expiry Time (hours)</Label>
          <Select
            value={formData.expiryHours}
            onValueChange={(value) => setFormData({ ...formData, expiryHours: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 hour</SelectItem>
              <SelectItem value="6">6 hours</SelectItem>
              <SelectItem value="24">24 hours</SelectItem>
              <SelectItem value="72">3 days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleCreateOrder}
          disabled={isPending || isConfirming || !address || !contractAddress}
          className="w-full"
        >
          {isPending || isConfirming ? 'Creating Order...' : 'Create Order'}
        </Button>

        {!contractAddress && (
          <p className="text-sm text-destructive text-center">
            ⚠️ Contracts not deployed yet. Please deploy contracts first.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
