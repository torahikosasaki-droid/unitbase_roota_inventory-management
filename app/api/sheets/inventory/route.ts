import { NextResponse } from 'next/server'
import { fetchAllDevices } from '@/lib/google-sheets'
import type { InventoryStatus, SheetRow } from '@/types/inventory'

function getStatus(row: SheetRow): InventoryStatus {
  if (row.soldFlag) return 'sold'
  if (row.returnedFlag) return 'returned'
  if (row.checkoutFlag) return 'checked_out'
  return 'in_stock'
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const alertOnly = searchParams.get('alert') === 'only'
    const statusParam = searchParams.get('status')
    const mainCategory = searchParams.get('mainCategory')
    const subCategory = searchParams.get('subCategory')
    const deliveryDateFrom = searchParams.get('deliveryDateFrom')
    const deliveryDateTo = searchParams.get('deliveryDateTo')

    const statusFilter: InventoryStatus[] = statusParam
      ? (statusParam.split(',') as InventoryStatus[])
      : []

    const devices = await fetchAllDevices()

    const filtered = devices.filter((d) => {
      if (alertOnly && (!d.alert || d.alert.length === 0)) return false
      if (statusFilter.length > 0 && !statusFilter.includes(getStatus(d))) return false
      if (mainCategory && d.mainCategory !== mainCategory) return false
      if (subCategory && d.subCategory !== subCategory) return false
      if (deliveryDateFrom && d.deliveryDate && d.deliveryDate < deliveryDateFrom) return false
      if (deliveryDateTo && d.deliveryDate && d.deliveryDate > deliveryDateTo) return false
      return true
    })

    return NextResponse.json({ devices: filtered })
  } catch (error) {
    console.error('Failed to fetch inventory:', error)
    return NextResponse.json({ error: 'スプレッドシートの取得に失敗しました' }, { status: 500 })
  }
}
