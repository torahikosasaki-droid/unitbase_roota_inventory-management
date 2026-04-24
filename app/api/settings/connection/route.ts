import { NextResponse } from 'next/server'
import { fetchAllDevices } from '@/lib/google-sheets'

export async function GET() {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID ?? ''
  const sheetName = process.env.GOOGLE_SHEET_NAME ?? '在庫管理'
  const maskedId = spreadsheetId.length > 8
    ? `${'*'.repeat(spreadsheetId.length - 8)}${spreadsheetId.slice(-8)}`
    : spreadsheetId

  try {
    const devices = await fetchAllDevices()
    return NextResponse.json({
      ok: true,
      spreadsheetId: maskedId,
      sheetName,
      rowCount: devices.length,
      checkedAt: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      spreadsheetId: maskedId,
      sheetName,
      rowCount: 0,
      checkedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : '接続エラー',
    })
  }
}
