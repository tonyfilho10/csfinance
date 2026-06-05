'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEntityStore } from '@/store/entity-store'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EditTransactionSheet } from '@/components/transactions/edit-transaction-sheet'
import { formatCurrency, formatDate } from '@/lib/format'
import { Search, ChevronDown, Pencil } from 'lucide-react'
import type { Transaction, BankAccount } from '@/types'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  reconciled: 'Conciliado',
  ignored: 'Ignorado',
}

export default function TransactionsPage() {
  const supabase = createClient()
  const { currentEntity } = useEntityStore()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [bankFilter, setBankFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [editing, setEditing] = useState<Transaction | null>(null)

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
      .limit(300)

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

  if (!currentEntity) {
    return <p className="text-muted-foreground text-center py-12">Selecione uma entidade para continuar.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Lançamentos</h1>
        <span className="text-sm text-muted-foreground">{filtered.length} registros</span>
      </div>

      {/* Filtros */}
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
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-input bg-transparent px-3 h-9 text-sm font-medium hover:bg-accent transition-colors">
            <span>{bankFilter === 'all' ? 'Todas as contas' : accounts.find(a => a.id === bankFilter)?.name ?? 'Conta'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setBankFilter('all')}>Todas as contas</DropdownMenuItem>
            {accounts.map((a) => (
              <DropdownMenuItem key={a.id} onClick={() => setBankFilter(a.id)}>{a.name}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-input bg-transparent px-3 h-9 text-sm font-medium hover:bg-accent transition-colors">
            <span>{{ all: 'Todos', pending: 'Pendente', reconciled: 'Conciliado', ignored: 'Ignorado' }[statusFilter]}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setStatusFilter('all')}>Todos</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('pending')}>Pendente</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('reconciled')}>Conciliado</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('ignored')}>Ignorado</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Nenhum lançamento encontrado</p>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((t) => (
            <Card
              key={t.id}
              className="hover:shadow-sm transition-shadow cursor-pointer group"
              onClick={() => setEditing(t)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  {/* Indicador tipo */}
                  <div
                    className="w-1 self-stretch rounded-full flex-shrink-0"
                    style={{ backgroundColor: t.type === 'credit' ? '#22c55e' : '#ef4444' }}
                  />

                  {/* Conteúdo principal */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{t.description}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">{formatDate(t.date)}</span>
                      {t.category && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: t.category.color + '22',
                            color: t.category.color,
                          }}
                        >
                          {t.category.name}
                        </span>
                      )}
                      <Badge
                        variant={t.status === 'reconciled' ? 'default' : t.status === 'pending' ? 'outline' : 'secondary'}
                        className="text-xs h-4"
                      >
                        {STATUS_LABELS[t.status]}
                      </Badge>
                    </div>
                  </div>

                  {/* Valor + edit icon */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`font-bold text-sm ${t.type === 'credit' ? 'text-green-500' : 'text-red-500'}`}>
                      {t.type === 'debit' ? '-' : '+'}{formatCurrency(Number(t.amount))}
                    </span>
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <EditTransactionSheet
        transaction={editing}
        open={!!editing}
        onClose={() => setEditing(null)}
        onSaved={fetchTransactions}
      />
    </div>
  )
}
