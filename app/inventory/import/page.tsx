'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { maskImei } from '@/lib/imei'
import { toast } from 'sonner'

function parseCsv(text: string): string[][] {
  const cleaned = text.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  return cleaned
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => {
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

interface ParsedDevice {
  imei: string
  mainCategory: string
  subCategory: string
  deliveryDate: string
}

interface ImportResult {
  added: number
  duplicate: number
  duplicateImeis: string[]
}

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

export default function InventoryImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [rows, setRows] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [imeiCol, setImeiCol] = useState(0)
  const [deliveryDateCol, setDeliveryDateCol] = useState(-1)
  const [mainCategoryCol, setMainCategoryCol] = useState(-1)
  const [subCategoryCol, setSubCategoryCol] = useState(-1)
  const [globalMainCategory, setGlobalMainCategory] = useState('')
  const [globalSubCategory, setGlobalSubCategory] = useState('')
  const [globalDeliveryDate, setGlobalDeliveryDate] = useState('')
  const [devices, setDevices] = useState<ParsedDevice[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)
  const [importing, setImporting] = useState(false)
  const [fileName, setFileName] = useState('')

  const stepIndex: Record<Step, number> = { upload: 0, mapping: 1, preview: 2, result: 3 }

  const handleFile = (file: File) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCsv(text)
      if (parsed.length < 2) { toast.error('データが2行以上必要です'); return }
      setHeaders(parsed[0])
      setRows(parsed.slice(1))
      const hLower = parsed[0].map((h) => h.toLowerCase())
      const imeiIdx = hLower.findIndex((h) => h.includes('imei') || h.includes('製造番号') || h.includes('端末'))
      const deliveryIdx = hLower.findIndex((h) => h.includes('納入') || h.includes('入荷') || h.includes('仕入'))
      const mainCatIdx = hLower.findIndex((h) => h.includes('大カテゴリー') || h.includes('大分類') || h.includes('カテゴリ'))
      const subCatIdx = hLower.findIndex((h) => h.includes('小カテゴリー') || h.includes('小分類') || h.includes('機種'))
      if (imeiIdx >= 0) setImeiCol(imeiIdx)
      if (deliveryIdx >= 0) setDeliveryDateCol(deliveryIdx)
      if (mainCatIdx >= 0) setMainCategoryCol(mainCatIdx)
      if (subCatIdx >= 0) setSubCategoryCol(subCatIdx)
      setStep('mapping')
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleMappingConfirm = () => {
    const parsed: ParsedDevice[] = rows
      .map((row) => ({
        imei: row[imeiCol]?.trim() ?? '',
        mainCategory: mainCategoryCol >= 0 ? (row[mainCategoryCol]?.trim() ?? '') : globalMainCategory,
        subCategory: subCategoryCol >= 0 ? (row[subCategoryCol]?.trim() ?? '') : globalSubCategory,
        deliveryDate: deliveryDateCol >= 0 ? normalizeDate(row[deliveryDateCol]?.trim() ?? '') : globalDeliveryDate,
      }))
      .filter((r) => r.imei.length > 0)

    if (parsed.length === 0) { toast.error('有効なレコードが見つかりません'); return }

    const missing = parsed.filter((d) => !d.mainCategory || !d.subCategory || !d.deliveryDate)
    if (missing.length > 0) {
      toast.error('大カテゴリー・小カテゴリー・納入日が未入力の行があります。一括入力欄を確認してください')
      return
    }

    setDevices(parsed)
    setStep('preview')
  }

  const handleImport = async () => {
    setImporting(true)
    try {
      const res = await fetch('/api/inventory/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devices }),
      })
      const data = await res.json()
      if (!res.ok) {
        console.error('Import API error:', data)
        throw new Error(data.error ?? 'インポートに失敗しました')
      }
      setResult(data)
      setStep('result')
      toast.success(`インポート完了: ${data.added}件追加`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'インポートに失敗しました')
    } finally {
      setImporting(false)
    }
  }

  const handleReset = () => {
    setStep('upload'); setRows([]); setHeaders([]); setDevices([])
    setResult(null); setFileName(''); setImeiCol(0); setDeliveryDateCol(-1)
    setMainCategoryCol(-1); setSubCategoryCol(-1)
    setGlobalMainCategory(''); setGlobalSubCategory(''); setGlobalDeliveryDate('')
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">在庫CSVインポート</h1>
        <p className="text-xs text-slate-500 mt-1">SoftBank等から提供されるリストを取り込み、端末を一括登録します</p>
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
              {/* IMEI column selector */}
              <div>
                <p className="text-xs font-medium text-slate-600 mb-2">IMEI列（必須）</p>
                <div className="flex flex-wrap gap-1">
                  {headers.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => setImeiCol(i)}
                      className={`px-2 py-1 rounded text-xs border transition-colors ${imeiCol === i ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                    >
                      {h || `列${i + 1}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Delivery date column or manual */}
              <div>
                <p className="text-xs font-medium text-slate-600 mb-2">納入日列（CSV列を選択 または 一括入力）</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  <button
                    onClick={() => setDeliveryDateCol(-1)}
                    className={`px-2 py-1 rounded text-xs border transition-colors ${deliveryDateCol === -1 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                  >
                    一括入力
                  </button>
                  {headers.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => setDeliveryDateCol(i)}
                      className={`px-2 py-1 rounded text-xs border transition-colors ${deliveryDateCol === i ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                    >
                      {h || `列${i + 1}`}
                    </button>
                  ))}
                </div>
                {deliveryDateCol === -1 && (
                  <Input type="date" value={globalDeliveryDate} onChange={(e) => setGlobalDeliveryDate(e.target.value)} className="text-xs h-8 w-40" />
                )}
              </div>

              {/* Main category column or manual */}
              <div>
                <p className="text-xs font-medium text-slate-600 mb-2">大カテゴリー列（CSV列を選択 または 一括入力）</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  <button
                    onClick={() => setMainCategoryCol(-1)}
                    className={`px-2 py-1 rounded text-xs border transition-colors ${mainCategoryCol === -1 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                  >
                    一括入力
                  </button>
                  {headers.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => setMainCategoryCol(i)}
                      className={`px-2 py-1 rounded text-xs border transition-colors ${mainCategoryCol === i ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                    >
                      {h || `列${i + 1}`}
                    </button>
                  ))}
                </div>
                {mainCategoryCol === -1 && (
                  <Input value={globalMainCategory} onChange={(e) => setGlobalMainCategory(e.target.value)} placeholder="例: モバイル" className="text-xs h-8 w-40" />
                )}
              </div>

              {/* Sub category column or manual */}
              <div>
                <p className="text-xs font-medium text-slate-600 mb-2">小カテゴリー列（CSV列を選択 または 一括入力）</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  <button
                    onClick={() => setSubCategoryCol(-1)}
                    className={`px-2 py-1 rounded text-xs border transition-colors ${subCategoryCol === -1 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                  >
                    一括入力
                  </button>
                  {headers.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => setSubCategoryCol(i)}
                      className={`px-2 py-1 rounded text-xs border transition-colors ${subCategoryCol === i ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                    >
                      {h || `列${i + 1}`}
                    </button>
                  ))}
                </div>
                {subCategoryCol === -1 && (
                  <Input value={globalSubCategory} onChange={(e) => setGlobalSubCategory(e.target.value)} placeholder="例: iPhone" className="text-xs h-8 w-40" />
                )}
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
                <Badge variant="outline" className="text-xs">{devices.length}件</Badge>
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
                      <TableHead className="text-xs text-slate-500">大カテゴリー</TableHead>
                      <TableHead className="text-xs text-slate-500">小カテゴリー</TableHead>
                      <TableHead className="text-xs text-slate-500">納入日</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {devices.slice(0, 20).map((d, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs text-slate-400 pl-4">{i + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{d.imei}</TableCell>
                        <TableCell className="text-xs text-slate-600">{d.mainCategory}</TableCell>
                        <TableCell className="text-xs text-slate-600">{d.subCategory}</TableCell>
                        <TableCell className="text-xs text-slate-600">{d.deliveryDate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {devices.length > 20 && (
                <p className="text-xs text-slate-400 text-center py-2">… 他 {devices.length - 20}件</p>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep('mapping')} className="text-xs">戻る</Button>
            <Button size="sm" onClick={handleImport} disabled={importing} className="text-xs flex-1">
              {importing ? 'インポート中...' : `${devices.length}件をインポート実行`}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Result */}
      {step === 'result' && result && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2">
            <Card className={`border ${result.added > 0 ? 'border-green-200 bg-green-50' : 'border-slate-200'}`}>
              <CardContent className="px-4 py-4 text-center">
                <p className="text-xs text-slate-500">追加</p>
                <p className={`text-2xl font-semibold mt-1 ${result.added > 0 ? 'text-green-600' : 'text-slate-300'}`}>
                  {result.added}
                </p>
              </CardContent>
            </Card>
            <Card className={`border ${result.duplicate > 0 ? 'border-amber-200 bg-amber-50' : 'border-slate-200'}`}>
              <CardContent className="px-4 py-4 text-center">
                <p className="text-xs text-slate-500">重複スキップ</p>
                <p className={`text-2xl font-semibold mt-1 ${result.duplicate > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
                  {result.duplicate}
                </p>
              </CardContent>
            </Card>
          </div>

          {result.duplicateImeis.length > 0 && (
            <Card className="border-amber-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-700">重複IMEI ({result.duplicateImeis.length}件)</CardTitle>
                <p className="text-xs text-amber-600">既に登録済みのためスキップしました</p>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="flex flex-wrap gap-2">
                  {result.duplicateImeis.map((imei) => (
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

      {step === 'upload' && (
        <Card className="border-slate-200 bg-slate-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-slate-500">CSVフォーマット例</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <pre className="text-xs font-mono text-slate-600 bg-white border border-slate-200 rounded p-3 overflow-x-auto">{`IMEI,納入日,大カテゴリー,小カテゴリー
351234567890124,2026-05-01,モバイル,iPhone
352345678901235,2026-05-01,BB,ルーター`}</pre>
            <ul className="mt-3 text-xs text-slate-500 space-y-1">
              <li>• 1行目はヘッダー行として読み込みます</li>
              <li>• カテゴリー・納入日はCSV列がなければ一括入力で指定できます</li>
              <li>• 既に登録済みのIMEIは重複としてスキップされます</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function normalizeDate(raw: string): string {
  if (!raw) return ''
  // YYYY/MM/DD → YYYY-MM-DD
  const slash = raw.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
  if (slash) return `${slash[1]}-${slash[2].padStart(2, '0')}-${slash[3].padStart(2, '0')}`
  // YYYY-MM-DD はそのまま
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  return raw
}
