'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navbar } from "@/components/navbar"
import { HeroSection } from "@/components/hero-section"
import { FeatureGrid } from "@/components/feature-grid"
import { GlitchMarquee } from "@/components/glitch-marquee"
import { Footer } from "@/components/footer"
import { OrderForm } from "@/components/privotc/OrderForm"
import { OrderStatus } from "@/components/privotc/OrderStatus"

type AppState = 'landing' | 'trade' | 'status'

export default function Page() {
  const [appState, setAppState] = useState<AppState>('landing')
  const [nullifierHash, setNullifierHash] = useState<string | null>(null)
  const [tradeId, setTradeId] = useState<string | null>(null)

  function handleVerified(hash: string) {
    setNullifierHash(hash)
    setAppState('trade')
  }

  function handleOrderSubmitted(id: string) {
    setTradeId(id)
    setAppState('status')
  }

  function handleNewOrder() {
    setTradeId(null)
    setAppState('trade')
  }

  return (
    <div className="min-h-screen dot-grid-bg">
      <Navbar />

      {/* Landing page */}
      <AnimatePresence mode="wait">
        {appState === 'landing' && (
          <motion.main
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <HeroSection onVerified={handleVerified} />
            <FeatureGrid />
            <GlitchMarquee />
          </motion.main>
        )}

        {/* Trade app — replaces landing after World ID verify */}
        {(appState === 'trade' || appState === 'status') && (
          <motion.main
            key="app"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center min-h-[80vh] px-6 py-16"
          >
            {/* App header */}
            <div className="w-full max-w-md mb-8">
              <div className="flex items-center gap-4 pb-3 border-b border-foreground/20">
                <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
                  {appState === 'trade' ? '// TRADE_ENTRY' : '// ORDER_STATUS'}
                </span>
                <div className="flex-1 border-t border-foreground/10" />
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 bg-[#ea580c] rounded-full" />
                  <span className="text-[10px] font-mono text-muted-foreground tracking-widest">
                    VERIFIED
                  </span>
                </div>
              </div>
            </div>

            {appState === 'trade' && nullifierHash && (
              <OrderForm
                nullifierHash={nullifierHash}
                onOrderSubmitted={handleOrderSubmitted}
              />
            )}

            {appState === 'status' && tradeId && (
              <OrderStatus
                tradeId={tradeId}
                onNewOrder={handleNewOrder}
              />
            )}
          </motion.main>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  )
}
