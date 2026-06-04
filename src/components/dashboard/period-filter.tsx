'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

interface PeriodFilterProps {
  value: { start: string; end: string }
  onChange: (v: { start: string; end: string }) => void
}

const presets = [
  { label: 'Este mês', fn: () => ({ start: format(startOfMonth(new Date()), 'yyyy-MM-dd'), end: format(endOfMonth(new Date()), 'yyyy-MM-dd') }) },
  { label: 'Mês passado', fn: () => { const d = subMonths(new Date(), 1); return { start: format(startOfMonth(d), 'yyyy-MM-dd'), end: format(endOfMonth(d), 'yyyy-MM-dd') } } },
  { label: 'Últimos 3 meses', fn: () => ({ start: format(startOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd'), end: format(endOfMonth(new Date()), 'yyyy-MM-dd') }) },
]

export function PeriodFilter({ value, onChange }: PeriodFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((p) => (
        <Button
          key={p.label}
          variant="outline"
          size="sm"
          onClick={() => onChange(p.fn())}
        >
          {p.label}
        </Button>
      ))}
      <Input
        type="date"
        value={value.start}
        onChange={(e) => onChange({ ...value, start: e.target.value })}
        className="w-36 h-9"
      />
      <span className="text-muted-foreground text-sm">até</span>
      <Input
        type="date"
        value={value.end}
        onChange={(e) => onChange({ ...value, end: e.target.value })}
        className="w-36 h-9"
      />
    </div>
  )
}
