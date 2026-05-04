'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { InventoryStatus } from '@/types/inventory'

export interface InventoryFilterState {
  status: InventoryStatus[]
  mainCategory: string
  subCategory: string
  deliveryDateFrom: string
  deliveryDateTo: string
  alertOnly: boolean
}

export const emptyFilters: InventoryFilterState = {
  status: [],
  mainCategory: '',
  subCategory: '',
  deliveryDateFrom: '',
  deliveryDateTo: '',
  alertOnly: false,
}

interface Props {
  filters: InventoryFilterState
  onChange: (f: InventoryFilterState) => void
  onReset: () => void
}

const STATUS_OPTIONS: { value: InventoryStatus; label: string }[] = [
  { value: 'in_stock', label: '本社在庫' },
  { value: 'checked_out', label: '持ち出し中' },
  { value: 'sold', label: '販売済み' },
  { value: 'returned', label: '返却済み' },
]

function activeCount(f: InventoryFilterState) {
  let n = 0
  if (f.status.length > 0) n++
  if (f.mainCategory) n++
  if (f.subCategory) n++
  if (f.deliveryDateFrom || f.deliveryDateTo) n++
  if (f.alertOnly) n++
  return n
}

export function InventoryFilters({ filters, onChange, onReset }: Props) {
  const [open, setOpen] = useState(false)
  const count = activeCount(filters)

  const toggleStatus = (s: InventoryStatus) => {
    const next = filters.status.includes(s)
      ? filters.status.filter((x) => x !== s)
      : [...filters.status, s]
    onChange({ ...filters, status: next })
  }

  const set = <K extends keyof InventoryFilterState>(k: K, v: InventoryFilterState[K]) =>
    onChange({ ...filters, [k]: v })

  return (
    <div className="flex flex-col gap-2">
      {/* Toggle button (mobile) / always visible header (desktop) */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setOpen(!open)}
          className={`sm:hidden flex items-center gap-1.5 text-xs border rounded px-3 py-1.5 transition-colors ${
            count > 0 ? 'text-blue-700 border-blue-300 bg-blue-50' : 'text-slate-600 border-slate-200 bg-white'
          }`}
        >
          絞り込み
          {count > 0 && (
            <span className="bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {count}
            </span>
          )}
        </button>

        {/* Desktop: always show filter bar */}
        <div className="hidden sm:flex items-center gap-2 flex-wrap flex-1">
          <FilterContent filters={filters} toggleStatus={toggleStatus} set={set} />
        </div>

        {count > 0 && (
          <Button variant="outline" size="sm" onClick={onReset} className="text-xs shrink-0">
            リセット
          </Button>
        )}
      </div>

      {/* Mobile: collapsible panel */}
      {open && (
        <div className="sm:hidden flex flex-col gap-3 border border-slate-200 rounded-lg p-3 bg-white">
          <FilterContent filters={filters} toggleStatus={toggleStatus} set={set} />
        </div>
      )}
    </div>
  )
}

interface FilterContentProps {
  filters: InventoryFilterState
  toggleStatus: (s: InventoryStatus) => void
  set: <K extends keyof InventoryFilterState>(k: K, v: InventoryFilterState[K]) => void
}

function FilterContent({ filters, toggleStatus, set }: FilterContentProps) {
  return (
    <>
      {/* Status toggle badges */}
      <div className="flex items-center gap-1 flex-wrap">
        {STATUS_OPTIONS.map((opt) => {
          const active = filters.status.includes(opt.value)
          return (
            <button
              key={opt.value}
              onClick={() => toggleStatus(opt.value)}
              className={`px-2 py-0.5 rounded text-xs border transition-colors ${
                active
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      {/* Category inputs */}
      <Input
        value={filters.mainCategory}
        onChange={(e) => set('mainCategory', e.target.value)}
        placeholder="大カテゴリー（モバイル/BB）"
        className={`text-xs h-7 w-40 transition-colors ${filters.mainCategory ? 'border-blue-400 ring-1 ring-blue-100' : ''}`}
      />
      <Input
        value={filters.subCategory}
        onChange={(e) => set('subCategory', e.target.value)}
        placeholder="小カテゴリー（iPhone 等）"
        className={`text-xs h-7 w-40 transition-colors ${filters.subCategory ? 'border-blue-400 ring-1 ring-blue-100' : ''}`}
      />

      {/* Delivery date range */}
      <div className="flex items-center gap-1">
        <Input
          type="date"
          value={filters.deliveryDateFrom}
          onChange={(e) => set('deliveryDateFrom', e.target.value)}
          className={`text-xs h-7 w-32 transition-colors ${filters.deliveryDateFrom ? 'border-blue-400 ring-1 ring-blue-100' : ''}`}
        />
        <span className="text-xs text-slate-400">〜</span>
        <Input
          type="date"
          value={filters.deliveryDateTo}
          onChange={(e) => set('deliveryDateTo', e.target.value)}
          className={`text-xs h-7 w-32 transition-colors ${filters.deliveryDateTo ? 'border-blue-400 ring-1 ring-blue-100' : ''}`}
        />
      </div>

      {/* Alert toggle */}
      <button
        onClick={() => set('alertOnly', !filters.alertOnly)}
        className={`px-2 py-0.5 rounded text-xs border transition-colors ${
          filters.alertOnly
            ? 'bg-red-600 text-white border-red-600'
            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
        }`}
      >
        アラートのみ
      </button>
    </>
  )
}
