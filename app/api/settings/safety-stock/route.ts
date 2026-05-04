import { NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { getSafetyStockSettings, saveSafetyStockSettings } from '@/lib/data-store'

const createSchema = z.object({
  boothId: z.string().min(1),
  mainCategory: z.string().min(1),
  subCategory: z.string().optional(),
  threshold: z.number().int().min(0),
})

const updateSchema = z.object({
  threshold: z.number().int().min(0).optional(),
  mainCategory: z.string().min(1).optional(),
  subCategory: z.string().optional(),
})

export function GET() {
  const settings = getSafetyStockSettings()
  return NextResponse.json({ settings })
}

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '入力が不正です' }, { status: 400 })
  }
  const settings = getSafetyStockSettings()
  const newSetting = { id: randomUUID(), ...parsed.data }
  saveSafetyStockSettings([...settings, newSetting])
  return NextResponse.json({ setting: newSetting }, { status: 201 })
}

export async function PATCH(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'idが必要です' }, { status: 400 })

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '入力が不正です' }, { status: 400 })
  }

  const settings = getSafetyStockSettings()
  const idx = settings.findIndex((s) => s.id === id)
  if (idx < 0) return NextResponse.json({ error: '設定が見つかりません' }, { status: 404 })

  settings[idx] = { ...settings[idx], ...parsed.data }
  saveSafetyStockSettings(settings)
  return NextResponse.json({ setting: settings[idx] })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'idが必要です' }, { status: 400 })

  const settings = getSafetyStockSettings()
  const next = settings.filter((s) => s.id !== id)
  if (next.length === settings.length) {
    return NextResponse.json({ error: '設定が見つかりません' }, { status: 404 })
  }
  saveSafetyStockSettings(next)
  return NextResponse.json({ success: true })
}
