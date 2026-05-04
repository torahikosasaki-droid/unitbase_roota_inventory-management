import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { Navigation } from '@/components/Navigation'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '在庫管理',
  description: 'IMEI端末在庫管理システム',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: '在庫管理' },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${geist.className} bg-slate-50 min-h-screen`}>
        <Navigation />
        <main className="max-w-screen-xl mx-auto px-4 py-6 pb-24 sm:pb-6">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  )
}
