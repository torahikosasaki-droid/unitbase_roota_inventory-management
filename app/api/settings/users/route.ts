import { NextResponse } from 'next/server'
import { z } from 'zod'
import { readJson, writeJson } from '@/lib/data-store'
import type { AppUser } from '@/types/inventory'

const FILENAME = 'users.json'
const DEFAULT: AppUser[] = []

const createSchema = z.object({
  name: z.string().min(1),
  teamName: z.string().min(1),
  role: z.enum(['admin', 'staff']),
})

const patchSchema = z.object({
  role: z.enum(['admin', 'staff']).optional(),
  teamName: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
})

export async function GET() {
  const users = readJson<AppUser[]>(FILENAME, DEFAULT)
  return NextResponse.json({ users })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, teamName, role } = createSchema.parse(body)

    const users = readJson<AppUser[]>(FILENAME, DEFAULT)
    const newUser: AppUser = {
      id: crypto.randomUUID(),
      name,
      teamName,
      role,
      createdAt: new Date().toISOString(),
    }
    users.push(newUser)
    writeJson(FILENAME, users)

    return NextResponse.json({ user: newUser }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'ユーザーの追加に失敗しました' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id は必須です' }, { status: 400 })

    const body = await request.json()
    const updates = patchSchema.parse(body)

    const users = readJson<AppUser[]>(FILENAME, DEFAULT)
    const idx = users.findIndex((u) => u.id === id)
    if (idx === -1) return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 })

    users[idx] = { ...users[idx], ...updates }
    writeJson(FILENAME, users)

    return NextResponse.json({ user: users[idx] })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'ユーザーの更新に失敗しました' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id は必須です' }, { status: 400 })

  const users = readJson<AppUser[]>(FILENAME, DEFAULT)
  const filtered = users.filter((u) => u.id !== id)
  if (filtered.length === users.length) {
    return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 })
  }
  writeJson(FILENAME, filtered)

  return NextResponse.json({ success: true })
}
