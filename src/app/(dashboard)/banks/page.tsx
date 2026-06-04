'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEntityStore } from '@/store/entity-store'
import { BankAccountCard } from '@/components/banks/bank-account-card'
import { AddBankDialog } from '@/components/banks/add-bank-dialog'
import { ImportOFXDialog } from '@/components/banks/import-ofx-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { BankAccount } from '@/types'
import { EntitySelector } from '@/components/layout/entity-selector'

export default function BanksPage() {
  const supabase = createClient()
  const { currentEntity } = useEntityStore()
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [importAccount, setImportAccount] = useState<BankAccount | null>(null)

  const fetchAccounts = useCallback(async () => {
    if (!currentEntity) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('entity_id', currentEntity.id)
      .order('created_at')
    setAccounts(data ?? [])
    setLoading(false)
  }, [currentEntity, supabase])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  if (!currentEntity) {
    return (
      <div className="space-y-4">
        <EntitySelector />
        <p className="text-muted-foreground text-center py-12">Selecione uma entidade para continuar.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contas bancárias</h1>
          <p className="text-sm text-muted-foreground">{currentEntity.name}</p>
        </div>
        <Button onClick={() => setAddOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Nova conta
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium mb-2">Nenhuma conta cadastrada</p>
          <p className="text-sm mb-4">Adicione sua primeira conta bancária para começar</p>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Adicionar conta
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account) => (
            <BankAccountCard
              key={account.id}
              account={account}
              onImportOFX={setImportAccount}
              onEdit={() => {}}
            />
          ))}
        </div>
      )}

      <AddBankDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        entityId={currentEntity.id}
        onSuccess={fetchAccounts}
      />
      <ImportOFXDialog
        open={!!importAccount}
        onOpenChange={(o) => !o && setImportAccount(null)}
        account={importAccount}
        onSuccess={fetchAccounts}
      />
    </div>
  )
}
