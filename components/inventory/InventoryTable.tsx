'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AlertBadge } from './StockAlert'
import { maskImei } from '@/lib/imei'
import type { SheetRow } from '@/types/inventory'

interface InventoryTableProps {
  devices: SheetRow[]
}

function StatusBadge({ row }: { row: SheetRow }) {
  if (row.returnedFlag) return <Badge variant="outline" className="text-slate-500">返却済</Badge>
  if (row.soldFlag) return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">販売済</Badge>
  if (row.checkoutFlag) return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">持ち出し中</Badge>
  return <Badge variant="outline" className="text-slate-500">在庫</Badge>
}

export function InventoryTable({ devices }: InventoryTableProps) {
  return (
    <div className="rounded-md border border-slate-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="w-12 text-xs text-slate-500">No.</TableHead>
            <TableHead className="text-xs text-slate-500">IMEI</TableHead>
            <TableHead className="text-xs text-slate-500">ステータス</TableHead>
            <TableHead className="text-xs text-slate-500">持ち出し日</TableHead>
            <TableHead className="text-xs text-slate-500">ブース</TableHead>
            <TableHead className="text-xs text-slate-500">販売日</TableHead>
            <TableHead className="text-xs text-slate-500">アラート</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {devices.map((device) => (
            <TableRow
              key={device.imei}
              className={device.alert ? 'bg-red-50' : undefined}
            >
              <TableCell className="text-xs text-slate-400">{device.rowIndex - 2}</TableCell>
              <TableCell className="font-mono text-xs">{maskImei(device.imei)}</TableCell>
              <TableCell><StatusBadge row={device} /></TableCell>
              <TableCell className="text-xs text-slate-600">{device.checkoutDate ?? '—'}</TableCell>
              <TableCell className="text-xs text-slate-600">{device.salesBooth ?? '—'}</TableCell>
              <TableCell className="text-xs text-slate-600">{device.soldDate ?? '—'}</TableCell>
              <TableCell><AlertBadge text={device.alert} /></TableCell>
            </TableRow>
          ))}
          {devices.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-sm text-slate-400 py-8">
                データがありません
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
