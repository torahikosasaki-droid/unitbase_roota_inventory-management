import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { EQUIPMENT_CATEGORIES } from '@/types/inventory'
import type { EquipmentCategory } from '@/types/inventory'
import { getEquipmentList, saveEquipmentList } from '@/lib/data-store'

type ImportError = { row: number; managementNumber: string; reason: string }

export async function POST(request: Request) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'ファイルが必要です' }, { status: 400 })
  }

  const text = await file.text()
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) {
    return NextResponse.json({ error: 'データ行がありません' }, { status: 400 })
  }

  // skip header row (index 0)
  const dataLines = lines.slice(1)
  const existing = getEquipmentList()
  const existingNumbers = new Set(existing.map((e) => e.managementNumber))

  const toAdd: typeof existing = []
  const errors: ImportError[] = []
  let skipped = 0

  for (let i = 0; i < dataLines.length; i++) {
    const rowNum = i + 2 // 1-based, +1 for header
    const cols = dataLines[i].split(',')
    const managementNumber = cols[0]?.trim() ?? ''
    const categoryRaw = cols[1]?.trim() ?? ''
    const purchaseMonth = cols[2]?.trim() ?? ''
    const conditionRaw = cols[3]?.trim() || 'good'
    const currentTeam = cols[4]?.trim() || null
    const notes = cols[5]?.trim() || null

    if (!managementNumber) {
      skipped++
      continue
    }

    if (existingNumbers.has(managementNumber)) {
      errors.push({ row: rowNum, managementNumber, reason: '管理番号が重複しています' })
      skipped++
      continue
    }

    if (!(EQUIPMENT_CATEGORIES as readonly string[]).includes(categoryRaw)) {
      errors.push({ row: rowNum, managementNumber, reason: `カテゴリー「${categoryRaw}」は無効です` })
      skipped++
      continue
    }

    if (!/^\d{4}-\d{2}$/.test(purchaseMonth)) {
      errors.push({ row: rowNum, managementNumber, reason: '導入月はYYYY-MM形式で入力してください' })
      skipped++
      continue
    }

    if (!['good', 'damaged', 'disposed'].includes(conditionRaw)) {
      errors.push({ row: rowNum, managementNumber, reason: `状態「${conditionRaw}」は無効です（good/damaged/disposed）` })
      skipped++
      continue
    }

    const now = new Date().toISOString()
    const item = {
      id: randomUUID(),
      managementNumber,
      category: categoryRaw as EquipmentCategory,
      purchaseMonth,
      condition: conditionRaw as 'good' | 'damaged' | 'disposed',
      currentTeam: currentTeam || null,
      notes: notes || null,
      createdAt: now,
      updatedAt: now,
    }

    toAdd.push(item)
    existingNumbers.add(managementNumber)
  }

  if (toAdd.length > 0) {
    saveEquipmentList([...existing, ...toAdd])
  }

  return NextResponse.json({ added: toAdd.length, skipped, errors })
}
