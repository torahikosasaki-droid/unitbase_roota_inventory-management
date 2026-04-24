'use client'

import { useState, useCallback } from 'react'
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { maskImei } from '@/lib/imei'
import { toast } from 'sonner'

export default function CheckoutPage() {
  const [staffName, setStaffName] = useState('')
  const [salesBooth, setSalesBooth] = useState('')
  const [scannedImeis, setScannedImeis] = useState<string[]>([])
  const [scanning, setScanning] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleScan = useCallback((imei: string) => {
    setScannedImeis((prev) => {
      if (prev.includes(imei)) {
        toast.warning('このIMEIはすでに追加されています')
        return prev
      }
      toast.success(`スキャン完了: ${maskImei(imei)}`)
      return [...prev, imei]
    })
  }, [])

  const removeImei = (imei: string) => {
    setScannedImeis((prev) => prev.filter((i) => i !== imei))
  }

  const handleSubmit = async () => {
    if (!staffName.trim()) { toast.error('担当者名を入力してください'); return }
    if (!salesBooth.trim()) { toast.error('販売ブースを入力してください'); return }
    if (scannedImeis.length === 0) { toast.error('端末をスキャンしてください'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imeis: scannedImeis,
          staffName,
          salesBooth,
          checkoutDate: new Date().toLocaleDateString('ja-JP'),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success(`${data.summary.success}台の持ち出しを登録しました`)
      if (data.summary.failed > 0) {
        toast.warning(`${data.summary.failed}台はスプレッドシートに見つかりませんでした`)
      }
      setScannedImeis([])
      setStaffName('')
      setSalesBooth('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '登録に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">持ち出し登録</h1>
        <p className="text-xs text-slate-500 mt-1">持ち出す端末のIMEIをスキャンしてください</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-slate-700">担当者情報</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div>
            <Label className="text-xs text-slate-600">担当者名</Label>
            <Input
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              placeholder="例：田中"
              className="mt-1 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-600">販売ブース</Label>
            <Input
              value={salesBooth}
              onChange={(e) => setSalesBooth(e.target.value)}
              placeholder="例：A"
              className="mt-1 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Scanner */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-slate-700">
              スキャン済み: {scannedImeis.length}台
            </CardTitle>
            <Button
              size="sm"
              variant={scanning ? 'outline' : 'default'}
              onClick={() => setScanning(!scanning)}
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
              isActive={scanning}
              onClose={() => setScanning(false)}
            />
          )}

          {/* Scanned list */}
          {scannedImeis.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {scannedImeis.map((imei) => (
                <Badge
                  key={imei}
                  variant="outline"
                  className="font-mono text-xs cursor-pointer hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                  onClick={() => removeImei(imei)}
                >
                  {maskImei(imei)} ✕
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        onClick={handleSubmit}
        disabled={submitting || scannedImeis.length === 0}
        className="w-full"
      >
        {submitting ? '登録中...' : `${scannedImeis.length}台を持ち出し登録`}
      </Button>
    </div>
  )
}
