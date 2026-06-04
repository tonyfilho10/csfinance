'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { parseOFX } from '@/services/ofx'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2, Upload, FileText } from 'lucide-react'
import type { BankAccount } from '@/types'

interface ImportOFXDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: BankAccount | null
  onSuccess: () => void
}

export function ImportOFXDialog({ open, onOpenChange, account, onSuccess }: ImportOFXDialogProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleImport() {
    if (!file || !account) return
    setLoading(true)

    try {
      const text = await file.text()
      const transactions = parseOFX(text)

      if (transactions.length === 0) {
        toast.error('Nenhuma transação encontrada no arquivo OFX')
        setLoading(false)
        return
      }

      const rows = transactions.map((t) => ({
        ...t,
        bank_account_id: account.id,
        entity_id: account.entity_id,
        status: 'pending' as const,
      }))

      const { error } = await supabase
        .from('transactions')
        .upsert(rows, { onConflict: 'bank_account_id,ofx_id', ignoreDuplicates: true })

      if (error) throw error

      toast.success(`${transactions.length} transações importadas com sucesso!`)
      onSuccess()
      onOpenChange(false)
      setFile(null)
    } catch (err) {
      toast.error('Erro ao importar OFX: ' + (err as Error).message)
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Importar extrato OFX</DialogTitle>
          <DialogDescription>
            {account?.name} — {account?.bank_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-accent transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            {file ? (
              <div className="flex flex-col items-center gap-2">
                <FileText className="w-8 h-8 text-primary" />
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload className="w-8 h-8" />
                <p className="text-sm">Clique para selecionar o arquivo OFX</p>
              </div>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".ofx,.OFX"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={!file || loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
