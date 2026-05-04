import { NextResponse } from 'next/server'
import { z } from 'zod'
import { findRowByImei, updateDeviceStatus, runAlertScan } from '@/lib/google-sheets'
import type { InventoryStatus } from '@/types/inventory'

const schema = z.object({
  status: z.enum(['in_stock', 'checked_out', 'sold', 'returned']),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ imei: string }> }
) {
  try {
    const { imei } = await params
    const body = await request.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: '不正なステータスです' }, { status: 400 })
    }

    const row = await findRowByImei(imei)
    if (!row) {
      return NextResponse.json({ error: 'IMEIが見つかりません' }, { status: 404 })
    }

    const newStatus = parsed.data.status as InventoryStatus
    await updateDeviceStatus(row.rowIndex, newStatus)
    await runAlertScan()

    return NextResponse.json({ success: true, imei, newStatus })
  } catch (error) {
    console.error('Status update error:', error)
    return NextResponse.json({ error: 'ステータス更新に失敗しました' }, { status: 500 })
  }
}
