import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Wallet, ArrowLeftRight } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import type { DashboardSummary } from '@/types'

interface SummaryCardsProps {
  summary: DashboardSummary | null
  loading: boolean
}

export function SummaryCards({ summary, loading }: SummaryCardsProps) {
  const cards = [
    {
      label: 'Saldo atual',
      value: summary?.balance ?? 0,
      icon: Wallet,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Entradas',
      value: summary?.total_income ?? 0,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Saídas',
      value: summary?.total_expenses ?? 0,
      icon: TrendingDown,
      color: 'text-red-500',
      bg: 'bg-red-50',
    },
    {
      label: 'Lançamentos',
      value: summary?.transactions_count ?? 0,
      icon: ArrowLeftRight,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      isCount: true,
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(({ label, value, icon: Icon, color, bg, isCount }) => (
        <Card key={label}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">{label}</span>
              <div className={`w-7 h-7 rounded-full ${bg} flex items-center justify-center`}>
                <Icon className={`w-3.5 h-3.5 ${color}`} />
              </div>
            </div>
            <p className={`text-xl font-bold ${color}`}>
              {isCount ? value : formatCurrency(value as number)}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
