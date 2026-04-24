import type { AlertType, SheetRow, SalesSession, ReconciliationResult } from '@/types/inventory'

export function detectAlert(row: SheetRow): AlertType {
  if (row.checkoutFlag && row.soldFlag && !row.soldDate) {
    return 'sold_no_external_record'
  }
  if (!row.checkoutFlag && row.soldDate) {
    return 'external_record_no_checkout'
  }
  if (row.checkoutFlag && !row.soldFlag && !row.returnedFlag) {
    return 'missing_risk'
  }
  return null
}

export function alertToText(type: AlertType): string {
  if (!type) return ''
  const map: Record<NonNullable<AlertType>, string> = {
    sold_no_external_record: '持ち出し・販売記録ありだが実績データなし（記録ミス）',
    external_record_no_checkout: '持ち出し記録なしだが、実績データあり（持ち出し記録漏れ）',
    missing_risk: '持ち出し記録ありだが、持ち帰り・販売記録なし（紛失の恐れ）',
  }
  return map[type]
}

export function calculateExpectedReturns(session: SalesSession): string[] {
  return session.checkedOutImeis.filter(
    (imei) => !session.soldImeis.includes(imei)
  )
}

export function reconcile(
  session: SalesSession,
  scannedImeis: string[]
): ReconciliationResult {
  const expected = calculateExpectedReturns(session)
  const missing = expected.filter((imei) => !scannedImeis.includes(imei))
  const extra = scannedImeis.filter((imei) => !expected.includes(imei))
  return {
    expected,
    scanned: scannedImeis,
    missing,
    extra,
    isComplete: missing.length === 0 && extra.length === 0,
  }
}
