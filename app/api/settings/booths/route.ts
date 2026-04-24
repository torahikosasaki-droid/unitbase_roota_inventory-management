import { NextResponse } from 'next/server'
import { z } from 'zod'
import { readJson, writeJson } from '@/lib/data-store'
import type { Booth } from '@/types/inventory'

const FILENAME = 'booths.json'
const DEFAULT: Booth[] = [
  { id: '1', name: 'A' },
  { id: '2', name: 'B' },
  { id: '3', name: 'C' },
]

export async function GET() {
  const booths = readJson<Booth[]>(FILENAME, DEFAULT)
  return NextResponse.json({ booths })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name } = z.object({ name: z.string().min(1) }).parse(body)

    const booths = readJson<Booth[]>(FILENAME, DEFAULT)
    if (booths.some((b) => b.name === name)) {
      return NextResponse.json({ error: '同じ名前のブースが既に存在します' }, { status: 400 })
    }

    const newBooth: Booth = { id: crypto.randomUUID(), name }
    booths.push(newBooth)
    writeJson(FILENAME, booths)

    return NextResponse.json({ booth: newBooth }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'ブースの追加に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id は必須です' }, { status: 400 })

  const booths = readJson<Booth[]>(FILENAME, DEFAULT)
  const filtered = booths.filter((b) => b.id !== id)
  if (filtered.length === booths.length) {
    return NextResponse.json({ error: 'ブースが見つかりません' }, { status: 404 })
  }
  writeJson(FILENAME, filtered)

  return NextResponse.json({ success: true })
}
