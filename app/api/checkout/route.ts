import { NextResponse } from 'next/server'
import { z } from 'zod'
import { findRowByImei, updateDeviceRow } from '@/lib/google-sheets'
import { parseImeiFromBarcode } from '@/lib/imei'

const schema = z.object({
  imeis: z.array(z.string()).min(1),
  staffName: z.string().min(1),
  salesBooth: z.string().min(1),
  checkoutDate: z.string(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { imeis, staffName, salesBooth, checkoutDate } = schema.parse(body)

    const results: { imei: string; success: boolean; error?: string }[] = []

    for (const raw of imeis) {
      const imei = parseImeiFromBarcode(raw) ?? raw
      const row = await findRowByImei(imei)

      if (!row) {
        results.push({ imei, success: false, error: 'スプレッドシートに該当IMEIが見つかりません' })
        continue
      }

      await updateDeviceRow(row.rowIndex, {
        checkoutFlag: true,
        checkoutDate,
        salesBooth,
      })

      results.push({ imei, success: true })
    }

    const failed = results.filter((r) => !r.success)
    return NextResponse.json({
      results,
      summary: { total: imeis.length, success: results.length - failed.length, failed: failed.length },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('Checkout error:', error)
    return NextResponse.json({ error: '持ち出し登録に失敗しました' }, { status: 500 })
  }
}
