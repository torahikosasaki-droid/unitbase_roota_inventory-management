'use client'

import { EQUIPMENT_CATEGORIES } from '@/types/inventory'
import type { EquipmentCategory } from '@/types/inventory'

interface Props {
  selected: EquipmentCategory | 'all'
  onChange: (v: EquipmentCategory | 'all') => void
}

export function CategorySelector({ selected, onChange }: Props) {
  const options: Array<{ value: EquipmentCategory | 'all'; label: string }> = [
    { value: 'all', label: 'すべて' },
    ...EQUIPMENT_CATEGORIES.map((c) => ({ value: c, label: c })),
  ]

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {options.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`shrink-0 px-3 py-1 rounded text-xs border transition-colors ${
            selected === value
              ? 'bg-slate-800 text-white border-slate-800'
              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
