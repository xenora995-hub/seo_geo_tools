import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SEO/GEO Tools',
  description: 'Sistem otomasi konten SEO & GEO',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
