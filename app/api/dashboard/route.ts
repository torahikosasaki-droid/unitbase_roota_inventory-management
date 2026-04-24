import { NextResponse } from 'next/server'
import { fetchAllDevices } from '@/lib/google-sheets'

export async function GET() {
  try {
    const devices = await fetchAllDevices()
    const today = new Date().toLocaleDateString('ja-JP')

    const summary = {
      total: devices.length,
      inStock: devices.filter((d) => !d.checkoutFlag).length,
      checkedOut: devices.filter((d) => d.checkoutFlag && !d.soldFlag && !d.returnedFlag).length,
      sold: devices.filter((d) => d.soldFlag && d.soldDate !== null).length,
      returned: devices.filter((d) => d.returnedFlag).length,
    }

    const alertDevices = devices.filter((d) => d.alert && d.alert.length > 0)

    const alerts = {
      missingRisk: alertDevices.filter((d) => d.alert?.includes('紛失')).length,
      recordMiss: alertDevices.filter((d) => d.alert?.includes('記録ミス')).length,
      checkoutMiss: alertDevices.filter((d) => d.alert?.includes('記録漏れ')).length,
      total: alertDevices.length,
    }

    const recentAlerts = [...alertDevices]
      .sort((a, b) => {
        const aScore = a.alert?.includes('紛失') ? 0 : a.alert?.includes('記録ミス') ? 1 : 2
        const bScore = b.alert?.includes('紛失') ? 0 : b.alert?.includes('記録ミス') ? 1 : 2
        return aScore - bScore
      })
      .slice(0, 5)

    const todayActivity = {
      checkedOut: devices.filter((d) => d.checkoutDate === today).length,
      sold: devices.filter((d) => d.soldDate === today).length,
      today,
    }

    return NextResponse.json({ summary, alerts, recentAlerts, todayActivity })
  } catch (error) {
    console.error('Dashboard fetch error:', error)
    return NextResponse.json({ error: 'データの取得に失敗しました' }, { status: 500 })
  }
}
