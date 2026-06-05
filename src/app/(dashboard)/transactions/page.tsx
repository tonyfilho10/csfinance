'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEntityStore } from '@/store/entity-store'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { EditTransactionSheet } from '@/components/transactions/edit-transaction-sheet'
import { formatCurrency, formatDate } from '@/lib/format'
import { Search, ChevronDown, Pencil, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns'
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
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  })
  const [editing, setEditing] = useState<Transaction | null>(null)

  // Exclusão em massa
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteRange, setDeleteRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
  })
  const [deletePreview, setDeletePreview] = useState<number | null>(null)
  const [loadingDeletePreview, setLoadingDeletePreview] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmText, setConfirmText] = useState('')

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
      .limit(500)

    if (bankFilter !== 'all') query = query.eq('bank_account_id', bankFilter)
    if (statusFilter !== 'all') query = query.eq('status', statusFilter)
    query = query.gte('date', dateRange.start).lte('date', dateRange.end)

    const { data } = await query
    setTransactions(data ?? [])
    setLoading(false)
  }, [currentEntity, bankFilter, statusFilter, dateRange, supabase])

  useEffect(() => { fetchTransactions() }, [fetchTransactions])

  // Preview da exclusão em massa
  async function loadDeletePreview() {
    if (!currentEntity) return
    setLoadingDeletePreview(true)
    let query = supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('entity_id', currentEntity.id)
      .gte('date', deleteRange.start)
      .lte('date', deleteRange.end)
    if (bankFilter !== 'all') query = query.eq('bank_account_id', bankFilter)
    const { count } = await query
    setDeletePreview(count ?? 0)
    setLoadingDeletePreview(false)
  }

  useEffect(() => {
    if (deleteDialogOpen) loadDeletePreview()
  }, [deleteDialogOpen, deleteRange, bankFilter])

  async function handleBulkDelete() {
    if (!currentEntity || confirmText !== 'EXCLUIR') return
    setDeleting(true)
    let query = supabase
      .from('transactions')
      .delete()
      .eq('entity_id', currentEntity.id)
      .gte('date', deleteRange.start)
      .lte('date', deleteRange.end)
    if (bankFilter !== 'all') query = query.eq('bank_account_id', bankFilter)

    const { error } = await query
    if (error) {
      toast.error('Erro ao excluir: ' + error.message)
    } else {
      toast.success(`${deletePreview} lançamentos excluídos!`)
      setDeleteDialogOpen(false)
      setConfirmText('')
      setDeletePreview(null)
      fetchTransactions()
    }
    setDeleting(false)
  }

  const filtered = transactions.filter((t) =>
    t.description.toLowerCase().includes(search.toLowerCase())
  )

  if (!currentEntity) {
    return <p className="text-muted-foreground text-center py-12">Selecione uma entidade para continuar.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Lançamentos</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{filtered.length} registros</span>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive border-destructive/40 hover:bg-destructive/10"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Excluir em massa
          </Button>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="flex flex-wrap gap-2">
        {/* Busca */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar descrição..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Conta */}
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

        {/* Status */}
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

      {/* Filtro de período */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground font-medium">Período:</span>
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { label: 'Este mês', start: format(startOfMonth(new Date()), 'yyyy-MM-dd'), end: format(endOfMonth(new Date()), 'yyyy-MM-dd') },
            { label: 'Mês passado', start: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'), end: format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd') },
            { label: 'Últimos 3 meses', start: format(startOfMonth(subMonths(new Date(), 2)), 'yyyy-MM-dd'), end: format(endOfMonth(new Date()), 'yyyy-MM-dd') },
          ].map((p) => (
            <Button
              key={p.label}
              variant={dateRange.start === p.start && dateRange.end === p.end ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange({ start: p.start, end: p.end })}
            >
              {p.label}
            </Button>
          ))}
          <Input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange((d) => ({ ...d, start: e.target.value }))}
            className="w-36 h-9"
          />
          <span className="text-muted-foreground text-sm">até</span>
          <Input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange((d) => ({ ...d, end: e.target.value }))}
            className="w-36 h-9"
          />
        </div>
      </div>

      {/* ── Lista ── */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Nenhum lançamento encontrado no período</p>
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
                  <div
                    className="w-1 self-stretch rounded-full flex-shrink-0"
                    style={{ backgroundColor: t.type === 'credit' ? '#22c55e' : '#ef4444' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{t.description}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">{formatDate(t.date)}</span>
                      {t.category && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: t.category.color + '22', color: t.category.color }}
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

      {/* ── Sheet de edição ── */}
      <EditTransactionSheet
        transaction={editing}
        open={!!editing}
        onClose={() => setEditing(null)}
        onSaved={fetchTransactions}
      />

      {/* ── Dialog exclusão em massa ── */}
      <Dialog open={deleteDialogOpen} onOpenChange={(o) => { setDeleteDialogOpen(o); if (!o) { setConfirmText(''); setDeletePreview(null) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Excluir lançamentos em massa
            </DialogTitle>
            <DialogDescription>
              Esta ação é irreversível. Todos os lançamentos no período serão excluídos permanentemente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Conta bancária</Label>
              <DropdownMenu>
                <DropdownMenuTrigger className="w-full flex items-center gap-2 rounded-lg border border-input bg-transparent px-3 h-9 text-sm hover:bg-accent transition-colors">
                  <span className="flex-1 text-left">{bankFilter === 'all' ? 'Todas as contas' : accounts.find(a => a.id === bankFilter)?.name ?? 'Conta'}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64">
                  <DropdownMenuItem onClick={() => setBankFilter('all')}>Todas as contas</DropdownMenuItem>
                  {accounts.map((a) => (
                    <DropdownMenuItem key={a.id} onClick={() => setBankFilter(a.id)}>{a.name}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>De</Label>
                <Input type="date" value={deleteRange.start} onChange={(e) => setDeleteRange((d) => ({ ...d, start: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Até</Label>
                <Input type="date" value={deleteRange.end} onChange={(e) => setDeleteRange((d) => ({ ...d, end: e.target.value }))} />
              </div>
            </div>

            {/* Preview */}
            <div className={`rounded-lg p-3 text-sm border ${deletePreview === 0 ? 'bg-muted' : 'bg-destructive/10 border-destructive/30'}`}>
              {loadingDeletePreview ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Contando lançamentos...
                </div>
              ) : deletePreview !== null ? (
                <span className={deletePreview === 0 ? 'text-muted-foreground' : 'text-destructive font-semibold'}>
                  {deletePreview === 0 ? 'Nenhum lançamento neste período.' : `⚠️ ${deletePreview} lançamentos serão excluídos permanentemente.`}
                </span>
              ) : null}
            </div>

            {/* Confirmação */}
            {deletePreview !== null && deletePreview > 0 && (
              <div className="space-y-1.5">
                <Label>Digite <strong>EXCLUIR</strong> para confirmar</Label>
                <Input
                  placeholder="EXCLUIR"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="font-mono"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={deleting || deletePreview === 0 || confirmText !== 'EXCLUIR'}
              onClick={handleBulkDelete}
            >
              {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Excluir {deletePreview !== null && deletePreview > 0 ? `${deletePreview} lançamentos` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
