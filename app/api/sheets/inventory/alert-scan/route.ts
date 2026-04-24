import { NextResponse } from 'next/server'
import { runAlertScan } from '@/lib/google-sheets'

export async function POST() {
  try {
    const alertCount = await runAlertScan()
    return NextResponse.json({ alertCount })
  } catch (error) {
    console.error('Alert scan error:', error)
    return NextResponse.json({ error: 'アラートスキャンに失敗しました' }, { status: 500 })
  }
}
