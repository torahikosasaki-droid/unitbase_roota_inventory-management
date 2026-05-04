'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/',                   label: 'ホーム' },
  { href: '/inventory',          label: '在庫一覧' },
  { href: '/inventory/checkout', label: '持ち出し' },
  { href: '/inventory/sale',     label: '販売登録' },
  { href: '/inventory/return',   label: '返却照合' },
  { href: '/inventory/import',   label: '在庫インポート' },
  { href: '/import',             label: '販売インポート' },
  { href: '/equipment',          label: '備品管理' },
  { href: '/admin',              label: '管理' },
  { href: '/settings',           label: '設定' },
]

const mobileNavItems = [navItems[0], navItems[2], navItems[3], navItems[4], navItems[9]]

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}

export function Navigation() {
  const pathname = usePathname()

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-screen-xl mx-auto px-4 h-12 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-800 shrink-0">在庫管理</span>
          <nav className="hidden sm:flex gap-3 overflow-x-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`text-xs whitespace-nowrap transition-colors ${
                  isActive(pathname, item.href)
                    ? 'text-slate-900 font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Bottom nav for mobile */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 flex z-10">
        {mobileNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 text-center py-3 text-xs transition-colors border-t-2 ${
              isActive(pathname, item.href)
                ? 'text-slate-900 font-semibold border-slate-800'
                : 'text-slate-400 border-transparent'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  )
}
