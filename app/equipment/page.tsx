'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EquipmentTable } from '@/components/equipment/EquipmentTable'
import { toast } from 'sonner'

interface EquipmentItem {
  id: string
  name: string
  category: string
  purchaseMonth: string
  condition: 'good' | 'damaged' | 'disposed'
  notes: string | null
  needsReview: boolean
}

interface EditState {
  id: string
  condition: 'good' | 'damaged' | 'disposed'
  notes: string
}

export default function EquipmentPage() {
  const [items, setItems] = useState<EquipmentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [conditionFilter, setConditionFilter] = useState<'all' | 'good' | 'damaged' | 'disposed'>('all')

  const [form, setForm] = useState<{
    name: string
    category: string
    purchaseMonth: string
    condition: 'good' | 'damaged' | 'disposed'
    notes: string
  }>({
    name: '',
    category: '',
    purchaseMonth: '',
    condition: 'good',
    notes: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const q = conditionFilter !== 'all' ? `?condition=${conditionFilter}` : ''
      const res = await fetch(`/api/equipment${q}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setItems(data.equipment)
    } catch {
      toast.error('備品一覧の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [conditionFilter])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    if (!form.name || !form.category || !form.purchaseMonth) {
      toast.error('備品名・カテゴリー・導入月を入力してください')
      return
    }
    try {
      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          category: form.category,
          purchaseMonth: form.purchaseMonth,
          condition: form.condition,
          notes: form.notes || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('備品を追加しました')
      setForm({ name: '', category: '', purchaseMonth: '', condition: 'good', notes: '' })
      setShowAddForm(false)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '追加に失敗しました')
    }
  }

  const handleEdit = (id: string, condition: EquipmentItem['condition'], notes: string | null) => {
    setEditState({ id, condition, notes: notes ?? '' })
  }

  const handleSaveEdit = async () => {
    if (!editState) return
    try {
      const res = await fetch(`/api/equipment?id=${editState.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          condition: editState.condition,
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
    const itemName = items.find((i) => i.id === id)?.name ?? '備品'
    if (!window.confirm(`「${itemName}」を廃棄済みにしますか？`)) return
    try {
      const res = await fetch(`/api/equipment?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast.success('廃棄済みに変更しました')
      await load()
    } catch {
      toast.error('廃棄処理に失敗しました')
    }
  }

  const needsReviewCount = items.filter((i) => i.needsReview).length

  return (
    <div className="flex flex-col gap-5">
      {/* Edit dialog */}
      {editState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditState(null)}>
          <div className="bg-white rounded-xl shadow-xl p-5 w-72 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
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
              <Label className="text-xs text-slate-600">メモ</Label>
              <Input
                value={editState.notes}
                onChange={(e) => setEditState((s) => s ? { ...s, notes: e.target.value } : null)}
                placeholder="メモを入力"
                className="mt-1 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditState(null)} className="text-xs flex-1">キャンセル</Button>
              <Button size="sm" onClick={handleSaveEdit} className="text-xs flex-1">保存</Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">備品管理</h1>
          {needsReviewCount > 0 && (
            <p className="text-xs text-amber-600 mt-0.5">要確認: {needsReviewCount}件（導入から6ヶ月以上）</p>
          )}
        </div>
        <Button size="sm" className="text-xs" onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'キャンセル' : '+ 備品を追加'}
        </Button>
      </div>

      {showAddForm && (
        <Card className="border-slate-200 bg-slate-50">
          <CardContent className="px-4 pt-4 pb-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-600">備品名</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="折りたたみ机" className="mt-1 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-slate-600">カテゴリー</Label>
                <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="家具" className="mt-1 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-600">導入月</Label>
                <Input type="month" value={form.purchaseMonth} onChange={(e) => setForm((f) => ({ ...f, purchaseMonth: e.target.value }))} className="mt-1 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-slate-600">状態</Label>
                <div className="flex gap-1 mt-1">
                  {(['good', 'damaged'] as const).map((c) => (
                    <button
                      key={c}
                      onClick={() => setForm((f) => ({ ...f, condition: c }))}
                      className={`px-2 py-1 rounded text-xs border transition-colors ${form.condition === c ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}
                    >
                      {c === 'good' ? '良好' : '破損'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <Label className="text-xs text-slate-600">メモ（任意）</Label>
              <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="備考" className="mt-1 text-sm" />
            </div>
            <Button size="sm" onClick={handleAdd} className="w-full text-xs">追加する</Button>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
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
