'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEntityStore } from '@/store/entity-store'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatDate } from '@/lib/format'
import { Search } from 'lucide-react'
import type { Transaction, BankAccount } from '@/types'

export default function TransactionsPage() {
  const supabase = createClient()
  const { currentEntity } = useEntityStore()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [bankFilter, setBankFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchTransactions = useCallback(async () => {
    if (!currentEntity) { setLoading(false); return }
    setLoading(true)

    const { data: accs } = await supabase.from('bank_accounts').select('*').eq('entity_id', currentEntity.id)
    setAccounts(accs ?? [])

    let query = supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('entity_id', currentEntity.id)
      .order('date', { ascending: false })
      .limit(200)

    if (bankFilter !== 'all') query = query.eq('bank_account_id', bankFilter)
    if (statusFilter !== 'all') query = query.eq('status', statusFilter)

    const { data } = await query
    setTransactions(data ?? [])
    setLoading(false)
  }, [currentEntity, bankFilter, statusFilter, supabase])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  const filtered = transactions.filter((t) =>
    t.description.toLowerCase().includes(search.toLowerCase())
  )

  const statusColors: Record<string, string> = {
    pending: 'warning',
    reconciled: 'default',
    ignored: 'secondary',
  }
  const statusLabels: Record<string, string> = {
    pending: 'Pendente',
    reconciled: 'Conciliado',
    ignored: 'Ignorado',
  }

  if (!currentEntity) {
    return <p className="text-muted-foreground text-center py-12">Selecione uma entidade para continuar.</p>
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Lançamentos</h1>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar descrição..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={bankFilter} onValueChange={(v) => setBankFilter(v ?? 'all')}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as contas</SelectItem>
            {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="reconciled">Conciliado</SelectItem>
            <SelectItem value="ignored">Ignorado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Nenhum lançamento encontrado</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-2 self-stretch rounded-full flex-shrink-0"
                    style={{ backgroundColor: t.type === 'credit' ? '#22c55e' : '#ef4444' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{t.description}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">{formatDate(t.date)}</span>
                      {t.category && (
                        <Badge
                          variant="outline"
                          className="text-xs"
                          style={{ borderColor: t.category.color, color: t.category.color }}
                        >
                          {t.category.name}
                        </Badge>
                      )}
                      <Badge
                        variant={t.status === 'reconciled' ? 'default' : t.status === 'pending' ? 'outline' : 'secondary'}
                        className="text-xs"
                      >
                        {statusLabels[t.status]}
                      </Badge>
                    </div>
                  </div>
                  <span className={`font-bold flex-shrink-0 ${t.type === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                    {t.type === 'debit' ? '-' : '+'}{formatCurrency(t.amount)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
