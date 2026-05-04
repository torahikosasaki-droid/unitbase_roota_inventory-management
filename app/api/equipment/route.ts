import { NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { getEquipmentList, saveEquipmentList } from '@/lib/data-store'

const createSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  purchaseMonth: z.string().regex(/^\d{4}-\d{2}$/, '導入月はYYYY-MM形式です'),
  condition: z.enum(['good', 'damaged', 'disposed']).default('good'),
  notes: z.string().nullable().optional(),
})

const updateSchema = z.object({
  condition: z.enum(['good', 'damaged', 'disposed']).optional(),
  notes: z.string().nullable().optional(),
  name: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  purchaseMonth: z.string().regex(/^\d{4}-\d{2}$/).optional(),
})

function calcNeedsReview(purchaseMonth: string): boolean {
  const [y, m] = purchaseMonth.split('-').map(Number)
  const purchased = new Date(y, m - 1, 1)
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  return purchased <= sixMonthsAgo
}

export function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const conditionFilter = searchParams.get('condition')

  const list = getEquipmentList()
  const filtered = conditionFilter
    ? list.filter((e) => e.condition === conditionFilter)
    : list.filter((e) => e.condition !== 'disposed')

  const withReview = filtered.map((e) => ({
    ...e,
    needsReview: e.condition !== 'disposed' && calcNeedsReview(e.purchaseMonth),
  }))

  return NextResponse.json({ equipment: withReview })
}

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '入力が不正です', details: parsed.error.flatten() }, { status: 400 })
  }

  const now = new Date().toISOString()
  const item = {
    id: randomUUID(),
    ...parsed.data,
    notes: parsed.data.notes ?? null,
    createdAt: now,
    updatedAt: now,
  }

  const list = getEquipmentList()
  saveEquipmentList([...list, item])
  return NextResponse.json({ equipment: item }, { status: 201 })
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

  const list = getEquipmentList()
  const idx = list.findIndex((e) => e.id === id)
  if (idx < 0) return NextResponse.json({ error: '備品が見つかりません' }, { status: 404 })

  list[idx] = { ...list[idx], ...parsed.data, updatedAt: new Date().toISOString() }
  saveEquipmentList(list)
  return NextResponse.json({ equipment: list[idx] })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'idが必要です' }, { status: 400 })

  const list = getEquipmentList()
  const idx = list.findIndex((e) => e.id === id)
  if (idx < 0) return NextResponse.json({ error: '備品が見つかりません' }, { status: 404 })

  list[idx] = { ...list[idx], condition: 'disposed', updatedAt: new Date().toISOString() }
  saveEquipmentList(list)
  return NextResponse.json({ success: true })
}
