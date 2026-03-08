"use client"

import { Shield } from "lucide-react"
import { motion } from "framer-motion"
import { ThemeToggle } from "@/components/theme-toggle"
import { useRouter } from "next/navigation"

export function Navbar() {
  const router = useRouter()

  const handleTradeClick = () => {
    // Check if user is already verified
    const isVerified = sessionStorage.getItem('worldid_verified') === 'true'
    
    if (isVerified) {
      router.push('/trade')
    } else {
      router.push('/verify')
    }
  }

  const handleAboutClick = () => {
    router.push('/about')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full px-4 pt-4 lg:px-6 lg:pt-6 flex justify-center"
    >
      <nav className="w-full max-w-6xl border border-foreground/20 bg-background/80 backdrop-blur-sm px-3 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => router.push('/')}
          >
            <Shield size={16} strokeWidth={1.5} className="text-[#ea580c]" />
            <span className="text-xs font-mono tracking-[0.15em] uppercase font-bold">
              PrivOTC
            </span>
          </motion.div>

          {/* Right section with nav links and theme toggle */}
          <div className="flex items-center gap-3 sm:gap-6">
            <motion.button
              onClick={handleAboutClick}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="text-xs font-mono tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              About
            </motion.button>
            <motion.button
              onClick={handleTradeClick}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.36, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="text-xs font-mono tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Trade
            </motion.button>
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.42, duration: 0.4 }}
            >
              <ThemeToggle />
            </motion.div>

            <span className="hidden lg:block text-[10px] font-mono tracking-widest uppercase text-muted-foreground">
              Powered by Chainlink
            </span>
          </div>
        </div>
      </nav>
    </motion.div>
  )
}
