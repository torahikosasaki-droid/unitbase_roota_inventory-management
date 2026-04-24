export type AlertType =
  | 'sold_no_external_record'
  | 'external_record_no_checkout'
  | 'missing_risk'
  | null

export interface SheetRow {
  rowIndex: number
  imei: string
  checkoutFlag: boolean
  checkoutDate: string | null
  salesBooth: string | null
  soldFlag: boolean
  returnedFlag: boolean
  soldDate: string | null
  alert: string | null
}

export interface SalesSession {
  id: string
  staffName: string
  date: string
  salesBooth: string
  checkedOutImeis: string[]
  soldImeis: string[]
  returnedImeis: string[]
  status: 'active' | 'reconciled' | 'discrepancy'
}

export interface ReconciliationResult {
  expected: string[]
  scanned: string[]
  missing: string[]
  extra: string[]
  isComplete: boolean
}

export type UserRole = 'admin' | 'staff'

export interface AppUser {
  id: string
  name: string
  teamName: string
  role: UserRole
  createdAt: string
}

export interface Booth {
  id: string
  name: string
}
