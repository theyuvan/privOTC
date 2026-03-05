import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import { GeistPixelGrid } from 'geist/font/pixel'
import { ThemeProvider } from '@/components/theme-provider'
import { Web3Provider } from '@/components/Web3Provider'
import { Toaster } from '@/components/ui/sonner'

import './globals.css'

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'PrivOTC — Human-Verified Confidential OTC Trading',
  description:
    "PrivOTC is a confidential OTC trading protocol powered by World ID and Chainlink CRE. Verify your humanity once with a ZK proof, then trade privately — your order details stay encrypted end-to-end, matched by Chainlink's trusted execution environment, settled on-chain.",
  keywords: [
    'OTC trading',
    'confidential trading',
    'World ID',
    'Chainlink CRE',
    'ZK proof',
    'DeFi',
    'MEV protection',
    'encrypted order book',
    'private trading',
    'hackathon',
    'Chainlink',
    'World ID 4.0',
    'privOTC',
  ],
  authors: [{ name: 'PrivOTC Team' }],
  creator: 'PrivOTC',
  publisher: 'PrivOTC',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'PrivOTC — Human-Verified Confidential OTC Trading',
    description:
      'Verify your humanity with World ID, then trade privately. Encrypted orders matched by Chainlink CRE. No bots. No frontrunning. Zero knowledge.',
    siteName: 'PrivOTC',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PrivOTC — Human-Verified Confidential OTC Trading',
    description:
      'World ID + Chainlink CRE = private, bot-free, MEV-resistant OTC trading. Built for the Chainlink Hackathon.',
    creator: '@privotc',
  },
  category: 'technology',
}

export const viewport: Viewport = {
  themeColor: '#F2F1EA',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} ${GeistPixelGrid.variable}`} suppressHydrationWarning>
      <body className="font-mono antialiased">
        <Web3Provider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
            {children}
            <Toaster />
          </ThemeProvider>
        </Web3Provider>
      </body>
    </html>
  )
}
