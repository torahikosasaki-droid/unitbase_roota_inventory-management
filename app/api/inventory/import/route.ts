import { NextResponse } from 'next/server'
import { z } from 'zod'
import { addDeviceRows } from '@/lib/google-sheets'

const deviceSchema = z.object({
  imei: z.string().min(1),
  mainCategory: z.string().min(1),
  subCategory: z.string().min(1),
  deliveryDate: z.string().min(1),
})

const schema = z.object({
  devices: z.array(deviceSchema).min(1),
})

function normalizeDeliveryDate(raw: string): string {
  const slash = raw.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
  if (slash) return `${slash[1]}-${slash[2].padStart(2, '0')}-${slash[3].padStart(2, '0')}`
  return raw
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('Inventory import received:', JSON.stringify(body).slice(0, 500))
    const { devices } = schema.parse(body)

    // 正規化してバリデーション
    const errors: string[] = []
    const cleaned = devices.map((d, i) => {
      const imei = d.imei.trim().replace(/\s/g, '')
      const deliveryDate = normalizeDeliveryDate(d.deliveryDate.trim())

      if (!/^\d{14,16}$/.test(imei)) errors.push(`行${i + 1}: IMEI「${d.imei}」は数字のみ14〜16桁で入力してください`)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate)) errors.push(`行${i + 1}: 納入日「${d.deliveryDate}」はYYYY-MM-DD形式で入力してください`)

      return { ...d, imei, deliveryDate }
    })

    if (errors.length > 0) {
      console.error('Inventory import validation errors:', errors)
      return NextResponse.json({ error: errors[0], details: errors }, { status: 400 })
    }

    const result = await addDeviceRows(cleaned)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Zod error:', error.issues)
      return NextResponse.json({ error: '入力データが不正です', details: error.issues }, { status: 400 })
    }
    console.error('Inventory import error:', error)
    return NextResponse.json({ error: 'インポートに失敗しました' }, { status: 500 })
  }
}
