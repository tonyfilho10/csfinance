'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEntityStore } from '@/store/entity-store'
import { EntitySelector } from '@/components/layout/entity-selector'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { IncomeExpenseChart } from '@/components/dashboard/income-expense-chart'
import { CategoryBreakdown } from '@/components/dashboard/category-breakdown'
import { PeriodFilter } from '@/components/dashboard/period-filter'
import { TransactionDrawer } from '@/components/transactions/transaction-drawer'
import type { BankAccount, DashboardSummary, CategoryExpense, ChartDataPoint, Transaction } from '@/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { startOfMonth, endOfMonth, format } from 'date-fns'

export default function DashboardPage() {
  const supabase = createClient()
  const { currentEntity } = useEntityStore()

  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  })
  const [bankAccountId, setBankAccountId] = useState<string>('all')
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [categoryExpenses, setCategoryExpenses] = useState<CategoryExpense[]>([])
  const [selectedCategory, setSelectedCategory] = useState<CategoryExpense | null>(null)
  const [categoryTransactions, setCategoryTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDashboard = useCallback(async () => {
    if (!currentEntity) { setLoading(false); return }
    setLoading(true)

    const { data: accs } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('entity_id', currentEntity.id)
    setAccounts(accs ?? [])

    let query = supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('entity_id', currentEntity.id)
      .neq('status', 'ignored')
      .gte('date', dateRange.start)
      .lte('date', dateRange.end)

    if (bankAccountId !== 'all') {
      query = query.eq('bank_account_id', bankAccountId)
    }

    const { data: txs } = await query.order('date')
    const transactions: Transaction[] = txs ?? []

    // Summary
    const income = transactions.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0)
    const expenses = transactions.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0)

    let balance = 0
    if (bankAccountId === 'all') {
      balance = (accs ?? []).reduce((s, a) => s + a.current_balance, 0)
    } else {
      const acc = (accs ?? []).find((a) => a.id === bankAccountId)
      balance = acc?.current_balance ?? 0
    }

    setSummary({ total_income: income, total_expenses: expenses, balance, transactions_count: transactions.length })

    // Chart: group by week or day
    const byDate: Record<string, { income: number; expenses: number }> = {}
    transactions.forEach((t) => {
      if (!byDate[t.date]) byDate[t.date] = { income: 0, expenses: 0 }
      if (t.type === 'credit') byDate[t.date].income += t.amount
      else byDate[t.date].expenses += t.amount
    })
    setChartData(
      Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, ...v }))
    )

    // Category breakdown (expenses only)
    const expTxs = transactions.filter((t) => t.type === 'debit')
    const byCat: Record<string, { name: string; color: string; total: number }> = {}
    expTxs.forEach((t) => {
      const cat = t.category
      const key = cat?.id ?? 'sem-categoria'
      if (!byCat[key]) {
        byCat[key] = {
          name: cat?.name ?? 'Sem categoria',
          color: cat?.color ?? '#94a3b8',
          total: 0,
        }
      }
      byCat[key].total += t.amount
    })

    const totalExp = expTxs.reduce((s, t) => s + t.amount, 0)
    const cats: CategoryExpense[] = Object.entries(byCat)
      .map(([id, v]) => ({
        category_id: id,
        category_name: v.name,
        category_color: v.color,
        total: v.total,
        percentage: totalExp > 0 ? (v.total / totalExp) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
    setCategoryExpenses(cats)

    setLoading(false)
  }, [currentEntity, dateRange, bankAccountId, supabase])

  useEffect(() => { fetchDashboard() }, [fetchDashboard])

  async function handleCategoryClick(cat: CategoryExpense) {
    setSelectedCategory(cat)
    const query = supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('entity_id', currentEntity!.id)
      .eq('type', 'debit')
      .gte('date', dateRange.start)
      .lte('date', dateRange.end)
      .order('date', { ascending: false })

    const { data } = cat.category_id === 'sem-categoria'
      ? await query.is('category_id', null)
      : await query.eq('category_id', cat.category_id)

    setCategoryTransactions(data ?? [])
  }

  if (!currentEntity) {
    return (
      <div className="space-y-4">
        <EntitySelector />
        <p className="text-muted-foreground text-center py-12">Selecione uma entidade para ver o dashboard.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h1 className="text-2xl font-bold flex-1">Dashboard</h1>
        <EntitySelector />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <PeriodFilter value={dateRange} onChange={setDateRange} />
        <Select value={bankAccountId} onValueChange={(v) => setBankAccountId(v ?? 'all')}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as contas</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <SummaryCards summary={summary} loading={loading} />
      <IncomeExpenseChart data={chartData} loading={loading} />
      <CategoryBreakdown
        categories={categoryExpenses}
        loading={loading}
        onCategoryClick={handleCategoryClick}
      />

      <TransactionDrawer
        open={!!selectedCategory}
        onClose={() => setSelectedCategory(null)}
        title={selectedCategory?.category_name ?? ''}
        transactions={categoryTransactions}
      />
    </div>
  )
}
