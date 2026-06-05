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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Building2, ChevronDown } from 'lucide-react'
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

    // Chart: group by month (PF) or day (PJ)
    const isPJ = currentEntity?.type === 'PJ'
    const grouped: Record<string, { income: number; expenses: number }> = {}
    transactions.forEach((t) => {
      const key = isPJ ? t.date : t.date.slice(0, 7) // day or month
      if (!grouped[key]) grouped[key] = { income: 0, expenses: 0 }
      if (t.type === 'credit') grouped[key].income += t.amount
      else grouped[key].expenses += t.amount
    })
    setChartData(
      Object.entries(grouped)
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
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-input bg-transparent px-3 h-9 text-sm font-medium hover:bg-accent transition-colors">
            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="max-w-36 truncate">
              {bankAccountId === 'all'
                ? 'Todas as contas'
                : accounts.find((a) => a.id === bankAccountId)?.name ?? 'Conta'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setBankAccountId('all')}>
              Todas as contas
            </DropdownMenuItem>
            {accounts.map((a) => (
              <DropdownMenuItem key={a.id} onClick={() => setBankAccountId(a.id)}>
                {a.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SummaryCards summary={summary} loading={loading} />
      <IncomeExpenseChart data={chartData} loading={loading} isPJ={currentEntity?.type === 'PJ'} />
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
