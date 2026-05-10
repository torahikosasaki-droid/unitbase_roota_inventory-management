'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CategorySelector } from '@/components/equipment/CategorySelector'
import { EquipmentTable } from '@/components/equipment/EquipmentTable'
import { toast } from 'sonner'
import type { EquipmentCategory } from '@/types/inventory'

interface EquipmentItem {
  id: string
  managementNumber: string
  category: EquipmentCategory
  purchaseMonth: string
  condition: 'good' | 'damaged' | 'disposed'
  currentTeam: string | null
  notes: string | null
  needsReview: boolean
}

interface EditState {
  id: string
  condition: 'good' | 'damaged' | 'disposed'
  currentTeam: string
  notes: string
}

interface ImportError {
  row: number
  managementNumber: string
  reason: string
}

export default function EquipmentPage() {
  const [items, setItems] = useState<EquipmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<EquipmentCategory | 'all'>('all')
  const [conditionFilter, setConditionFilter] = useState<'all' | 'good' | 'damaged' | 'disposed'>('all')
  const [showImport, setShowImport] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [importErrors, setImportErrors] = useState<ImportError[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (categoryFilter !== 'all') params.set('category', categoryFilter)
      if (conditionFilter !== 'all') params.set('condition', conditionFilter)
      else params.set('condition', 'all')
      const res = await fetch(`/api/equipment?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setItems(data.equipment)
    } catch {
      toast.error('備品一覧の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [categoryFilter, conditionFilter])

  useEffect(() => { load() }, [load])

  const handleEdit = (
    id: string,
    condition: EquipmentItem['condition'],
    currentTeam: string | null,
    notes: string | null,
  ) => {
    setEditState({ id, condition, currentTeam: currentTeam ?? '', notes: notes ?? '' })
  }

  const handleSaveEdit = async () => {
    if (!editState) return
    try {
      const res = await fetch(`/api/equipment?id=${editState.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          condition: editState.condition,
          currentTeam: editState.currentTeam || null,
          notes: editState.notes || null,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('更新しました')
      setEditState(null)
      await load()
    } catch {
      toast.error('更新に失敗しました')
    }
  }

  const handleDispose = async (id: string) => {
    const item = items.find((i) => i.id === id)
    if (!window.confirm(`「${item?.managementNumber ?? '備品'}」を廃棄済みにしますか？`)) return
    try {
      const res = await fetch(`/api/equipment?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('廃棄済みに変更しました')
      await load()
    } catch {
      toast.error('廃棄処理に失敗しました')
    }
  }

  const handleImport = async () => {
    if (!csvFile) {
      toast.error('CSVファイルを選択してください')
      return
    }
    setImporting(true)
    setImportErrors([])
    try {
      const formData = new FormData()
      formData.append('file', csvFile)
      const res = await fetch('/api/equipment/import', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'インポートに失敗しました')
        return
      }
      toast.success(`${data.added}件追加、${data.skipped}件スキップしました`)
      if (data.errors?.length > 0) setImportErrors(data.errors)
      setCsvFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setShowImport(false)
      await load()
    } catch {
      toast.error('インポートに失敗しました')
    } finally {
      setImporting(false)
    }
  }

  const needsReviewCount = items.filter((i) => i.needsReview).length

  return (
    <div className="flex flex-col gap-5">
      {/* Edit dialog */}
      {editState && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setEditState(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-5 w-80 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-slate-800">備品を編集</p>
            <div>
              <Label className="text-xs text-slate-600">状態</Label>
              <div className="flex gap-2 mt-1">
                {(['good', 'damaged', 'disposed'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setEditState((s) => s ? { ...s, condition: c } : null)}
                    className={`px-2 py-1 rounded text-xs border transition-colors ${
                      editState.condition === c
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {c === 'good' ? '良好' : c === 'damaged' ? '破損' : '廃棄'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-600">使用チーム</Label>
              <Input
                value={editState.currentTeam}
                onChange={(e) => setEditState((s) => s ? { ...s, currentTeam: e.target.value } : null)}
                placeholder="チーム名（未割当の場合は空欄）"
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-600">メモ</Label>
              <Input
                value={editState.notes}
                onChange={(e) => setEditState((s) => s ? { ...s, notes: e.target.value } : null)}
                placeholder="メモを入力"
                className="mt-1 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditState(null)} className="text-xs flex-1">
                キャンセル
              </Button>
              <Button size="sm" onClick={handleSaveEdit} className="text-xs flex-1">
                保存
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">備品管理</h1>
          {needsReviewCount > 0 && (
            <p className="text-xs text-amber-600 mt-0.5">要確認: {needsReviewCount}件（導入から6ヶ月以上）</p>
          )}
        </div>
        <Button size="sm" className="text-xs" onClick={() => { setShowImport(!showImport); setImportErrors([]) }}>
          {showImport ? 'キャンセル' : 'CSVインポート'}
        </Button>
      </div>

      {/* CSV import panel */}
      {showImport && (
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="px-4 pt-4 pb-4 flex flex-col gap-3">
            <p className="text-xs text-slate-600 font-medium">CSVフォーマット（1行目はヘッダー）</p>
            <pre className="text-xs text-slate-500 bg-white border border-slate-200 rounded p-2 overflow-x-auto">
{`管理番号,カテゴリー,導入月,状態,使用チーム,メモ
机-003,折りたたみ机,2026-03,good,チームA,ブースC用
椅子-003,パイプ椅子,2026-03,good,,`}
            </pre>
            <p className="text-xs text-slate-400">
              状態: good / damaged / disposed（省略時は good）。使用チーム・メモは任意。
            </p>
            <div>
              <Label className="text-xs text-slate-600">CSVファイルを選択</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-xs text-slate-600 file:mr-3 file:py-1 file:px-3 file:rounded file:border file:border-slate-200 file:text-xs file:bg-white file:text-slate-700 hover:file:border-slate-400"
              />
            </div>
            <Button size="sm" onClick={handleImport} disabled={importing || !csvFile} className="w-full text-xs">
              {importing ? 'インポート中...' : 'インポート実行'}
            </Button>
            {importErrors.length > 0 && (
              <div className="rounded border border-amber-200 bg-amber-50 p-3 flex flex-col gap-1">
                <p className="text-xs font-medium text-amber-700">スキップされた行:</p>
                {importErrors.map((e) => (
                  <p key={e.row} className="text-xs text-amber-600">
                    行{e.row} [{e.managementNumber}] — {e.reason}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Category selector */}
      <CategorySelector selected={categoryFilter} onChange={setCategoryFilter} />

      {/* Condition filter */}
      <div className="flex gap-1">
        {([['all', 'すべて'], ['good', '良好'], ['damaged', '破損'], ['disposed', '廃棄済み']] as const).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setConditionFilter(val)}
            className={`px-3 py-1 rounded text-xs border transition-colors ${
              conditionFilter === val
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm text-slate-400">読み込み中...</div>
      ) : (
        <EquipmentTable items={items} onEdit={handleEdit} onDispose={handleDispose} />
      )}
    </div>
  )
}
