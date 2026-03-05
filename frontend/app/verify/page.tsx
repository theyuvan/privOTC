'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, CheckCircle2 } from 'lucide-react'
import { VerifyButton } from '@/components/privotc/VerifyButton'

export default function VerifyPage() {
  const router = useRouter()
  const [isVerified, setIsVerified] = useState(false)

  useEffect(() => {
    // Clear previous verification - require fresh verification each time
    localStorage.removeItem('worldid_verified')
    localStorage.removeItem('worldid_nullifier')
  }, [])

  const handleVerified = (nullifierHash: string, proof?: any) => {
    // Store verification for current session only
    sessionStorage.setItem('worldid_verified', 'true')
    sessionStorage.setItem('worldid_nullifier', nullifierHash)
    if (proof) sessionStorage.setItem('worldid_proof', JSON.stringify(proof))
    console.log('[Verify] World ID verified — nullifier:', nullifierHash)
    console.log('[Verify] Full proof stored in sessionStorage:', proof)
    setIsVerified(true)
    
    // Redirect to trade page after 2 seconds
    setTimeout(() => {
      router.push('/trade')
    }, 2000)
  }

  const handleProceed = () => {
    router.push('/trade')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              {isVerified ? (
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              ) : (
                <Shield className="h-8 w-8 text-primary" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {isVerified ? 'Verification Complete!' : 'Verify Your Humanity'}
            </CardTitle>
            <CardDescription>
              {isVerified
                ? 'You can now access the trading platform'
                : 'Scan the QR code with World App to prove you\'re human'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {!isVerified && (
              <div className="flex flex-col items-center gap-4">
                <div className="text-center space-y-2 mb-4">
                  <p className="text-sm text-muted-foreground">
                    World ID verification ensures:
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>✓ Sybil resistance - one person, one account</li>
                    <li>✓ Privacy-preserving - no personal data shared</li>
                    <li>✓ Human-only trading - no bots allowed</li>
                  </ul>
                </div>

                <div className="flex justify-center">
                  <VerifyButton onVerified={handleVerified} />
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Don't have World App?{' '}
                  <a
                    href="https://worldcoin.org/download"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Download here
                  </a>
                </p>
              </div>
            )}

            {isVerified && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="text-center">
                  <p className="text-sm text-green-600 font-medium mb-2">
                    ✓ Human verification successful
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Redirecting to trading platform...
                  </p>
                </div>

                <Button onClick={handleProceed} size="lg" className="w-full">
                  Proceed to Trading
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
