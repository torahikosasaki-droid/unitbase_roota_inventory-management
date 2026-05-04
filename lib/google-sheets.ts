import { google } from 'googleapis'
import type { SheetRow, InventoryStatus } from '@/types/inventory'
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
  MAIN_CATEGORY: 9,
  SUB_CATEGORY: 10,
  DELIVERY_DATE: 11,
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
    mainCategory: values[COL.MAIN_CATEGORY] || null,
    subCategory: values[COL.SUB_CATEGORY] || null,
    deliveryDate: values[COL.DELIVERY_DATE] || null,
  }
}

export async function fetchAllDevices(): Promise<SheetRow[]> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:L`,
  })
  const rows = res.data.values ?? []
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

export async function updateDeviceStatus(
  rowIndex: number,
  status: InventoryStatus
): Promise<void> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  let checkoutFlag = ''
  let soldFlag = ''
  let returnedFlag = ''

  if (status === 'in_stock') {
    // フラグをすべてリセット
    checkoutFlag = ''
    soldFlag = ''
    returnedFlag = ''
  } else if (status === 'checked_out') {
    checkoutFlag = '○'
    soldFlag = ''
    returnedFlag = ''
  } else if (status === 'sold') {
    checkoutFlag = '○'
    soldFlag = '○'
    returnedFlag = ''
  } else if (status === 'returned') {
    checkoutFlag = '○'
    soldFlag = ''
    returnedFlag = '○'
  }

  const data = [
    { range: `${SHEET_NAME}!C${rowIndex}`, values: [[checkoutFlag]] },
    { range: `${SHEET_NAME}!F${rowIndex}`, values: [[soldFlag]] },
    { range: `${SHEET_NAME}!G${rowIndex}`, values: [[returnedFlag]] },
    ...(status === 'in_stock'
      ? [
          { range: `${SHEET_NAME}!D${rowIndex}`, values: [['']] },
          { range: `${SHEET_NAME}!E${rowIndex}`, values: [['']] },
          { range: `${SHEET_NAME}!I${rowIndex}`, values: [['']] },
        ]
      : []),
  ]

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { valueInputOption: 'USER_ENTERED', data },
  })
}

export async function addDeviceRows(
  devices: Array<{
    imei: string
    mainCategory: string
    subCategory: string
    deliveryDate: string
  }>
): Promise<{ added: number; duplicate: number; duplicateImeis: string[] }> {
  const existing = await fetchAllDevices()
  const existingImeis = new Set(existing.map((r) => r.imei))

  const newDevices = devices.filter((d) => !existingImeis.has(d.imei))
  const duplicateImeis = devices.filter((d) => existingImeis.has(d.imei)).map((d) => d.imei)

  if (newDevices.length === 0) {
    return { added: 0, duplicate: duplicateImeis.length, duplicateImeis }
  }

  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const startNo = existing.length + 1
  const rows = newDevices.map((d, i) => [
    String(startNo + i),
    d.imei,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    d.mainCategory,
    d.subCategory,
    d.deliveryDate,
  ])

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:L`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
  })

  return { added: newDevices.length, duplicate: duplicateImeis.length, duplicateImeis }
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
