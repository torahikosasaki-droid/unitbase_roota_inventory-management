import { NextResponse } from 'next/server'
import { z } from 'zod'
import { fetchAllDevices, updateDeviceRow } from '@/lib/google-sheets'
import { runAlertScan } from '@/lib/google-sheets'
import { parseImeiFromBarcode } from '@/lib/imei'

const schema = z.object({
  records: z.array(z.object({
    imei: z.string().min(1),
    soldDate: z.string().min(1),
  })).min(1),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { records } = schema.parse(body)

    const devices = await fetchAllDevices()
    const imeiMap = new Map(devices.map((d) => [d.imei, d]))

    const matched: string[] = []
    const notFound: string[] = []
    const skipped: string[] = []   // 販売日時が既にセット済み

    for (const rec of records) {
      const imei = parseImeiFromBarcode(rec.imei) ?? rec.imei
      const device = imeiMap.get(imei)

      if (!device) {
        notFound.push(imei)
        continue
      }

      if (device.soldDate) {
        skipped.push(imei)
        continue
      }

      await updateDeviceRow(device.rowIndex, {
        soldFlag: true,
        soldDate: rec.soldDate,
      })
      matched.push(imei)
    }

    // アラートを再評価
    if (matched.length > 0) {
      await runAlertScan()
    }

    return NextResponse.json({ matched, notFound, skipped })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('Import error:', error)
    return NextResponse.json({ error: 'インポートに失敗しました' }, { status: 500 })
  }
}
