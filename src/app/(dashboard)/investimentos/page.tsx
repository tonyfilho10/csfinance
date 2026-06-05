'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEntityStore } from '@/store/entity-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/format'
import { TrendingUp, TrendingDown, Wallet, ChevronDown, ChevronUp, PiggyBank } from 'lucide-react'
import type { BankAccount } from '@/types'

// Padrões que identificam transações de investimento no MEMO do BB
const INVESTMENT_PATTERNS = [
  /BB\s*RF\s*CP/i,
  /RF\s*CP\s*Empresa/i,
  /CDB/i,
  /LCI/i,
  /LCA/i,
  /Tesouro/i,
  /Fundo\s*de\s*Investimento/i,
  /Poupança/i,
  /Renda\s*Fixa/i,
  /Aplicação/i,
  /Resgate/i,
]

function isInvestment(description: string, categoryName?: string): boolean {
  if (categoryName === 'Investimento') return true
  return INVESTMENT_PATTERNS.some((p) => p.test(description))
}

interface InvestmentFund {
  name: string          // nome limpo do fundo
  bankName: string
  totalAplicado: number
  totalResgatado: number
  saldo: number
  txCount: number
  lastDate: string
  transactions: Array<{ date: string; description: string; amount: number; type: string }>
}

function cleanFundName(description: string): string {
  // Ex: "0000 13049 345 BB RF CP Empresa Ágil" → "BB RF CP Empresa Ágil"
  const match = description.match(/BB\s*RF\s*CP\s*Empresa\s*\w+/i)
  if (match) return match[0].replace(/\s+/g, ' ').trim()
  const match2 = description.match(/CDB|LCI|LCA|Tesouro|Poupança|Renda Fixa/i)
  if (match2) return match2[0]
  return description.replace(/^\d{4}\s+\d+\s+\d+\s+/, '').trim().slice(0, 40)
}

