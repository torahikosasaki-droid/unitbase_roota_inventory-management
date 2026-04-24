'use client'

import { useEffect, useState } from 'react'
import { InventoryTable } from '@/components/inventory/InventoryTable'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { SheetRow } from '@/types/inventory'
import { toast } from 'sonner'

export default function AdminPage() {
  const [devices, setDevices] = useState<SheetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/sheets/inventory')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setDevices(data.devices)
    } catch {
      toast.error('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const runAlertScan = async () => {
    setScanning(true)
    try {
      const res = await fetch('/api/sheets/inventory/alert-scan', { method: 'POST' })
      const data = await res.json()
      toast.success(`アラートスキャン完了: ${data.alertCount}件のアラートを更新しました`)
      await load()
    } catch {
      toast.error('アラートスキャンに失敗しました')
    } finally {
      setScanning(false)
    }
  }

  useEffect(() => { load() }, [])

  const missingRisk = devices.filter((d) => d.alert?.includes('紛失'))
  const recordMiss = devices.filter((d) => d.alert && !d.alert.includes('紛失'))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">管理ダッシュボード</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} className="text-xs">更新</Button>
          <Button size="sm" onClick={runAlertScan} disabled={scanning} className="text-xs">
            {scanning ? 'スキャン中...' : 'アラートスキャン'}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="border-slate-200">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-slate-500">全端末</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-semibold text-slate-800">{devices.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-slate-500">持ち出し中</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-semibold text-blue-600">
              {devices.filter((d) => d.checkoutFlag && !d.returnedFlag && !d.soldFlag).length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-red-100">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-red-500">紛失リスク</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-semibold text-red-600">{missingRisk.length}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-100">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs text-amber-500">記録ミス</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-semibold text-amber-600">{recordMiss.length}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-slate-400">読み込み中...</div>
      ) : (
        <InventoryTable devices={devices} />
      )}
    </div>
  )
}
