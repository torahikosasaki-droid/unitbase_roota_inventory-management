'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { InventoryTable } from '@/components/inventory/InventoryTable'
import { InventoryFilters, emptyFilters, type InventoryFilterState } from '@/components/inventory/InventoryFilters'
import { Button } from '@/components/ui/button'
import type { SheetRow } from '@/types/inventory'
import Link from 'next/link'

function buildQuery(f: InventoryFilterState): string {
  const params = new URLSearchParams()
  if (f.alertOnly) params.set('alert', 'only')
  if (f.status.length > 0) params.set('status', f.status.join(','))
  if (f.mainCategory) params.set('mainCategory', f.mainCategory)
  if (f.subCategory) params.set('subCategory', f.subCategory)
  if (f.deliveryDateFrom) params.set('deliveryDateFrom', f.deliveryDateFrom)
  if (f.deliveryDateTo) params.set('deliveryDateTo', f.deliveryDateTo)
  return params.toString()
}

function InventoryPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [devices, setDevices] = useState<SheetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<InventoryFilterState>(() => ({
    alertOnly: searchParams.get('alert') === 'only',
    status: searchParams.get('status')?.split(',').filter(Boolean) as InventoryFilterState['status'] ?? [],
    mainCategory: searchParams.get('mainCategory') ?? '',
    subCategory: searchParams.get('subCategory') ?? '',
    deliveryDateFrom: searchParams.get('deliveryDateFrom') ?? '',
    deliveryDateTo: searchParams.get('deliveryDateTo') ?? '',
  }))

  const load = useCallback(async (f: InventoryFilterState) => {
    setLoading(true)
    setError(null)
    try {
      const q = buildQuery(f)
      const res = await fetch(`/api/sheets/inventory${q ? `?${q}` : ''}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setDevices(data.devices)
    } catch {
      setError('データの取得に失敗しました。接続を確認してください。')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(filters) }, [filters, load])

  const handleFilterChange = (f: InventoryFilterState) => {
    setFilters(f)
    const q = buildQuery(f)
    router.replace(`/inventory${q ? `?${q}` : ''}`, { scroll: false })
  }

  const handleReset = () => handleFilterChange(emptyFilters)

  const alertCount = devices.filter((d) => d.alert).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">在庫一覧</h1>
          {!loading && (
            <p className="text-xs text-slate-500 mt-0.5">
              {devices.length}件
              {alertCount > 0 && (
                <span className="ml-2 text-red-600 font-medium">アラート {alertCount}件</span>
              )}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href="/inventory/import">
            <Button variant="outline" size="sm" className="text-xs">在庫インポート</Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => load(filters)} className="text-xs">
            更新
          </Button>
        </div>
      </div>

      <InventoryFilters filters={filters} onChange={handleFilterChange} onReset={handleReset} />

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</p>
      )}

      {loading ? (
        <div className="text-center py-12 text-sm text-slate-400">読み込み中...</div>
      ) : (
        <InventoryTable devices={devices} onStatusChanged={() => load(filters)} />
      )}
    </div>
  )
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-sm text-slate-400">読み込み中...</div>}>
      <InventoryPageInner />
    </Suspense>
  )
}
