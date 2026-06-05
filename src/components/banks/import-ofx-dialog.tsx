'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { parseOFX, readOFXFile } from '@/services/ofx'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2, Upload, FileText, CheckCircle2 } from 'lucide-react'
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
  const [preview, setPreview] = useState<{ total: number; credits: number; debits: number } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileSelect(selected: File | null) {
    setFile(selected)
    setPreview(null)
    if (!selected) return

    try {
      const text = await readOFXFile(selected)
      const transactions = parseOFX(text)
      if (transactions.length > 0) {
        const credits = transactions.filter((t) => t.type === 'credit').length
        const debits = transactions.filter((t) => t.type === 'debit').length
        setPreview({ total: transactions.length, credits, debits })
      }
    } catch {
      // preview only — ignore errors here
    }
  }

  async function handleImport() {
    if (!file || !account) return
    setLoading(true)

    try {
      const text = await readOFXFile(file)
      const transactions = parseOFX(text)

      if (transactions.length === 0) {
        toast.error('Nenhuma transação encontrada no arquivo OFX')
        setLoading(false)
        return
      }

      // Insert in batches to avoid payload limits
      const BATCH = 50
      let imported = 0
      let skipped = 0

      for (let i = 0; i < transactions.length; i += BATCH) {
        const batch = transactions.slice(i, i + BATCH)
        const rows = batch.map((t) => ({
          ...t,
          bank_account_id: account.id,
          entity_id: account.entity_id,
          status: 'pending' as const,
        }))

        const { data, error } = await supabase
          .from('transactions')
          .upsert(rows, { onConflict: 'bank_account_id,ofx_id', ignoreDuplicates: true })
          .select('id')

        if (error) throw error
        imported += data?.length ?? 0
        skipped += batch.length - (data?.length ?? 0)
      }

      // Recalculate balance via API
      await fetch('/api/banks/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankAccountId: account.id }),
      })

      const msg = skipped > 0
        ? `${imported} importadas, ${skipped} já existiam`
        : `${imported} transações importadas com sucesso!`
      toast.success(msg)
      onSuccess()
      onOpenChange(false)
      setFile(null)
      setPreview(null)
    } catch (err) {
      toast.error('Erro ao importar: ' + (err as Error).message)
    }
    setLoading(false)
  }

  function handleClose(open: boolean) {
    if (!open) { setFile(null); setPreview(null) }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Importar extrato OFX</DialogTitle>
          <DialogDescription>{account?.name} — {account?.bank_name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
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

          {preview && (
            <div className="rounded-lg bg-muted px-4 py-3 text-sm space-y-1">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                {preview.total} transações encontradas
              </div>
              <div className="flex gap-4 text-muted-foreground pl-6">
                <span className="text-green-600">{preview.credits} entradas</span>
                <span className="text-red-500">{preview.debits} saídas</span>
              </div>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept=".ofx,.OFX"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Cancelar</Button>
          <Button onClick={handleImport} disabled={!file || loading}>
            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
