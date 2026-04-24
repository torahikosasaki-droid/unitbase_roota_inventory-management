import { NextResponse } from 'next/server'
import { fetchAllDevices } from '@/lib/google-sheets'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('alert')

    const devices = await fetchAllDevices()

    const filtered = statusFilter === 'only'
      ? devices.filter((d) => d.alert && d.alert.length > 0)
      : devices

    return NextResponse.json({ devices: filtered })
  } catch (error) {
    console.error('Failed to fetch inventory:', error)
    return NextResponse.json({ error: 'スプレッドシートの取得に失敗しました' }, { status: 500 })
  }
}