export default function InvestimentosPage() {
  const supabase = createClient()
  const { currentEntity } = useEntityStore()
  const [funds, setFunds] = useState<InvestmentFund[]>([])
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!currentEntity) { setLoading(false); return }
    setLoading(true)

    const { data: accs } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('entity_id', currentEntity.id)
    setAccounts(accs ?? [])

    // Buscar TODAS as transações com categoria ou descrição de investimento
    const { data: txs } = await supabase
      .from('transactions')
      .select('*, category:categories(name, color), bank_account:bank_accounts(name, bank_name)')
      .eq('entity_id', currentEntity.id)
      .neq('status', 'ignored')
      .order('date', { ascending: true })

    const investmentTxs = (txs ?? []).filter((t) =>
      isInvestment(t.description, t.category?.name)
    )

    // Agrupar por padrão de fundo
    const fundMap: Record<string, InvestmentFund> = {}

    for (const t of investmentTxs) {
      const fundKey = cleanFundName(t.description)
      const bankName = t.bank_account?.name ?? 'Banco desconhecido'
      const key = `${fundKey}::${bankName}`

      if (!fundMap[key]) {
        fundMap[key] = {
          name: fundKey,
          bankName,
          totalAplicado: 0,
          totalResgatado: 0,
          saldo: 0,
          txCount: 0,
          lastDate: t.date,
          transactions: [],
        }
      }

      const fund = fundMap[key]
      const amount = Number(t.amount)

      // Para investimentos no BB:
      // DEBIT do banco = dinheiro SAIU da conta = APLICAÇÃO no fundo
      // CREDIT do banco = dinheiro ENTROU na conta = RESGATE do fundo
      if (t.type === 'debit') {
        fund.totalAplicado += amount
      } else {
        fund.totalResgatado += amount
      }

      fund.txCount++
      fund.lastDate = t.date > fund.lastDate ? t.date : fund.lastDate
      fund.transactions.push({
        date: t.date,
        description: t.description,
        amount,
        type: t.type,
      })
    }

    const result = Object.values(fundMap).map((f) => ({
      ...f,
      saldo: f.totalAplicado - f.totalResgatado,
      transactions: f.transactions.sort((a, b) => b.date.localeCompare(a.date)),
    }))

    result.sort((a, b) => b.saldo - a.saldo)
    setFunds(result)
    setLoading(false)
  }, [currentEntity, supabase])

  useEffect(() => { fetchData() }, [fetchData])

  const totalAplicado = funds.reduce((s, f) => s + f.totalAplicado, 0)
  const totalResgatado = funds.reduce((s, f) => s + f.totalResgatado, 0)
  const totalSaldo = funds.reduce((s, f) => s + f.saldo, 0)

  if (!currentEntity) return (
    <p className="text-muted-foreground text-center py-12">Selecione uma entidade para continuar.</p>
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Investimentos</h1>
        <p className="text-sm text-muted-foreground">
          Aplicações, resgates e saldo por fundo — baseado no histórico de lançamentos
        </p>
      </div>

      {/* Totais consolidados */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total aplicado</span>
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <TrendingDown className="w-3.5 h-3.5 text-primary" />
              </div>
            </div>
            <p className="text-xl font-bold text-primary">{formatCurrency(totalAplicado)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total resgatado</span>
              <div className="w-7 h-7 rounded-full bg-orange-500/10 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
              </div>
            </div>
            <p className="text-xl font-bold text-orange-500">{formatCurrency(totalResgatado)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Saldo nas aplicações</span>
              <div className="w-7 h-7 rounded-full bg-green-500/10 flex items-center justify-center">
                <Wallet className="w-3.5 h-3.5 text-green-500" />
              </div>
            </div>
            <p className={`text-xl font-bold ${totalSaldo >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(totalSaldo)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fundos individuais */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : funds.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <PiggyBank className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhuma aplicação encontrada</p>
          <p className="text-sm">
            Importe um extrato OFX e execute a conciliação com IA para identificar investimentos
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {funds.map((fund) => {
            const key = `${fund.name}::${fund.bankName}`
            const isOpen = expanded === key

            return (
              <Card key={key} className="overflow-hidden">
                <CardHeader
                  className="p-4 cursor-pointer hover:bg-accent/40 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : key)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                      <PiggyBank className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-sm font-semibold">{fund.name}</CardTitle>
                        <Badge variant="outline" className="text-xs">{fund.txCount} mov.</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{fund.bankName} · último em {formatDate(fund.lastDate)}</p>
                    </div>
                    <div className="text-right flex-shrink-0 mr-2">
                      <p className="text-xs text-muted-foreground mb-0.5">Saldo na aplicação</p>
                      <p className={`font-bold ${fund.saldo >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {formatCurrency(fund.saldo)}
                      </p>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  </div>
                </CardHeader>

                {isOpen && (
                  <CardContent className="px-4 pb-4 pt-0 border-t space-y-3">
                    {/* Métricas */}
                    <div className="grid grid-cols-3 gap-2 pt-3">
                      <div className="rounded-lg bg-primary/10 p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Aplicado</p>
                        <p className="font-bold text-primary text-sm">{formatCurrency(fund.totalAplicado)}</p>
                      </div>
                      <div className="rounded-lg bg-orange-500/10 p-3 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Resgatado</p>
                        <p className="font-bold text-orange-500 text-sm">{formatCurrency(fund.totalResgatado)}</p>
                      </div>
                      <div className={`rounded-lg p-3 text-center ${fund.saldo >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                        <p className="text-xs text-muted-foreground mb-1">Saldo</p>
                        <p className={`font-bold text-sm ${fund.saldo >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatCurrency(fund.saldo)}
                        </p>
                      </div>
                    </div>

                    {/* Histórico de movimentações */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Histórico</p>
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {fund.transactions.map((tx, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm py-1 border-b border-border/50 last:border-0">
                            <span className="text-xs text-muted-foreground w-20 flex-shrink-0">{formatDate(tx.date)}</span>
                            <span className="flex-1 truncate text-xs">{tx.description}</span>
                            <span className={`font-semibold text-xs flex-shrink-0 ${tx.type === 'debit' ? 'text-primary' : 'text-orange-500'}`}>
                              {tx.type === 'debit' ? 'Aplic.' : 'Resg.'} {formatCurrency(tx.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
