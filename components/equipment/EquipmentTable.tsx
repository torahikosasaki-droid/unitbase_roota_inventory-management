'use client'

import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface EquipmentRow {
  id: string
  name: string
  category: string
  purchaseMonth: string
  condition: 'good' | 'damaged' | 'disposed'
  notes: string | null
  needsReview: boolean
}

interface Props {
  items: EquipmentRow[]
  onEdit: (id: string, condition: EquipmentRow['condition'], notes: string | null) => void
  onDispose: (id: string) => void
}

function conditionBadge(condition: EquipmentRow['condition']) {
  if (condition === 'good') return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100 text-xs">良好</Badge>
  if (condition === 'damaged') return <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100 text-xs">破損</Badge>
  return <Badge variant="outline" className="text-slate-400 text-xs">廃棄</Badge>
}

function elapsedMonths(purchaseMonth: string): number {
  const [y, m] = purchaseMonth.split('-').map(Number)
  const now = new Date()
  return (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m)
}

export function EquipmentTable({ items, onEdit, onDispose }: Props) {
  return (
    <div className="rounded-md border border-slate-200 overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="text-xs text-slate-500">備品名</TableHead>
            <TableHead className="text-xs text-slate-500 hidden sm:table-cell">カテゴリー</TableHead>
            <TableHead className="text-xs text-slate-500">導入月</TableHead>
            <TableHead className="text-xs text-slate-500 hidden sm:table-cell">経過月数</TableHead>
            <TableHead className="text-xs text-slate-500">状態</TableHead>
            <TableHead className="text-xs text-slate-500 hidden md:table-cell">メモ</TableHead>
            <TableHead className="w-24" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const months = elapsedMonths(item.purchaseMonth)
            return (
              <TableRow
                key={item.id}
                className={item.needsReview ? 'bg-amber-50' : undefined}
              >
                <TableCell className="text-sm text-slate-800">
                  <span>{item.name}</span>
                  {item.needsReview && (
                    <span className="ml-1 text-xs text-amber-600 font-medium">要確認</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-slate-600 hidden sm:table-cell">{item.category}</TableCell>
                <TableCell className="text-xs text-slate-600">{item.purchaseMonth}</TableCell>
                <TableCell className="text-xs text-slate-600 hidden sm:table-cell">{months}ヶ月</TableCell>
                <TableCell>{conditionBadge(item.condition)}</TableCell>
                <TableCell className="text-xs text-slate-400 hidden md:table-cell max-w-32 truncate">{item.notes ?? '—'}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(item.id, item.condition, item.notes)}
                      className="text-xs text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      編集
                    </button>
                    {item.condition !== 'disposed' && (
                      <button
                        onClick={() => onDispose(item.id)}
                        className="text-xs text-slate-400 hover:text-red-600 transition-colors"
                      >
                        廃棄
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-sm text-slate-400 py-8">
                備品が登録されていません
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
