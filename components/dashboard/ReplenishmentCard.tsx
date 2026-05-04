'use client'

export interface CategoryStatus {
  label: string
  currentStock: number
  threshold: number
  needed: number
}

export interface ReplenishmentGroupData {
  boothName: string
  categories: CategoryStatus[]
  totalNeeded: number
}

function ProgressBar({ current, threshold }: { current: number; threshold: number }) {
  const pct = threshold === 0 ? 100 : Math.min(100, Math.round((current / threshold) * 100))
  const color =
    pct >= 100 ? 'bg-green-400' :
    pct >= 60  ? 'bg-amber-300' :
    pct >= 30  ? 'bg-amber-500' :
                 'bg-red-500'

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500 tabular-nums shrink-0">{current}/{threshold}</span>
    </div>
  )
}

export function ReplenishmentCard({ boothName, categories, totalNeeded }: ReplenishmentGroupData) {
  const hasShortage = totalNeeded > 0

  return (
    <div className={`rounded-xl border overflow-hidden ${hasShortage ? 'border-red-200' : 'border-green-200'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2.5 ${hasShortage ? 'bg-red-50' : 'bg-green-50'}`}>
        <span className="text-sm font-semibold text-slate-800">{boothName}</span>
        {hasShortage ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-red-500">補充要</span>
            <span className="text-lg font-bold text-red-600 leading-none">{totalNeeded}</span>
            <span className="text-xs text-red-400">台</span>
          </div>
        ) : (
          <span className="text-xs font-medium text-green-600">充足</span>
        )}
      </div>

      {/* Category rows */}
      <div className="divide-y divide-slate-100 bg-white">
        {categories.map((cat, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2">
            <span className="text-xs text-slate-600 w-28 shrink-0 truncate">{cat.label}</span>
            <div className="flex-1 min-w-0">
              <ProgressBar current={cat.currentStock} threshold={cat.threshold} />
            </div>
            <div className="w-14 text-right shrink-0">
              {cat.needed > 0 ? (
                <span className="text-xs font-semibold text-red-600">+{cat.needed}台</span>
              ) : (
                <span className="text-xs text-green-500">✓</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
