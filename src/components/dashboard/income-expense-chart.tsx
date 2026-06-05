'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { ChartDataPoint } from '@/types'
import { formatCurrency, formatDate } from '@/lib/format'

interface IncomeExpenseChartProps {
  data: ChartDataPoint[]
  loading: boolean
  isPJ?: boolean
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function formatMonth(value: string): string {
  const [, month] = value.split('-')
  return MONTH_NAMES[parseInt(month) - 1] ?? value
}

function formatDay(value: string): string {
  // value is "YYYY-MM-DD"
  const [, m, d] = value.split('-')
  return `${d}/${m}`
}

/** Linear regression — returns y-values aligned with data indices */
function linearTrend(values: number[]): number[] {
  const n = values.length
  if (n < 2) return values.map(() => values[0] ?? 0)
  const xs = values.map((_, i) => i)
  const sumX = xs.reduce((a, x) => a + x, 0)
  const sumY = values.reduce((a, y) => a + y, 0)
  const sumXY = xs.reduce((a, x, i) => a + x * values[i], 0)
  const sumX2 = xs.reduce((a, x) => a + x * x, 0)
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n
  return xs.map((x) => Math.max(0, intercept + slope * x))
}

function CustomTooltip({ active, payload, label, isPJ }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border rounded-lg p-3 shadow-lg text-sm min-w-40">
      <p className="font-semibold mb-2 text-foreground">
        {isPJ ? formatDay(label) : formatMonth(label)}
      </p>
      {payload.map((p: any) => (
        p.dataKey !== 'trend' ? (
          <p key={p.name} className="flex justify-between gap-4" style={{ color: p.color }}>
            <span>{p.name}</span>
            <span className="font-medium">{formatCurrency(p.value)}</span>
          </p>
        ) : null
      ))}
      {payload.find((p: any) => p.dataKey === 'trend') && (
        <p className="flex justify-between gap-4 text-muted-foreground border-t mt-1.5 pt-1.5">
          <span>Tendência</span>
          <span>{formatCurrency(payload.find((p: any) => p.dataKey === 'trend')?.value ?? 0)}</span>
        </p>
      )}
    </div>
  )
}

export function IncomeExpenseChart({ data, loading, isPJ = false }: IncomeExpenseChartProps) {
  // Add trend line values (for PJ: trend of net flow income-expenses)
  const chartData = isPJ && data.length >= 2
    ? (() => {
        const nets = data.map((d) => d.income - d.expenses)
        const trend = linearTrend(nets)
        return data.map((d, i) => ({ ...d, trend: Math.round(trend[i]) }))
      })()
    : data

  const title = isPJ
    ? 'Entradas vs Saídas — diário'
    : 'Entradas vs Saídas — por mês'

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-52 bg-muted animate-pulse rounded-lg" />
        ) : data.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-10">
            Nenhum dado no período selecionado
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={isPJ ? formatDay : formatMonth}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={isPJ && data.length > 14 ? Math.floor(data.length / 10) : 0}
              />
              <YAxis
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip content={<CustomTooltip isPJ={isPJ} />} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                formatter={(value) =>
                  value === 'trend' ? 'Tendência (fluxo)' : value
                }
              />

              <Bar dataKey="income"   name="Entradas" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={isPJ ? 16 : 40} />
              <Bar dataKey="expenses" name="Saídas"   fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={isPJ ? 16 : 40} />

              {isPJ && (
                <Line
                  dataKey="trend"
                  name="trend"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="6 3"
                  type="monotone"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
