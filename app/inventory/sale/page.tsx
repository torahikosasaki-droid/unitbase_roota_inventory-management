'use client'

import { useState, useCallback } from 'react'
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { maskImei } from '@/lib/imei'
import { toast } from 'sonner'

export default function SalePage() {
  const [pendingImeis, setPendingImeis] = useState<string[]>([])
  const [registeredImeis, setRegisteredImeis] = useState<string[]>([])
  const [scanning, setScanning] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleScan = useCallback((imei: string) => {
    if (registeredImeis.includes(imei)) {
      toast.warning('この端末はすでに販売登録済みです')
      return
    }
    setPendingImeis((prev) => {
      if (prev.includes(imei)) {
        toast.warning('このIMEIはすでにスキャン済みです')
        return prev
      }
      toast.success(`スキャン: ${maskImei(imei)}`)
      return [...prev, imei]
    })
  }, [registeredImeis])

  const removePending = (imei: string) => {
    setPendingImeis((prev) => prev.filter((i) => i !== imei))
  }

  const handleSubmit = async () => {
    if (pendingImeis.length === 0) return
    if (!window.confirm(`${pendingImeis.length}台を販売済みに登録します。よろしいですか？`)) return

    setSubmitting(true)
    const succeeded: string[] = []
    const failed: string[] = []
    try {
      await Promise.all(
        pendingImeis.map(async (imei) => {
          try {
            const res = await fetch('/api/sale', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ imei }),
            })
            if (!res.ok) throw new Error()
            succeeded.push(imei)
          } catch {
            failed.push(imei)
          }
        })
      )
      setRegisteredImeis((prev) => [...prev, ...succeeded])
      setPendingImeis(failed)
      if (succeeded.length > 0) toast.success(`${succeeded.length}台を販売登録しました`)
      if (failed.length > 0) toast.error(`${failed.length}台の登録に失敗しました`)
    } finally {
      setSubmitting(false)
    }
  }

  const allItems = [
    ...registeredImeis.map((imei) => ({ imei, registered: true })),
    ...pendingImeis.map((imei) => ({ imei, registered: false })),
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">販売登録</h1>
        <p className="text-xs text-slate-500 mt-1">成約した端末をスキャンしてまとめて登録します</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-slate-700">
              スキャン済み: {pendingImeis.length}台
              {registeredImeis.length > 0 && (
                <span className="text-green-600 ml-2">（登録済み: {registeredImeis.length}台）</span>
              )}
            </CardTitle>
            <Button
              size="sm"
              variant={scanning ? 'outline' : 'default'}
              onClick={() => setScanning(!scanning)}
              disabled={submitting}
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

          {allItems.length > 0 && (
            <div className="flex flex-col gap-1 mt-2">
              <p className="text-xs text-slate-500 mb-1">スキャンリスト</p>
              {allItems.map(({ imei, registered }, i) => (
                <div key={imei} className="flex items-center gap-2 py-1.5 border-b border-slate-100 last:border-0">
                  <span className="text-xs text-slate-400 w-5">{i + 1}</span>
                  <Badge
                    variant="outline"
                    className={`font-mono text-xs ${
                      registered
                        ? 'text-green-700 border-green-200 bg-green-50'
                        : 'text-blue-700 border-blue-200 bg-blue-50'
                    }`}
                  >
                    {maskImei(imei)}
                  </Badge>
                  {registered ? (
                    <span className="text-xs text-green-600 ml-auto">登録済</span>
                  ) : (
                    <button
                      onClick={() => removePending(imei)}
                      className="text-xs text-slate-400 hover:text-red-500 ml-auto transition-colors"
                      title="削除"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        onClick={handleSubmit}
        disabled={submitting || pendingImeis.length === 0}
        className="w-full"
      >
        {submitting ? '登録中...' : `${pendingImeis.length}台を販売登録する`}
      </Button>
    </div>
  )
}
