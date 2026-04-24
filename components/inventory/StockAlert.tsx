import { AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { maskImei } from '@/lib/imei'

interface StockAlertProps {
  missingImeis: string[]
  extraImeis?: string[]
}

export function StockAlert({ missingImeis, extraImeis = [] }: StockAlertProps) {
  if (missingImeis.length === 0 && extraImeis.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      {missingImeis.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>紛失の恐れ — {missingImeis.length}台未確認</AlertTitle>
          <AlertDescription>
            <p className="mb-2 text-sm">以下のIMEIが返却確認できていません。直ちに確認してください。</p>
            <ul className="text-sm font-mono space-y-1">
              {missingImeis.map((imei) => (
                <li key={imei} className="font-semibold">{maskImei(imei)}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {extraImeis.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>予期しない端末 — {extraImeis.length}台</AlertTitle>
          <AlertDescription>
            <p className="mb-2 text-sm">持ち出し記録にない端末がスキャンされました。</p>
            <ul className="text-sm font-mono space-y-1">
              {extraImeis.map((imei) => (
                <li key={imei}>{maskImei(imei)}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

interface AlertBadgeProps {
  text: string | null
}

export function AlertBadge({ text }: AlertBadgeProps) {
  if (!text) return null

  const isCritical = text.includes('紛失')
  const isWarning = text.includes('記録ミス') || text.includes('記録漏れ')

  if (isCritical) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded px-2 py-0.5">
        <AlertCircle className="h-3 w-3" />
        {text}
      </span>
    )
  }

  if (isWarning) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">
        <AlertTriangle className="h-3 w-3" />
        {text}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded px-2 py-0.5">
      <Info className="h-3 w-3" />
      {text}
    </span>
  )
}
