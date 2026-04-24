import { google } from 'googleapis'
import type { SheetRow } from '@/types/inventory'
import { detectAlert, alertToText } from '@/lib/reconcile'

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!
const SHEET_NAME = process.env.GOOGLE_SHEET_NAME ?? '在庫管理'

const COL = {
  NO: 0,
  IMEI: 1,
  CHECKOUT_FLAG: 2,
  CHECKOUT_DATE: 3,
  SALES_BOOTH: 4,
  SOLD_FLAG: 5,
  RETURNED_FLAG: 6,
  SOLD_DATE: 7,
  ALERT: 8,
} as const

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

function rowToSheetRow(values: string[], rowIndex: number): SheetRow {
  return {
    rowIndex,
    imei: values[COL.IMEI] ?? '',
    checkoutFlag: values[COL.CHECKOUT_FLAG] === '○',
    checkoutDate: values[COL.CHECKOUT_DATE] || null,
    salesBooth: values[COL.SALES_BOOTH] || null,
    soldFlag: values[COL.SOLD_FLAG] === '○',
    returnedFlag: values[COL.RETURNED_FLAG] === '○',
    soldDate: values[COL.SOLD_DATE] || null,
    alert: values[COL.ALERT] || null,
  }
}

export async function fetchAllDevices(): Promise<SheetRow[]> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:I`,
  })
  const rows = res.data.values ?? []
  // Skip header rows (row 0 and 1 are header)
  return rows
    .slice(2)
    .map((row, i) => rowToSheetRow(row as string[], i + 3))
    .filter((r) => r.imei.length > 0)
}

export async function updateDeviceRow(
  rowIndex: number,
  updates: Partial<{
    checkoutFlag: boolean
    checkoutDate: string
    salesBooth: string
    soldFlag: boolean
    returnedFlag: boolean
    soldDate: string
    alert: string
  }>
): Promise<void> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const requests = []

  if (updates.checkoutFlag !== undefined) {
    requests.push({
      range: `${SHEET_NAME}!C${rowIndex}`,
      values: [[updates.checkoutFlag ? '○' : '']],
    })
  }
  if (updates.checkoutDate !== undefined) {
    requests.push({
      range: `${SHEET_NAME}!D${rowIndex}`,
      values: [[updates.checkoutDate]],
    })
  }
  if (updates.salesBooth !== undefined) {
    requests.push({
      range: `${SHEET_NAME}!E${rowIndex}`,
      values: [[updates.salesBooth]],
    })
  }
  if (updates.soldFlag !== undefined) {
    requests.push({
      range: `${SHEET_NAME}!F${rowIndex}`,
      values: [[updates.soldFlag ? '○' : '']],
    })
  }
  if (updates.returnedFlag !== undefined) {
    requests.push({
      range: `${SHEET_NAME}!G${rowIndex}`,
      values: [[updates.returnedFlag ? '○' : '']],
    })
  }
  if (updates.alert !== undefined) {
    requests.push({
      range: `${SHEET_NAME}!I${rowIndex}`,
      values: [[updates.alert]],
    })
  }

  if (requests.length === 0) return

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: requests,
    },
  })
}

export async function findRowByImei(imei: string): Promise<SheetRow | null> {
  const all = await fetchAllDevices()
  return all.find((r) => r.imei === imei) ?? null
}

export async function runAlertScan(): Promise<number> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const all = await fetchAllDevices()

  const data = all
    .map((row) => {
      const alertType = detectAlert(row)
      const alertText = alertToText(alertType)
      return {
        range: `${SHEET_NAME}!I${row.rowIndex}`,
        values: [[alertText]],
      }
    })

  if (data.length === 0) return 0

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { valueInputOption: 'USER_ENTERED', data },
  })

  return all.filter((r) => detectAlert(r) !== null).length
}
