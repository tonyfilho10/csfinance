'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEntityStore } from '@/store/entity-store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { Loader2, Sparkles, Check, ChevronDown } from 'lucide-react'
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
  const [progress, setProgress] = useState({ done: 0, total: 0 })
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
        .limit(300),
      supabase.from('categories').select('*').order('name'),
    ])
    setPending(txs ?? [])
    setCategories(cats ?? [])
  }, [currentEntity, supabase])

  useEffect(() => { fetchData() }, [fetchData])

  async function runAI() {
    if (pending.length === 0) return
    setLoadingAI(true)
    setProgress({ done: 0, total: pending.length })
    setSuggestions({})

    const BATCH = 3 // 3 tx × ~2s Haiku = margem segura no limite de 10s Netlify free
    const allSuggestions: ReconciliationSuggestion[] = []

    try {
      for (let i = 0; i < pending.length; i += BATCH) {
        const batch = pending.slice(i, i + BATCH)
        const res = await fetch('/api/reconcile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactions: batch, categories }),
        })

        // Garantir que sempre lemos como texto antes de tentar JSON
        const text = await res.text()
        let data: ReconciliationSuggestion[] = []

        try {
          const parsed = JSON.parse(text)
          if (!res.ok) {
            throw new Error(parsed?.error ?? `Erro ${res.status}: ${res.statusText}`)
          }
          data = Array.isArray(parsed) ? parsed : []
        } catch (parseErr) {
          // A rota retornou HTML (crash) — exibe mensagem útil
          if (!res.ok) {
            throw new Error(`Erro ${res.status} na IA. Verifique se a ANTHROPIC_API_KEY está configurada.`)
          }
          // Se a resposta foi 2xx mas não é JSON válido, pula o batch
          console.warn(`Batch ${i / BATCH + 1}: resposta não-JSON ignorada`)
        }

        allSuggestions.push(...data)
        setProgress({ done: Math.min(i + BATCH, pending.length), total: pending.length })
      }

      const map: Record<string, ReconciliationSuggestion> = {}
      allSuggestions.forEach((s) => { map[s.transaction_id] = s })
      setSuggestions(map)
      setAiRun(true)
      toast.success(`IA categorizou ${allSuggestions.length} de ${pending.length} lançamentos`)
    } catch (err) {
      toast.error('Erro na IA: ' + (err as Error).message)
    }

    setLoadingAI(false)
  }

  async function approveAll() {
    setLoadingApprove(true)
    let ok = 0
    for (const t of pending) {
      const override = overrides[t.id]
      const suggestion = suggestions[t.id]
      const catId = override?.category_id ?? suggestion?.suggested_category_id ?? null
      const desc = override?.description ?? suggestion?.suggested_description ?? t.description

      const { error } = await supabase.from('transactions').update({
        category_id: catId || null,
        description: desc,
        status: 'reconciled',
      }).eq('id', t.id)

      if (!error) ok++
    }

    toast.success(`${ok} lançamentos conciliados!`)
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

  const progressPct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  if (!currentEntity) return (
    <p className="text-muted-foreground text-center py-12">Selecione uma entidade para continuar.</p>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Conciliação</h1>
          <p className="text-sm text-muted-foreground">{pending.length} lançamentos pendentes</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runAI} disabled={loadingAI || pending.length === 0} variant="outline">
            {loadingAI
              ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
              : <Sparkles className="w-4 h-4 mr-2" />
            }
            {loadingAI ? `Categorizando… ${progress.done}/${progress.total}` : 'Categorizar com IA'}
          </Button>
          {aiRun && (
            <Button onClick={approveAll} disabled={loadingApprove}>
              {loadingApprove
                ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                : <Check className="w-4 h-4 mr-2" />
              }
              Aprovar tudo
            </Button>
          )}
        </div>
      </div>

      {/* Barra de progresso */}
      {loadingAI && (
        <div className="space-y-1.5">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground text-right">{progressPct}%</p>
        </div>
      )}

      {/* Lista */}
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
            const selectedCat = categories.find((c) => c.id === effective.category_id)

            return (
              <Card key={t.id}>
                <CardContent className="p-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-xs text-muted-foreground">{formatDate(t.date)}</span>
                        <Badge variant={t.type === 'credit' ? 'default' : 'destructive'} className="text-xs h-4">
                          {t.type === 'credit' ? 'Entrada' : 'Saída'}
                        </Badge>
                        {suggestion && (
                          <Badge variant="outline" className="text-xs h-4 gap-1 text-primary border-primary/30">
                            <Sparkles className="w-2.5 h-2.5" />
                            {suggestion.confidence}%
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium truncate">{t.description}</p>
                      {suggestion && effective.description !== t.description && (
                        <p className="text-xs text-primary truncate">→ {effective.description}</p>
                      )}
                    </div>

                    {/* Valor + Categoria */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`font-bold text-sm ${t.type === 'credit' ? 'text-green-500' : 'text-red-500'}`}>
                        {t.type === 'debit' ? '-' : '+'}{formatCurrency(Number(t.amount))}
                      </span>

                      <DropdownMenu>
                        <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 h-8 text-xs hover:bg-accent transition-colors min-w-32 max-w-48">
                          {selectedCat ? (
                            <>
                              <span
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: selectedCat.color }}
                              />
                              <span className="truncate flex-1 text-left">{selectedCat.name}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground flex-1 text-left">Sem categoria</span>
                          )}
                          <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="max-h-56 overflow-y-auto w-48">
                          <DropdownMenuItem
                            onClick={() => setOverrides((o) => ({ ...o, [t.id]: { ...getEffective(t), category_id: '' } }))}
                          >
                            <span className="text-muted-foreground">Sem categoria</span>
                          </DropdownMenuItem>
                          {categories.map((c) => (
                            <DropdownMenuItem
                              key={c.id}
                              onClick={() => setOverrides((o) => ({ ...o, [t.id]: { ...getEffective(t), category_id: c.id } }))}
                              className="gap-2"
                            >
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                              {c.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
