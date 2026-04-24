'use client'

import { useEffect, useState } from 'react'
import { InventoryTable } from '@/components/inventory/InventoryTable'
import { Button } from '@/components/ui/button'
import type { SheetRow } from '@/types/inventory'

export default function InventoryPage() {
  const [devices, setDevices] = useState<SheetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [alertOnly, setAlertOnly] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async (onlyAlerts: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/sheets/inventory${onlyAlerts ? '?alert=only' : ''}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setDevices(data.devices)
    } catch {
      setError('データの取得に失敗しました。接続を確認してください。')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(alertOnly) }, [alertOnly])

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
          <Button
            variant={alertOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAlertOnly(!alertOnly)}
            className="text-xs"
          >
            {alertOnly ? 'すべて表示' : 'アラートのみ'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => load(alertOnly)} className="text-xs">
            更新
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</p>
      )}

      {loading ? (
        <div className="text-center py-12 text-sm text-slate-400">読み込み中...</div>
      ) : (
        <InventoryTable devices={devices} />
      )}
    </div>
  )
}
