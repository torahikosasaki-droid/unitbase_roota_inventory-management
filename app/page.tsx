'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertBadge } from '@/components/inventory/StockAlert'
import { ReplenishmentCard, type ReplenishmentGroupData } from '@/components/dashboard/ReplenishmentCard'
import { maskImei } from '@/lib/imei'
import type { SheetRow, SafetyStockSetting, Booth } from '@/types/inventory'

interface DashboardData {
  summary: {
    total: number
    inStock: number
    checkedOut: number
    sold: number
    returned: number
  }
  alerts: {
    missingRisk: number
    recordMiss: number
    checkoutMiss: number
    total: number
  }
  recentAlerts: SheetRow[]
  todayActivity: {
    checkedOut: number
    sold: number
    today: string
  }
}


const actions = [
  { href: '/inventory/checkout', label: '持ち出し登録', color: 'text-blue-600' },
  { href: '/inventory/sale',     label: '販売登録',     color: 'text-green-600' },
  { href: '/inventory/return',   label: '返却照合',     color: 'text-orange-600' },
  { href: '/inventory',          label: '在庫一覧',     color: 'text-slate-600' },
]

function SkeletonCard() {
  return (
    <Card className="border-slate-200">
      <CardContent className="px-4 py-4">
        <div className="h-3 w-16 bg-slate-100 rounded animate-pulse mb-2" />
        <div className="h-7 w-10 bg-slate-100 rounded animate-pulse" />
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [replenishment, setReplenishment] = useState<ReplenishmentGroupData[]>([])

  useEffect(() => {
    setError(false)
    setData(null)
    fetch('/api/dashboard')
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then(setData)
      .catch(() => setError(true))
  }, [retryCount])

  useEffect(() => {
    Promise.all([
      fetch('/api/settings/safety-stock').then((r) => r.json()),
      fetch('/api/settings/booths').then((r) => r.json()),
      // 持ち出し中の端末（チームが現在保持している台数の算出に使う）
      fetch('/api/sheets/inventory?status=checked_out').then((r) => r.json()),
    ]).then(([ssData, boothData, invData]) => {
      const settings: SafetyStockSetting[] = ssData.settings ?? []
      const booths: Booth[] = boothData.booths ?? []
      const devices: SheetRow[] = invData.devices ?? []

      // チームごとにグループ化
      const groupMap = new Map<string, ReplenishmentGroupData>()

      for (const s of settings) {
        const booth = booths.find((b) => b.id === s.boothId)
        const boothName = booth?.name ?? s.boothId

        const calculatedStock = devices.filter(
          (d) =>
            d.salesBooth === boothName &&
            d.mainCategory === s.mainCategory &&
            (!s.subCategory || d.subCategory === s.subCategory)
        ).length
        const currentStock = s.currentStock ?? calculatedStock

        const needed = Math.max(0, s.threshold - currentStock)
        const label = s.subCategory ? `${s.mainCategory} / ${s.subCategory}` : s.mainCategory

        if (!groupMap.has(boothName)) {
          groupMap.set(boothName, { boothName, categories: [], totalNeeded: 0 })
        }
        const group = groupMap.get(boothName)!
        group.categories.push({ label, currentStock, threshold: s.threshold, needed })
        group.totalNeeded += needed
      }

      setReplenishment(Array.from(groupMap.values()))
    }).catch(() => {})
  }, [])

  const now = new Date()
  const dateLabel = now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div>
        <p className="text-xs text-slate-400">{dateLabel}</p>
        <h1 className="text-xl font-semibold text-slate-800 mt-0.5">ダッシュボード</h1>
      </div>

      {/* Alert banner */}
      {error ? (
        <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-slate-500">データを取得できませんでした</span>
          <button
            onClick={() => setRetryCount((c) => c + 1)}
            className="text-xs text-slate-600 underline ml-3 shrink-0"
          >
            再読み込み
          </button>
        </div>
      ) : !data ? null : data.alerts.total === 0 ? (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 flex items-center gap-2">
          <span className="text-green-600 text-sm font-medium">異常なし</span>
          <span className="text-green-500 text-xs">すべての端末が正常です</span>
        </div>
      ) : (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-red-600 text-sm font-semibold">アラート {data.alerts.total}件</span>
            {data.alerts.missingRisk > 0 && (
              <span className="text-xs text-red-500">紛失リスク {data.alerts.missingRisk}件を含む</span>
            )}
          </div>
          <Link href="/inventory?alert=only" className="text-xs text-red-600 underline">確認</Link>
        </div>
      )}

      {/* Inventory summary */}
      <section>
        <p className="text-xs font-medium text-slate-500 mb-2">在庫サマリー</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {!data ? (
            <><SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
          ) : (
            <>
              <Card className="border-slate-200">
                <CardHeader className="pb-0 pt-4 px-4"><CardTitle className="text-xs text-slate-400">総台数</CardTitle></CardHeader>
                <CardContent className="px-4 pb-4"><p className="text-2xl font-semibold text-slate-800">{data.summary.total}</p></CardContent>
              </Card>
              <Card className="border-slate-200">
                <CardHeader className="pb-0 pt-4 px-4"><CardTitle className="text-xs text-slate-400">在庫中</CardTitle></CardHeader>
                <CardContent className="px-4 pb-4"><p className="text-2xl font-semibold text-slate-700">{data.summary.inStock}</p></CardContent>
              </Card>
              <Card className="border-blue-100">
                <CardHeader className="pb-0 pt-4 px-4"><CardTitle className="text-xs text-blue-400">持ち出し中</CardTitle></CardHeader>
                <CardContent className="px-4 pb-4"><p className="text-2xl font-semibold text-blue-600">{data.summary.checkedOut}</p></CardContent>
              </Card>
              <Card className="border-green-100">
                <CardHeader className="pb-0 pt-4 px-4"><CardTitle className="text-xs text-green-400">販売済み</CardTitle></CardHeader>
                <CardContent className="px-4 pb-4"><p className="text-2xl font-semibold text-green-600">{data.summary.sold}</p></CardContent>
              </Card>
            </>
          )}
        </div>
      </section>

      {/* Alert counts */}
      <section>
        <p className="text-xs font-medium text-slate-500 mb-2">アラート件数</p>
        <div className="grid grid-cols-3 gap-2">
          {!data ? (
            <><SkeletonCard /><SkeletonCard /><SkeletonCard /></>
          ) : (
            <>
              <Card className={data.alerts.missingRisk > 0 ? 'border-red-200 bg-red-50' : 'border-slate-200'}>
                <CardHeader className="pb-0 pt-3 px-3"><CardTitle className="text-xs text-red-400">紛失リスク</CardTitle></CardHeader>
                <CardContent className="px-3 pb-3"><p className={`text-2xl font-semibold ${data.alerts.missingRisk > 0 ? 'text-red-600' : 'text-slate-300'}`}>{data.alerts.missingRisk}</p></CardContent>
              </Card>
              <Card className={data.alerts.recordMiss > 0 ? 'border-amber-200 bg-amber-50' : 'border-slate-200'}>
                <CardHeader className="pb-0 pt-3 px-3"><CardTitle className="text-xs text-amber-400">記録ミス</CardTitle></CardHeader>
                <CardContent className="px-3 pb-3"><p className={`text-2xl font-semibold ${data.alerts.recordMiss > 0 ? 'text-amber-600' : 'text-slate-300'}`}>{data.alerts.recordMiss}</p></CardContent>
              </Card>
              <Card className={data.alerts.checkoutMiss > 0 ? 'border-amber-200 bg-amber-50' : 'border-slate-200'}>
                <CardHeader className="pb-0 pt-3 px-3"><CardTitle className="text-xs text-amber-400">持ち出し漏れ</CardTitle></CardHeader>
                <CardContent className="px-3 pb-3"><p className={`text-2xl font-semibold ${data.alerts.checkoutMiss > 0 ? 'text-amber-600' : 'text-slate-300'}`}>{data.alerts.checkoutMiss}</p></CardContent>
              </Card>
            </>
          )}
        </div>
      </section>

      {/* Replenishment dashboard */}
      {replenishment.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-xs font-medium text-slate-500">チーム別補充状況</p>
              <p className="text-xs text-slate-400 mt-0.5">
                補充要: {replenishment.filter((g) => g.totalNeeded > 0).length} /
                {replenishment.length} チーム
              </p>
            </div>
            <Link href="/settings" className="text-xs text-slate-400 hover:text-slate-700">基準在庫を設定</Link>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {replenishment.map((group) => (
              <ReplenishmentCard key={group.boothName} {...group} />
            ))}
          </div>
        </section>
      )}

      {/* Today's activity */}
      {data && (
        <section>
          <p className="text-xs font-medium text-slate-500 mb-2">本日の活動</p>
          <Card className="border-slate-200">
            <CardContent className="px-4 py-3 flex items-center gap-6">
              <div>
                <p className="text-xs text-slate-400">持ち出し</p>
                <p className="text-xl font-semibold text-blue-600">{data.todayActivity.checkedOut}<span className="text-xs text-slate-400 ml-1">台</span></p>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <p className="text-xs text-slate-400">販売</p>
                <p className="text-xl font-semibold text-green-600">{data.todayActivity.sold}<span className="text-xs text-slate-400 ml-1">台</span></p>
              </div>
              <p className="text-xs text-slate-300 ml-auto">{data.todayActivity.today}</p>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Recent alerts */}
      {data && data.recentAlerts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-slate-500">直近のアラート</p>
            <Link href="/inventory?alert=only" className="text-xs text-slate-400 hover:text-slate-700">すべて見る</Link>
          </div>
          <Card className="border-slate-200 overflow-hidden">
            {data.recentAlerts.map((row, i) => (
              <div
                key={row.imei}
                className={`flex items-start gap-3 px-4 py-3 ${i !== data.recentAlerts.length - 1 ? 'border-b border-slate-100' : ''} ${row.alert?.includes('紛失') ? 'bg-red-50' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-slate-600">{maskImei(row.imei)}</p>
                  <div className="mt-1"><AlertBadge text={row.alert} /></div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-400">{row.checkoutDate ?? '—'}</p>
                  {row.salesBooth && <p className="text-xs text-slate-400">ブース {row.salesBooth}</p>}
                </div>
              </div>
            ))}
          </Card>
        </section>
      )}

      {/* Quick actions */}
      <section>
        <p className="text-xs font-medium text-slate-500 mb-2">クイックアクション</p>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((a) => (
            <Link key={a.href} href={a.href}>
              <Card className="hover:shadow-sm transition-shadow cursor-pointer border-slate-200 active:bg-slate-50">
                <CardContent className="px-4 py-3">
                  <p className={`text-sm font-medium ${a.color}`}>{a.label}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

    </div>
  )
}
