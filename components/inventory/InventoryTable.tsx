'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertBadge } from './StockAlert'
import { maskImei } from '@/lib/imei'
import { toast } from 'sonner'
import type { SheetRow, InventoryStatus } from '@/types/inventory'

interface InventoryTableProps {
  devices: SheetRow[]
  onStatusChanged?: () => void
}

const STATUS_OPTIONS: { value: InventoryStatus; label: string }[] = [
  { value: 'in_stock', label: '本社在庫' },
  { value: 'checked_out', label: '持ち出し中' },
  { value: 'sold', label: '販売済み' },
  { value: 'returned', label: '返却済み' },
]

function getStatus(row: SheetRow): InventoryStatus {
  if (row.soldFlag) return 'sold'
  if (row.returnedFlag) return 'returned'
  if (row.checkoutFlag) return 'checked_out'
  return 'in_stock'
}

function StatusBadge({ row }: { row: SheetRow }) {
  if (row.returnedFlag) return <Badge variant="outline" className="text-slate-500">返却済</Badge>
  if (row.soldFlag) return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">販売済</Badge>
  if (row.checkoutFlag) return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">持ち出し中</Badge>
  return <Badge variant="outline" className="text-slate-500">在庫</Badge>
}

interface StatusEditDialogProps {
  device: SheetRow
  onClose: () => void
  onSaved: () => void
}

function StatusEditDialog({ device, onClose, onSaved }: StatusEditDialogProps) {
  const [selected, setSelected] = useState<InventoryStatus>(getStatus(device))
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (selected === getStatus(device)) { onClose(); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/inventory/${device.imei}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: selected }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('ステータスを変更しました')
      onSaved()
      onClose()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '変更に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl p-5 w-72 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <p className="text-sm font-semibold text-slate-800">ステータス変更</p>
          <p className="text-xs text-slate-400 font-mono mt-0.5">{maskImei(device.imei)}</p>
        </div>

        <div className="flex flex-col gap-1.5">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              className={`text-left px-3 py-2 rounded text-sm border transition-colors ${
                selected === opt.value
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs flex-1">
            キャンセル
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="text-xs flex-1">
            {saving ? '変更中...' : '変更する'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function InventoryTable({ devices, onStatusChanged }: InventoryTableProps) {
  const [editTarget, setEditTarget] = useState<SheetRow | null>(null)

  return (
    <>
      {editTarget && (
        <StatusEditDialog
          device={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => onStatusChanged?.()}
        />
      )}

      <div className="relative rounded-md border border-slate-200 overflow-auto">
        {/* Right-edge fade hint for horizontal scroll on mobile */}
        <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-white/90 to-transparent sm:hidden z-10" />
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="w-10 text-xs text-slate-500">No.</TableHead>
              <TableHead className="text-xs text-slate-500">IMEI</TableHead>
              <TableHead className="text-xs text-slate-500">ステータス</TableHead>
              <TableHead className="text-xs text-slate-500 hidden sm:table-cell">大カテゴリー</TableHead>
              <TableHead className="text-xs text-slate-500 hidden sm:table-cell">小カテゴリー</TableHead>
              <TableHead className="text-xs text-slate-500 hidden md:table-cell">納入日</TableHead>
              <TableHead className="text-xs text-slate-500 hidden md:table-cell">持ち出し日</TableHead>
              <TableHead className="text-xs text-slate-500 hidden lg:table-cell">ブース</TableHead>
              <TableHead className="text-xs text-slate-500 hidden lg:table-cell">販売日</TableHead>
              <TableHead className="text-xs text-slate-500">アラート</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {devices.map((device) => (
              <TableRow
                key={device.imei}
                className={device.alert ? 'bg-red-50 border-l-2 border-l-red-300' : undefined}
              >
                <TableCell className="text-xs text-slate-400">{device.rowIndex - 2}</TableCell>
                <TableCell className="font-mono text-xs">{maskImei(device.imei)}</TableCell>
                <TableCell><StatusBadge row={device} /></TableCell>
                <TableCell className="text-xs text-slate-600 hidden sm:table-cell">{device.mainCategory ?? '—'}</TableCell>
                <TableCell className="text-xs text-slate-600 hidden sm:table-cell">{device.subCategory ?? '—'}</TableCell>
                <TableCell className="text-xs text-slate-600 hidden md:table-cell">{device.deliveryDate ?? '—'}</TableCell>
                <TableCell className="text-xs text-slate-600 hidden md:table-cell">{device.checkoutDate ?? '—'}</TableCell>
                <TableCell className="text-xs text-slate-600 hidden lg:table-cell">{device.salesBooth ?? '—'}</TableCell>
                <TableCell className="text-xs text-slate-600 hidden lg:table-cell">{device.soldDate ?? '—'}</TableCell>
                <TableCell><AlertBadge text={device.alert} /></TableCell>
                <TableCell>
                  <button
                    onClick={() => setEditTarget(device)}
                    className="text-slate-500 hover:text-slate-800 transition-colors text-xs"
                    title="ステータス変更"
                  >
                    ✏
                  </button>
                </TableCell>
              </TableRow>
            ))}
            {devices.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-sm text-slate-400 py-8">
                  データがありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
