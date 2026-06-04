'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const BANK_COLORS = [
  '#6366f1', '#3b82f6', '#22c55e', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4',
]

interface AddBankDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entityId: string
  onSuccess: () => void
}

export function AddBankDialog({ open, onOpenChange, entityId, onSuccess }: AddBankDialogProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '',
    bank_name: '',
    bank_code: '',
    account_number: '',
    agency: '',
    initial_balance: '0',
    color: BANK_COLORS[0],
  })

  function field(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const balance = parseFloat(form.initial_balance.replace(',', '.')) || 0
    const { error } = await supabase.from('bank_accounts').insert({
      entity_id: entityId,
      name: form.name,
      bank_name: form.bank_name,
      bank_code: form.bank_code || null,
      account_number: form.account_number || null,
      agency: form.agency || null,
      initial_balance: balance,
      current_balance: balance,
      color: form.color,
    })
    if (error) {
      toast.error('Erro ao criar conta: ' + error.message)
    } else {
      toast.success('Conta bancária criada!')
      onSuccess()
      onOpenChange(false)
      setForm({ name: '', bank_name: '', bank_code: '', account_number: '', agency: '', initial_balance: '0', color: BANK_COLORS[0] })
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nova conta bancária</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome da conta *</Label>
            <Input placeholder="Ex: Nubank Pessoal" value={form.name} onChange={field('name')} required />
          </div>
          <div className="space-y-1.5">
            <Label>Banco *</Label>
            <Input placeholder="Ex: Nubank" value={form.bank_name} onChange={field('bank_name')} required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Agência</Label>
              <Input placeholder="0001" value={form.agency} onChange={field('agency')} />
            </div>
            <div className="space-y-1.5">
              <Label>Conta</Label>
              <Input placeholder="12345-6" value={form.account_number} onChange={field('account_number')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Saldo inicial (R$) *</Label>
            <Input
              placeholder="0,00"
              value={form.initial_balance}
              onChange={field('initial_balance')}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cor</Label>
            <div className="flex gap-2 flex-wrap">
              {BANK_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color }))}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{
                    backgroundColor: color,
                    outline: form.color === color ? `3px solid ${color}` : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Criar conta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
