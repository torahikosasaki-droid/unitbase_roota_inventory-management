import { NextResponse } from 'next/server'
import { z } from 'zod'
import { findRowByImei, updateDeviceRow } from '@/lib/google-sheets'
import { parseImeiFromBarcode } from '@/lib/imei'

const schema = z.object({
  imei: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { imei: raw } = schema.parse(body)
    const imei = parseImeiFromBarcode(raw) ?? raw

    const row = await findRowByImei(imei)
    if (!row) {
      return NextResponse.json({ error: 'スプレッドシートに該当IMEIが見つかりません' }, { status: 404 })
    }
    if (!row.checkoutFlag) {
      return NextResponse.json({ error: 'この端末は持ち出し登録されていません' }, { status: 400 })
    }

    await updateDeviceRow(row.rowIndex, { soldFlag: true })

    return NextResponse.json({ success: true, imei })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error('Sale error:', error)
    return NextResponse.json({ error: '販売登録に失敗しました' }, { status: 500 })
  }
}
