import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import Link from 'next/link'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

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

const navItems = [
  { href: '/', label: 'ホーム' },
  { href: '/inventory', label: '在庫一覧' },
  { href: '/inventory/checkout', label: '持ち出し' },
  { href: '/inventory/sale', label: '販売登録' },
  { href: '/inventory/return', label: '返却照合' },
  { href: '/import', label: 'インポート' },
  { href: '/admin', label: '管理' },
  { href: '/settings', label: '設定' },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${geist.className} bg-slate-50 min-h-screen`}>
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800">在庫管理</span>
            <nav className="hidden sm:flex gap-4">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-6 pb-24 sm:pb-6">
          {children}
        </main>

        {/* Bottom nav for mobile: ホーム/持ち出し/販売/返却/設定 */}
        <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 flex">
          {[navItems[0], navItems[2], navItems[3], navItems[4], navItems[6]].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex-1 text-center py-3 text-xs text-slate-500 hover:text-slate-900 active:bg-slate-50 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Toaster />
      </body>
    </html>
  )
}
