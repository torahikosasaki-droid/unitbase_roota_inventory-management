'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { maskImei } from '@/lib/imei'
import { toast } from 'sonner'

// ----------------------------------------------------------------
// CSV parser
// ----------------------------------------------------------------
function parseCsv(text: string): string[][] {
  // Handle both CRLF and LF, strip BOM
  const cleaned = text.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  return cleaned
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      // Quoted field support
      const fields: string[] = []
      let cur = ''
      let inQuote = false
      for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') { inQuote = !inQuote; continue }
        if (ch === ',' && !inQuote) { fields.push(cur.trim()); cur = ''; continue }
        cur += ch
      }
      fields.push(cur.trim())
      return fields
    })
}

type Step = 'upload' | 'mapping' | 'preview' | 'result'

interface ParsedRecord { imei: string; soldDate: string }

interface ImportResult {
  matched: string[]
  notFound: string[]
  skipped: string[]
}

// ----------------------------------------------------------------
// Step indicators
// ----------------------------------------------------------------
const STEPS = ['アップロード', 'カラム指定', 'プレビュー', '結果']

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className={`flex items-center gap-1.5 ${i <= current ? 'text-slate-800' : 'text-slate-300'}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium border ${i < current ? 'bg-slate-800 border-slate-800 text-white' : i === current ? 'border-slate-800 text-slate-800' : 'border-slate-300 text-slate-300'}`}>
              {i < current ? '✓' : i + 1}
            </div>
            <span className="text-xs hidden sm:inline">{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-6 sm:w-10 h-px mx-1 ${i < current ? 'bg-slate-800' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ----------------------------------------------------------------
// Main page
// ----------------------------------------------------------------
export default function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [rows, setRows] = useState<string[][]>([])        // parsed CSV rows
  const [headers, setHeaders] = useState<string[]>([])    // first row
  const [imeiCol, setImeiCol] = useState(0)
  const [dateCol, setDateCol] = useState(1)
  const [records, setRecords] = useState<ParsedRecord[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)
  const [importing, setImporting] = useState(false)
  const [fileName, setFileName] = useState('')

  const stepIndex: Record<Step, number> = { upload: 0, mapping: 1, preview: 2, result: 3 }

  // ---- Step 1: File upload ----
  const handleFile = (file: File) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCsv(text)
      if (parsed.length < 2) { toast.error('データが2行以上必要です'); return }
      setHeaders(parsed[0])
      setRows(parsed.slice(1))
      // Auto-detect IMEI / date columns by header name
      const hLower = parsed[0].map((h) => h.toLowerCase())
      const imeiIdx = hLower.findIndex((h) => h.includes('imei') || h.includes('製造番号') || h.includes('端末'))
      const dateIdx = hLower.findIndex((h) => h.includes('日') || h.includes('date'))
      if (imeiIdx >= 0) setImeiCol(imeiIdx)
      if (dateIdx >= 0) setDateCol(dateIdx)
      setStep('mapping')
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  // ---- Step 2: Mapping confirm ----
  const handleMappingConfirm = () => {
    if (imeiCol === dateCol) { toast.error('IMEI列と販売日列に同じ列は指定できません'); return }
    const parsed: ParsedRecord[] = rows
      .map((row) => ({ imei: row[imeiCol]?.trim() ?? '', soldDate: row[dateCol]?.trim() ?? '' }))
      .filter((r) => r.imei.length > 0 && r.soldDate.length > 0)
    if (parsed.length === 0) { toast.error('有効なレコードが見つかりません'); return }
    setRecords(parsed)
    setStep('preview')
  }

  // ---- Step 3: Execute import ----
  const handleImport = async () => {
    setImporting(true)
    try {
      const res = await fetch('/api/import/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
      setStep('result')
      toast.success(`インポート完了: ${data.matched.length}件照合`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'インポートに失敗しました')
    } finally {
      setImporting(false)
    }
  }

  const handleReset = () => {
    setStep('upload'); setRows([]); setHeaders([]); setRecords([])
    setResult(null); setFileName(''); setImeiCol(0); setDateCol(1)
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">販売実績インポート</h1>
        <p className="text-xs text-slate-500 mt-1">外部システムのCSVを取り込み、在庫表の販売日時を一括更新します</p>
      </div>

      <StepBar current={stepIndex[step]} />

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card className="border-slate-200">
          <CardContent className="px-4 py-6">
            <div
              className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center hover:border-slate-400 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
            >
              <p className="text-sm text-slate-600 font-medium">CSVファイルをドロップ</p>
              <p className="text-xs text-slate-400 mt-1">またはクリックして選択</p>
              <p className="text-xs text-slate-300 mt-3">UTF-8 / Shift-JIS CSV (.csv)</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
          </CardContent>
        </Card>
      )}

      {/* Step 2: Column mapping */}
      {step === 'mapping' && (
        <div className="flex flex-col gap-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-700">カラムを指定</CardTitle>
              <p className="text-xs text-slate-400">{fileName} — {rows.length}件</p>
            </CardHeader>
            <CardContent className="px-4 pb-4 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-2">IMEI列</p>
                  <div className="flex flex-col gap-1">
                    {headers.map((h, i) => (
                      <button
                        key={i}
                        onClick={() => setImeiCol(i)}
                        className={`text-left px-3 py-2 rounded text-xs border transition-colors ${imeiCol === i ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                      >
                        {h || `列${i + 1}`}
                        <span className="ml-1 opacity-50 font-mono">({rows[0]?.[i] ?? '—'})</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600 mb-2">販売日列</p>
                  <div className="flex flex-col gap-1">
                    {headers.map((h, i) => (
                      <button
                        key={i}
                        onClick={() => setDateCol(i)}
                        className={`text-left px-3 py-2 rounded text-xs border transition-colors ${dateCol === i ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                      >
                        {h || `列${i + 1}`}
                        <span className="ml-1 opacity-50 font-mono">({rows[0]?.[i] ?? '—'})</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} className="text-xs">戻る</Button>
            <Button size="sm" onClick={handleMappingConfirm} className="text-xs flex-1">
              次へ（プレビュー）
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && (
        <div className="flex flex-col gap-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm text-slate-700">インポートプレビュー</CardTitle>
                <Badge variant="outline" className="text-xs">{records.length}件</Badge>
              </div>
              <p className="text-xs text-slate-400">先頭20件を表示</p>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="text-xs text-slate-500 pl-4">#</TableHead>
                      <TableHead className="text-xs text-slate-500">IMEI</TableHead>
                      <TableHead className="text-xs text-slate-500">販売日</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.slice(0, 20).map((rec, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs text-slate-400 pl-4">{i + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{maskImei(rec.imei)}</TableCell>
                        <TableCell className="text-xs text-slate-600">{rec.soldDate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {records.length > 20 && (
                <p className="text-xs text-slate-400 text-center py-2">… 他 {records.length - 20}件</p>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep('mapping')} className="text-xs">戻る</Button>
            <Button size="sm" onClick={handleImport} disabled={importing} className="text-xs flex-1">
              {importing ? 'インポート中...' : `${records.length}件をインポート実行`}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Result */}
      {step === 'result' && result && (
        <div className="flex flex-col gap-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-2">
            <Card className={`border ${result.matched.length > 0 ? 'border-green-200 bg-green-50' : 'border-slate-200'}`}>
              <CardContent className="px-4 py-4 text-center">
                <p className="text-xs text-slate-500">照合OK</p>
                <p className={`text-2xl font-semibold mt-1 ${result.matched.length > 0 ? 'text-green-600' : 'text-slate-300'}`}>
                  {result.matched.length}
                </p>
              </CardContent>
            </Card>
            <Card className={`border ${result.notFound.length > 0 ? 'border-red-200 bg-red-50' : 'border-slate-200'}`}>
              <CardContent className="px-4 py-4 text-center">
                <p className="text-xs text-slate-500">未一致</p>
                <p className={`text-2xl font-semibold mt-1 ${result.notFound.length > 0 ? 'text-red-600' : 'text-slate-300'}`}>
                  {result.notFound.length}
                </p>
              </CardContent>
            </Card>
            <Card className="border border-slate-200">
              <CardContent className="px-4 py-4 text-center">
                <p className="text-xs text-slate-500">スキップ</p>
                <p className={`text-2xl font-semibold mt-1 ${result.skipped.length > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
                  {result.skipped.length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Not found list */}
          {result.notFound.length > 0 && (
            <Card className="border-red-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-red-700">在庫表に見つからなかったIMEI ({result.notFound.length}件)</CardTitle>
                <p className="text-xs text-red-500">これらのIMEIはスプレッドシートに登録されていません</p>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="flex flex-wrap gap-2">
                  {result.notFound.map((imei) => (
                    <Badge key={imei} variant="outline" className="font-mono text-xs text-red-700 border-red-300">
                      {maskImei(imei)}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Skipped list */}
          {result.skipped.length > 0 && (
            <Card className="border-amber-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-700">スキップ ({result.skipped.length}件)</CardTitle>
                <p className="text-xs text-amber-600">販売日時が既に登録済みのため上書きしませんでした</p>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="flex flex-wrap gap-2">
                  {result.skipped.map((imei) => (
                    <Badge key={imei} variant="outline" className="font-mono text-xs text-amber-700 border-amber-300">
                      {maskImei(imei)}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Button onClick={handleReset} variant="outline" className="w-full text-xs">
            新しいファイルをインポート
          </Button>
        </div>
      )}

      {/* Format guide */}
      {step === 'upload' && (
        <Card className="border-slate-200 bg-slate-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-slate-500">CSVフォーマット例</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <pre className="text-xs font-mono text-slate-600 bg-white border border-slate-200 rounded p-3 overflow-x-auto">{`IMEI,販売日時,機種名,担当者
351234567890124,2026/4/24,iPhone 15,田中
352345678901235,2026/4/24,Pixel 8,鈴木`}</pre>
            <ul className="mt-3 text-xs text-slate-500 space-y-1">
              <li>• 1行目はヘッダー行として読み込みます</li>
              <li>• IMEI列・販売日列は次の画面で指定できます</li>
              <li>• 文字コード: UTF-8 推奨（Shift-JISも可）</li>
              <li>• 既に販売日時が登録済みの行はスキップされます</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
