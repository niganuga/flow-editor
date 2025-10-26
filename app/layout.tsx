import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { KeyboardShortcuts } from '@/components/keyboard-shortcuts'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Photo Editor - OneFlow',
  description: 'Professional image editing with AI tools',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}
      >
        <KeyboardShortcuts />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
