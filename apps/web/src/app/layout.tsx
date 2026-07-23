import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata: Metadata = {
  title: 'RDS AI Call Centre',
  description: 'Production-ready AI-powered call centre platform',
  other: {
    'preconnect': 'https://fonts.googleapis.com',
    'preconnect-crossorigin': 'https://fonts.gstatic.com',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
