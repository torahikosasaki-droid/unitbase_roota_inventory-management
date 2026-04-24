import { NextResponse } from 'next/server'
import { z } from 'zod'
import { fetchAllDevices, updateDeviceRow } from '@/lib/google-sheets'
import { parseImeiFromBarcode } from '@/lib/imei'
import { alertToText } from '@/lib/reconcile'

const schema = z.object({
  // IMEIs that were checked out (from the session)
  checkedOutImeis: z.array(z.string()).min(1),
  // IMEIs that were sold (from the session)
  soldImeis: z.array(z.string()),
  // IMEIs physically scanned on return
  scannedImeis: z.array(z.string()),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { checkedOutImeis, soldImeis, scannedImeis: rawScanned } = schema.parse(body)

    const scannedImeis = rawScanned.map((r) => parseImeiFromBarcode(r) ?? r)
    const expected = checkedOutImeis.filter((imei) => !soldImeis.includes(imei))
    const missing = expected.filter((imei) => !scannedImeis.includes(imei))
    const extra = scannedImeis.filter((imei) => !expected.includes(imei))
    const isComplete = missing.length === 0 && extra.length === 0

    const allDevices = await fetchAllDevices()

    // Mark returned devices
    for (const imei of scannedImeis) {
      const row = allDevices.find((r) => r.imei === imei)
      if (row) {
        await updateDeviceRow(row.rowIndex, { returnedFlag: true })
      }
    }

    // Mark missing devices with alert
    for (const imei of missing) {
      const row = allDevices.find((r) => r.imei === imei)
      if (row) {
        await updateDeviceRow(row.rowIndex, {
          alert: alertToText('missing_risk'),
        })
      }
    }

    return NextResponse.json({
      isComplete,
      expected,
      scanned: scannedImeis,
      missing,
      extra,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('Reconcile error:', error)
    return NextResponse.json({ error: '照合処理に失敗しました' }, { status: 500 })
  }
}
