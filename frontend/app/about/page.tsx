'use client'

import { motion } from 'framer-motion'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Shield, Lock, Brain, Users, Github, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function AboutPage() {
  return (
    <div className="min-h-screen dot-grid-bg">
      <Navbar />
      
      <main className="container max-w-5xl mx-auto px-6 py-16 space-y-20">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-4 pb-3 border-b border-foreground/20">
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-muted-foreground">
              // ABOUT_PRIVOTC
            </span>
            <div className="flex-1 border-t border-foreground/10" />
          </div>

          <h1 className="text-4xl md:text-5xl font-mono font-bold tracking-tight">
            Human-Verified Confidential OTC Trading
          </h1>

          <p className="text-lg text-muted-foreground max-w-3xl">
            PrivOTC combines World ID human verification with Chainlink CRE (Confidential Runtime Environment) 
            to create the first privacy-preserving, bot-resistant OTC trading platform.
          </p>
        </motion.div>

        {/* How It Works */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-8"
        >
          <div>
            <h2 className="text-2xl font-mono font-bold mb-2">How It Works</h2>
            <p className="text-muted-foreground">
              Four-layer architecture ensuring privacy, security, and human-only trading
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Step 1 */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">01</span>
                </div>
                <CardTitle className="text-lg font-mono">World ID Verification</CardTitle>
                <CardDescription>
                  Prove you're human with World ID's Orb verification. One person = one account. 
                  Zero-knowledge proofs keep your identity private.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Step 2 */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Lock className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">02</span>
                </div>
                <CardTitle className="text-lg font-mono">Private Order Submission</CardTitle>
                <CardDescription>
                  Submit encrypted ZK balance proofs. Orders are encrypted client-side before 
                  submission—no one sees your trading intentions.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Step 3 */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Brain className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">03</span>
                </div>
                <CardTitle className="text-lg font-mono">Confidential Matching</CardTitle>
                <CardDescription>
                  AI-powered matching runs inside Chainlink CRE's Trusted Execution Environment. 
                  Orders are decrypted, matched, and encrypted again—all in isolation.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Step 4 */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">04</span>
                </div>
                <CardTitle className="text-lg font-mono">Privacy-Preserving Settlement</CardTitle>
                <CardDescription>
                  Atomic escrow settlement on-chain. Only matched trades are revealed. 
                  MEV-resistant, frontrunning impossible.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </motion.section>

        {/* Technology Stack */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="space-y-8"
        >
          <div>
            <h2 className="text-2xl font-mono font-bold mb-2">Technology Stack</h2>
            <p className="text-muted-foreground">
              Built with cutting-edge privacy and verification technologies
            </p>
          </div>

          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-mono">🔗 Chainlink CRE</CardTitle>
                <CardDescription>
                  Confidential Runtime Environment ensures order matching happens in a 
                  Trusted Execution Environment. AI agents run inside TEE for intelligent 
                  matching without compromising privacy.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-mono">🌍 World ID 4.0</CardTitle>
                <CardDescription>
                  Orb-verified proof of humanity. Prevents Sybil attacks and bot manipulation 
                  while preserving user privacy through zero-knowledge proofs.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-mono">🔐 ZK Circuits (snarkjs)</CardTitle>
                <CardDescription>
                  Zero-knowledge balance proofs verify you have sufficient funds without 
                  revealing your balance. Built with Circom + Groth16 protocol.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-mono">🤖 AI Matching (Groq in TEE)</CardTitle>
                <CardDescription>
                  Intelligent order matching with Groq running inside Chainlink CRE. 
                  Analyzes market conditions, detects manipulation, finds optimal matches.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-mono">🔧 Tenderly Virtual TestNets</CardTitle>
                <CardDescription>
                  Development infrastructure with unlimited RPC, instant blocks, and 
                  powerful debugging tools for rapid iteration.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </motion.section>

        {/* Why PrivOTC */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="space-y-6"
        >
          <div>
            <h2 className="text-2xl font-mono font-bold mb-2">Why PrivOTC?</h2>
          </div>

          <div className="border-l-2 border-primary/20 pl-6 space-y-6">
            <div>
              <h3 className="text-lg font-mono font-semibold mb-2">🚫 No Bots</h3>
              <p className="text-muted-foreground">
                World ID ensures one person = one account. Sybil attacks and bot manipulation 
                are cryptographically impossible.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-mono font-semibold mb-2">🔒 Complete Privacy</h3>
              <p className="text-muted-foreground">
                Four-layer privacy: ZK balance proofs, encrypted orders, TEE matching, 
                and atomic settlement. No one sees your trading activity.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-mono font-semibold mb-2">⚡ MEV-Resistant</h3>
              <p className="text-muted-foreground">
                Private order book prevents frontrunning and sandwich attacks. Save millions 
                in MEV extraction on large trades.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-mono font-semibold mb-2">🧠 Intelligent Matching</h3>
              <p className="text-muted-foreground">
                AI-powered matching finds optimal counterparties, detects manipulation, 
                and ensures fair execution—all while preserving privacy.
              </p>
            </div>
          </div>
        </motion.section>

        {/* GitHub */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="space-y-6"
        >
          <div className="border-2 border-foreground/20 bg-foreground/5 p-8 space-y-6">
            <div className="flex items-center gap-4">
              <Github className="h-8 w-8 text-foreground" />
              <div>
                <h2 className="text-2xl font-mono font-bold">Open Source</h2>
                <p className="text-sm text-muted-foreground">
                  View the complete source code on GitHub
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                onClick={() => window.open('https://github.com/theyuvan/PrivOTC.git', '_blank')}
                className="font-mono"
              >
                <Github className="mr-2 h-4 w-4" />
                View on GitHub
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={() => window.open('https://github.com/theyuvan/PrivOTC.git#readme', '_blank')}
                className="font-mono"
              >
                Read Documentation
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-foreground/10">
              <div>
                <div className="text-2xl font-mono font-bold text-primary">100%</div>
                <div className="text-xs text-muted-foreground">Bot Resistance</div>
              </div>
              <div>
                <div className="text-2xl font-mono font-bold text-primary">4</div>
                <div className="text-xs text-muted-foreground">Privacy Layers</div>
              </div>
              <div>
                <div className="text-2xl font-mono font-bold text-primary">0</div>
                <div className="text-xs text-muted-foreground">MEV Exposure</div>
              </div>
              <div>
                <div className="text-2xl font-mono font-bold text-primary">∞</div>
                <div className="text-xs text-muted-foreground">Trade Privacy</div>
              </div>
            </div>
          </div>
        </motion.section>
      </main>

      <Footer />
    </div>
  )
}
