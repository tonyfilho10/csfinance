'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { parseOFX, readOFXFile, parseOFXPeriod, type OFXPeriod } from '@/services/ofx'
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
import { Loader2, Upload, FileText, CheckCircle2, CalendarRange, AlertTriangle } from 'lucide-react'
import type { BankAccount } from '@/types'
import { formatDate } from '@/lib/format'

interface ImportOFXDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: BankAccount | null
  onSuccess: () => void
}

export function ImportOFXDialog({ open, onOpenChange, account, onSuccess }: ImportOFXDialogProps) {
  const supabase = createClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<{
    total: number
    credits: number
    debits: number
    period: OFXPeriod | null
    alreadyImported: boolean
    existingCount: number
  } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function checkAlreadyImported(period: OFXPeriod | null, ofxIds: (string | undefined)[]): Promise<{ alreadyImported: boolean; existingCount: number }> {
    if (!account || !period?.start || !period?.end) return { alreadyImported: false, existingCount: 0 }

    // Verifica por ofx_ids (mais preciso)
    const validIds = ofxIds.filter(Boolean) as string[]
    if (validIds.length > 0) {
      const { count } = await supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('bank_account_id', account.id)
        .in('ofx_id', validIds.slice(0, 10)) // amostra dos primeiros 10
      if ((count ?? 0) > 0) {
        const { count: total } = await supabase
          .from('transactions')
          .select('id', { count: 'exact', head: true })
          .eq('bank_account_id', account.id)
          .gte('date', period.start)
          .lte('date', period.end)
        return { alreadyImported: true, existingCount: total ?? 0 }
      }
    }

    // Fallback: verifica por período
    const { count } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('bank_account_id', account.id)
      .gte('date', period.start)
      .lte('date', period.end)

    return { alreadyImported: (count ?? 0) > 0, existingCount: count ?? 0 }
  }

  async function handleFileSelect(selected: File | null) {
    setFile(selected)
    setPreview(null)
    if (!selected) return

    try {
      const text = await readOFXFile(selected)
      const transactions = parseOFX(text)
      const period = parseOFXPeriod(text)

      if (transactions.length > 0) {
        const ofxIds = transactions.map((t) => t.ofx_id)
        const { alreadyImported, existingCount } = await checkAlreadyImported(period, ofxIds)
        setPreview({
          total: transactions.length,
          credits: transactions.filter((t) => t.type === 'credit').length,
          debits: transactions.filter((t) => t.type === 'debit').length,
          period,
          alreadyImported,
          existingCount,
        })
      }
    } catch {
      // preview only
    }
  }

  async function handleImport() {
    if (!file || !account) return
    setLoading(true)

    try {
      const text = await readOFXFile(file)
      const transactions = parseOFX(text)
      const period = parseOFXPeriod(text)

      if (transactions.length === 0) {
        toast.error('Nenhuma transação encontrada no arquivo OFX')
        setLoading(false)
        return
      }

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

      await fetch('/api/banks/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bankAccountId: account.id }),
      })

      const msg = skipped > 0
        ? `${imported} importadas, ${skipped} já existiam`
        : `${imported} transações importadas!`
      toast.success(msg)

      onSuccess()
      onOpenChange(false)
      setFile(null)
      setPreview(null)

      if (period?.start && period?.end) {
        router.push(`/dashboard?de=${period.start}&ate=${period.end}`)
      } else {
        router.push('/dashboard')
      }
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
          {/* Drop zone */}
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

          {/* Preview */}
          {preview && (
            <div className="space-y-2">
              {/* Alerta de período já importado */}
              {preview.alreadyImported && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-sm space-y-1">
                  <div className="flex items-center gap-2 font-medium text-amber-500">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    Período já importado anteriormente
                  </div>
                  <p className="text-muted-foreground text-xs pl-6">
                    Já existem <strong>{preview.existingCount} lançamentos</strong> neste período para esta conta.
                    Duplicatas serão ignoradas automaticamente.
                  </p>
                </div>
              )}

              {/* Contagem */}
              <div className="rounded-lg bg-muted px-4 py-3 space-y-2">
                <div className="flex items-center gap-2 font-medium text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {preview.total} transações encontradas
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground pl-6">
                  <span className="text-green-600 font-medium">{preview.credits} entradas</span>
                  <span className="text-red-500 font-medium">{preview.debits} saídas</span>
                </div>
                {preview.period?.start && preview.period?.end && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pl-6 border-t pt-2">
                    <CalendarRange className="w-3.5 h-3.5 flex-shrink-0 text-primary" />
                    <span>
                      Período:{' '}
                      <span className="font-medium text-foreground">
                        {formatDate(preview.period.start)} a {formatDate(preview.period.end)}
                      </span>
                    </span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground pl-6 border-t pt-2">
                  💡 Após importar, o dashboard abrirá no período do extrato.
                </p>
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
            {preview?.alreadyImported ? 'Importar mesmo assim' : 'Importar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
