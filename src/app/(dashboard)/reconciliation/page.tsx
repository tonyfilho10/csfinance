'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEntityStore } from '@/store/entity-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Sparkles, Check, X, ChevronDown } from 'lucide-react'
import type { Transaction, Category, ReconciliationSuggestion } from '@/types'
import { formatCurrency, formatDate } from '@/lib/format'

export default function ReconciliationPage() {
  const supabase = createClient()
  const { currentEntity } = useEntityStore()
  const [pending, setPending] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [suggestions, setSuggestions] = useState<Record<string, ReconciliationSuggestion>>({})
  const [overrides, setOverrides] = useState<Record<string, { category_id: string; description: string }>>({})
  const [loadingAI, setLoadingAI] = useState(false)
  const [loadingApprove, setLoadingApprove] = useState(false)
  const [aiRun, setAiRun] = useState(false)

  const fetchData = useCallback(async () => {
    if (!currentEntity) return
    const [{ data: txs }, { data: cats }] = await Promise.all([
      supabase
        .from('transactions')
        .select('*, category:categories(*)')
        .eq('entity_id', currentEntity.id)
        .eq('status', 'pending')
        .order('date', { ascending: false })
        .limit(50),
      supabase.from('categories').select('*').order('name'),
    ])
    setPending(txs ?? [])
    setCategories(cats ?? [])
  }, [currentEntity, supabase])

  useEffect(() => { fetchData() }, [fetchData])

  async function runAI() {
    if (pending.length === 0) return
    setLoadingAI(true)
    try {
      const res = await fetch('/api/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: pending, categories }),
      })
      const data: ReconciliationSuggestion[] = await res.json()
      const map: Record<string, ReconciliationSuggestion> = {}
      data.forEach((s) => { map[s.transaction_id] = s })
      setSuggestions(map)
      setAiRun(true)
      toast.success(`IA sugeriu categorias para ${data.length} lançamentos`)
    } catch {
      toast.error('Erro ao executar IA de conciliação')
    }
    setLoadingAI(false)
  }

  async function approveAll() {
    setLoadingApprove(true)
    const updates = pending.map((t) => {
      const override = overrides[t.id]
      const suggestion = suggestions[t.id]
      return {
        id: t.id,
        category_id: override?.category_id ?? suggestion?.suggested_category_id ?? null,
        description: override?.description ?? suggestion?.suggested_description ?? t.description,
        status: 'reconciled' as const,
      }
    })

    for (const u of updates) {
      await supabase.from('transactions').update({
        category_id: u.category_id,
        description: u.description,
        status: u.status,
      }).eq('id', u.id)
    }

    toast.success('Conciliação aprovada!')
    setSuggestions({})
    setOverrides({})
    setAiRun(false)
    fetchData()
    setLoadingApprove(false)
  }

  function getEffective(t: Transaction) {
    return {
      category_id: overrides[t.id]?.category_id ?? suggestions[t.id]?.suggested_category_id ?? '',
      description: overrides[t.id]?.description ?? suggestions[t.id]?.suggested_description ?? t.description,
    }
  }

  if (!currentEntity) {
    return <p className="text-muted-foreground text-center py-12">Selecione uma entidade para continuar.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Conciliação</h1>
          <p className="text-sm text-muted-foreground">{pending.length} lançamentos pendentes</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runAI} disabled={loadingAI || pending.length === 0} variant="outline">
            {loadingAI ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Conciliar com IA
          </Button>
          {aiRun && (
            <Button onClick={approveAll} disabled={loadingApprove}>
              {loadingApprove ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
              Aprovar tudo
            </Button>
          )}
        </div>
      </div>

      {pending.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Check className="w-12 h-12 mx-auto mb-3 text-green-500" />
          <p className="font-medium">Nenhum lançamento pendente</p>
          <p className="text-sm">Importe um extrato OFX para começar</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pending.map((t) => {
            const effective = getEffective(t)
            const suggestion = suggestions[t.id]
            return (
              <Card key={t.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">{formatDate(t.date)}</span>
                        <Badge variant={t.type === 'credit' ? 'default' : 'destructive'} className="text-xs">
                          {t.type === 'credit' ? 'Entrada' : 'Saída'}
                        </Badge>
                        {suggestion && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Sparkles className="w-3 h-3" />
                            {suggestion.confidence}% confiança
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium truncate mt-1">{t.description}</p>
                      {suggestion && effective.description !== t.description && (
                        <p className="text-sm text-primary truncate">→ {effective.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`font-bold ${t.type === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                        {t.type === 'debit' ? '-' : '+'}{formatCurrency(t.amount)}
                      </span>
                      <Select
                        value={effective.category_id}
                        onValueChange={(val) =>
                          setOverrides((o) => ({ ...o, [t.id]: { ...getEffective(t), category_id: val ?? '' } }))
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
