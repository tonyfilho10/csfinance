'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEntityStore } from '@/store/entity-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/format'
import { PeriodFilter } from '@/components/dashboard/period-filter'
import { TrendingUp, TrendingDown, Wallet, Building2, ChevronDown, ChevronUp } from 'lucide-react'
import { startOfMonth, endOfMonth, format } from 'date-fns'
import type { BankAccount } from '@/types'

interface BankSummary {
  account: BankAccount
  totalCredits: number
  totalDebits: number
  netFlow: number
  currentBalance: number
  txCount: number
}

export default function ExtratoPage() {
  const supabase = createClient()
  const { currentEntity } = useEntityStore()
  const [summaries, setSummaries] = useState<BankSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  })

  const fetchData = useCallback(async () => {
    if (!currentEntity) { setLoading(false); return }
    setLoading(true)

    const { data: accounts } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('entity_id', currentEntity.id)
      .order('name')

    if (!accounts?.length) { setSummaries([]); setLoading(false); return }

    const results: BankSummary[] = []

    for (const account of accounts) {
      const { data: txs } = await supabase
        .from('transactions')
        .select('amount, type')
        .eq('bank_account_id', account.id)
        .neq('status', 'ignored')
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)

      const totalCredits = (txs ?? [])
        .filter((t) => t.type === 'credit')
        .reduce((s, t) => s + Number(t.amount), 0)
      const totalDebits = (txs ?? [])
        .filter((t) => t.type === 'debit')
        .reduce((s, t) => s + Number(t.amount), 0)

      results.push({
        account,
        totalCredits,
        totalDebits,
        netFlow: totalCredits - totalDebits,
        currentBalance: Number(account.current_balance),
        txCount: (txs ?? []).length,
      })
    }

    setSummaries(results)
    setLoading(false)
  }, [currentEntity, dateRange, supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const totalCredits = summaries.reduce((s, b) => s + b.totalCredits, 0)
  const totalDebits = summaries.reduce((s, b) => s + b.totalDebits, 0)
  const totalBalance = summaries.reduce((s, b) => s + b.currentBalance, 0)

  if (!currentEntity) return (
    <p className="text-muted-foreground text-center py-12">Selecione uma entidade para continuar.</p>
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Extrato por banco</h1>
        <p className="text-sm text-muted-foreground">Entradas, saídas e saldo por conta no período</p>
      </div>

      <PeriodFilter value={dateRange} onChange={setDateRange} />

      {/* Cards consolidados */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">Total entradas</span>
              <div className="w-7 h-7 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-green-500" />
              </div>
            </div>
            <p className="text-xl font-bold text-green-500">{formatCurrency(totalCredits)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">Total saídas</span>
              <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center">
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              </div>
            </div>
            <p className="text-xl font-bold text-red-500">{formatCurrency(totalDebits)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">Saldo consolidado</span>
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Wallet className="w-3.5 h-3.5 text-primary" />
              </div>
            </div>
            <p className={`text-xl font-bold ${totalBalance >= 0 ? 'text-primary' : 'text-red-500'}`}>
              {formatCurrency(totalBalance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Por banco */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : summaries.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">Nenhuma conta cadastrada</p>
      ) : (
        <div className="space-y-3">
          {summaries.map((s) => (
            <Card key={s.account.id} className="overflow-hidden">
              {/* Header do banco */}
              <CardHeader
                className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setExpanded(expanded === s.account.id ? null : s.account.id)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: (s.account.color ?? '#6366f1') + '22', color: s.account.color ?? '#6366f1' }}
                  >
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{s.account.name}</CardTitle>
                      <Badge variant="outline" className="text-xs">{s.txCount} lançamentos</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{s.account.bank_name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground mb-0.5">Saldo atual</p>
                    <p className={`font-bold ${s.currentBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {formatCurrency(s.currentBalance)}
                    </p>
                  </div>
                  {expanded === s.account.id
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  }
                </div>
              </CardHeader>

              {/* Detalhe expandido */}
              {expanded === s.account.id && (
                <CardContent className="px-4 pb-4 pt-0 border-t">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
                    {/* Entradas */}
                    <div className="rounded-lg bg-green-500/10 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="text-xs font-semibold text-green-500 uppercase tracking-wide">Entradas</span>
                      </div>
                      <p className="text-lg font-bold text-green-500">{formatCurrency(s.totalCredits)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {s.txCount > 0 ? `${((s.totalCredits / (s.totalCredits + s.totalDebits || 1)) * 100).toFixed(1)}% do movimento` : '—'}
                      </p>
                    </div>

                    {/* Saídas */}
                    <div className="rounded-lg bg-red-500/10 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="w-4 h-4 text-red-500" />
                        <span className="text-xs font-semibold text-red-500 uppercase tracking-wide">Saídas</span>
                      </div>
                      <p className="text-lg font-bold text-red-500">{formatCurrency(s.totalDebits)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {s.txCount > 0 ? `${((s.totalDebits / (s.totalCredits + s.totalDebits || 1)) * 100).toFixed(1)}% do movimento` : '—'}
                      </p>
                    </div>

                    {/* Fluxo líquido */}
                    <div className={`rounded-lg p-3 ${s.netFlow >= 0 ? 'bg-primary/10' : 'bg-red-500/10'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Wallet className={`w-4 h-4 ${s.netFlow >= 0 ? 'text-primary' : 'text-red-500'}`} />
                        <span className={`text-xs font-semibold uppercase tracking-wide ${s.netFlow >= 0 ? 'text-primary' : 'text-red-500'}`}>
                          Fluxo líquido
                        </span>
                      </div>
                      <p className={`text-lg font-bold ${s.netFlow >= 0 ? 'text-primary' : 'text-red-500'}`}>
                        {s.netFlow >= 0 ? '+' : ''}{formatCurrency(s.netFlow)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Saldo inicial: {formatCurrency(Number(s.account.initial_balance))}
                      </p>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
