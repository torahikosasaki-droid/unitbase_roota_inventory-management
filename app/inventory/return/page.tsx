'use client'

import { useState, useCallback } from 'react'
import { BarcodeScanner } from '@/components/scanner/BarcodeScanner'
import { StockAlert } from '@/components/inventory/StockAlert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { maskImei } from '@/lib/imei'
import { toast } from 'sonner'
import type { ReconciliationResult } from '@/types/inventory'

export default function ReturnPage() {
  const [checkedOutInput, setCheckedOutInput] = useState('')
  const [soldInput, setSoldInput] = useState('')
  const [scannedImeis, setScannedImeis] = useState<string[]>([])
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ReconciliationResult | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const parseImeiList = (input: string): string[] =>
    input.split(/[\n,\s]+/).map((s) => s.trim()).filter(Boolean)

  const checkedOutImeis = parseImeiList(checkedOutInput)
  const soldImeis = parseImeiList(soldInput)
  const expectedReturns = checkedOutImeis.filter((i) => !soldImeis.includes(i))

  const handleScan = useCallback((imei: string) => {
    setScannedImeis((prev) => {
      if (prev.includes(imei)) {
        toast.warning('このIMEIはすでにスキャン済みです')
        return prev
      }
      toast.success(`スキャン: ${maskImei(imei)}`)
      return [...prev, imei]
    })
    setResult(null)
  }, [])

  const handleReconcile = async () => {
    if (checkedOutImeis.length === 0) { toast.error('持ち出しIMEIを入力してください'); return }
    if (scannedImeis.length === 0) { toast.error('端末をスキャンしてください'); return }

    setSubmitting(true)
    try {
      const res = await fetch('/api/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkedOutImeis, soldImeis, scannedImeis }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setResult(data)
      if (data.isComplete) {
        toast.success('照合完了！全台確認済みです')
      } else {
        toast.error(`${data.missing.length}台が未確認です`)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '照合に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">返却照合</h1>
        <p className="text-xs text-slate-500 mt-1">手元の端末をスキャンして持ち出し数と照合します</p>
      </div>

      {/* Input section */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-slate-700">セッション情報</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div>
            <Label className="text-xs text-slate-600">
              持ち出しIMEI一覧（改行・カンマ区切り）
            </Label>
            <textarea
              value={checkedOutInput}
              onChange={(e) => setCheckedOutInput(e.target.value)}
              placeholder={"持ち出したIMEIを入力\n例: 12345678901234\n12345678901235"}
              rows={3}
              className="mt-1 w-full text-xs font-mono rounded-md border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <p className="text-xs text-slate-400 mt-0.5">{checkedOutImeis.length}台入力済み</p>
          </div>
          <div>
            <Label className="text-xs text-slate-600">
              販売済みIMEI一覧（改行・カンマ区切り）
            </Label>
            <textarea
              value={soldInput}
              onChange={(e) => setSoldInput(e.target.value)}
              placeholder="販売した端末のIMEI"
              rows={2}
              className="mt-1 w-full text-xs font-mono rounded-md border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <p className="text-xs text-slate-400 mt-0.5">{soldImeis.length}台入力済み → 返却すべき台数: {expectedReturns.length}台</p>
          </div>
        </CardContent>
      </Card>

      {/* Scanner */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-slate-700">
              スキャン済み: {scannedImeis.length} / {expectedReturns.length}台
            </CardTitle>
            <Button
              size="sm"
              variant={scanning ? 'outline' : 'default'}
              onClick={() => setScanning(!scanning)}
              className="text-xs"
            >
              {scanning ? '停止' : 'スキャン'}
            </Button>
          </div>
          {expectedReturns.length > 0 && (
            <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (scannedImeis.length / expectedReturns.length) * 100)}%` }}
              />
            </div>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {scanning && (
            <BarcodeScanner
              onScan={handleScan}
              isActive={scanning}
              onClose={() => setScanning(false)}
            />
          )}

          {scannedImeis.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {scannedImeis.map((imei) => (
                <Badge key={imei} variant="outline" className="font-mono text-xs">
                  {maskImei(imei)}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        onClick={handleReconcile}
        disabled={submitting || scannedImeis.length === 0 || checkedOutImeis.length === 0}
        className="w-full"
        variant={result?.isComplete ? 'outline' : 'default'}
      >
        {submitting ? '照合中...' : '照合実行'}
      </Button>

      {/* Result */}
      {result && (
        <div className="flex flex-col gap-3">
          {result.isComplete ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-green-700 font-semibold">照合完了</p>
              <p className="text-green-600 text-sm mt-1">{result.scanned.length}台すべて確認済みです</p>
            </div>
          ) : (
            <StockAlert missingImeis={result.missing} extraImeis={result.extra} />
          )}
        </div>
      )}
    </div>
  )
}
