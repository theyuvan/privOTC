"use client"

import { WorkflowDiagram } from "@/components/workflow-diagram"
import { ArrowRight } from "lucide-react"
import { motion } from "framer-motion"

const ease = [0.22, 1, 0.36, 1] as const

interface HeroSectionProps {
  onVerified: (nullifierHash: string, proof?: any) => void
}

export function HeroSection({ onVerified }: HeroSectionProps) {
  return (
    <section className="relative w-full px-12 pt-6 pb-12 lg:px-24 lg:pt-10 lg:pb-16">
      <div className="flex flex-col items-center text-center">
        {/* Top headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease }}
          className="font-pixel text-4xl sm:text-6xl lg:text-7xl xl:text-8xl tracking-tight text-foreground mb-2 select-none"
        >
          PROVE. TRADE.
        </motion.h1>

        {/* Central Workflow Diagram */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.15, ease }}
          className="w-full max-w-2xl my-4 lg:my-6"
        >
          <WorkflowDiagram />
        </motion.div>

        {/* Bottom headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.7, delay: 0.25, ease }}
          className="font-pixel text-4xl sm:text-6xl lg:text-7xl xl:text-8xl tracking-tight text-foreground mb-4 select-none"
          aria-hidden="true"
        >
          SETTLE.
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45, ease }}
          className="text-xs lg:text-sm text-muted-foreground max-w-md mb-6 leading-relaxed font-mono"
        >
          PrivOTC is a human-verified confidential OTC trading protocol. Verify your humanity
          with World ID, then trade privately — your order details stay encrypted end-to-end,
          matched by Chainlink CRE, settled on-chain.
        </motion.p>

        {/* Launch App CTA */}
        <motion.a
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.65, ease }}
          href="/verify"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-mono text-sm hover:bg-primary/90 transition-colors border border-border"
        >
          Launch App <ArrowRight className="w-4 h-4" />
        </motion.a>

        {/* Tagline below button */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.9, ease }}
          className="mt-4 text-[10px] font-mono text-muted-foreground tracking-widest uppercase"
        >
          // No bots · No frontrunning · Zero-knowledge proof
        </motion.p>
      </div>
    </section>
  )
}
