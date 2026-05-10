import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getEquipmentList, saveEquipmentList } from '@/lib/data-store'

const updateSchema = z.object({
  condition: z.enum(['good', 'damaged', 'disposed']).optional(),
  currentTeam: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
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
  const categoryFilter = searchParams.get('category')
  const conditionFilter = searchParams.get('condition')

  let list = getEquipmentList()

  if (categoryFilter && categoryFilter !== 'all') {
    list = list.filter((e) => e.category === categoryFilter)
  }

  if (conditionFilter && conditionFilter !== 'all') {
    list = list.filter((e) => e.condition === conditionFilter)
  } else if (!conditionFilter) {
    list = list.filter((e) => e.condition !== 'disposed')
  }

  const withReview = list.map((e) => ({
    ...e,
    needsReview: e.condition !== 'disposed' && calcNeedsReview(e.purchaseMonth),
  }))

  return NextResponse.json({ equipment: withReview })
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
