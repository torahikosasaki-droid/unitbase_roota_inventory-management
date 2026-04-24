'use client'

import { useState, useCallback } from 'react'
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { maskImei } from '@/lib/imei'
import { toast } from 'sonner'

export default function SalePage() {
  const [soldImeis, setSoldImeis] = useState<string[]>([])
  const [scanning, setScanning] = useState(false)
  const [processing, setProcessing] = useState(false)

  const handleScan = useCallback(async (imei: string) => {
    if (soldImeis.includes(imei)) {
      toast.warning('このIMEIはすでに登録済みです')
      return
    }

    setProcessing(true)
    try {
      const res = await fetch('/api/sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imei }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setSoldImeis((prev) => [...prev, imei])
      toast.success(`販売登録: ${maskImei(imei)}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '登録に失敗しました')
    } finally {
      setProcessing(false)
    }
  }, [soldImeis])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">販売登録</h1>
        <p className="text-xs text-slate-500 mt-1">成約した端末のIMEIをスキャンしてください</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-slate-700">
              販売済み: {soldImeis.length}台
            </CardTitle>
            <Button
              size="sm"
              variant={scanning ? 'outline' : 'default'}
              onClick={() => setScanning(!scanning)}
              disabled={processing}
              className="text-xs"
            >
              {scanning ? 'スキャン停止' : 'スキャン開始'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {scanning && (
            <BarcodeScanner
              onScan={handleScan}
              isActive={scanning && !processing}
              onClose={() => setScanning(false)}
            />
          )}

          {processing && (
            <p className="text-xs text-slate-500 text-center animate-pulse">登録中...</p>
          )}

          {soldImeis.length > 0 && (
            <div className="flex flex-col gap-1 mt-2">
              <p className="text-xs text-slate-500 mb-1">本日の販売登録</p>
              {soldImeis.map((imei, i) => (
                <div key={imei} className="flex items-center gap-2 py-1.5 border-b border-slate-100 last:border-0">
                  <span className="text-xs text-slate-400 w-5">{i + 1}</span>
                  <Badge variant="outline" className="font-mono text-xs text-green-700 border-green-200 bg-green-50">
                    {maskImei(imei)}
                  </Badge>
                  <span className="text-xs text-green-600 ml-auto">登録済</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
