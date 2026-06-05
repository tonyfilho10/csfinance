'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, Trash2, ChevronDown } from 'lucide-react'
import { formatCurrency } from '@/lib/format'
import type { Transaction, Category } from '@/types'

interface EditTransactionSheetProps {
  transaction: Transaction | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function EditTransactionSheet({ transaction, open, onClose, onSaved }: EditTransactionSheetProps) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState({
    description: '',
    amount: '',
    date: '',
    category_id: '',
    notes: '',
  })

  useEffect(() => {
    async function loadCats() {
      const { data } = await supabase.from('categories').select('*').order('name')
      setCategories(data ?? [])
    }
    loadCats()
  }, [])

  useEffect(() => {
    if (transaction) {
      setForm({
        description: transaction.description,
        amount: String(transaction.amount),
        date: transaction.date,
        category_id: transaction.category_id ?? '',
        notes: transaction.notes ?? '',
      })
      setConfirmDelete(false)
    }
  }, [transaction])

  async function handleSave() {
    if (!transaction) return
    setSaving(true)
    const { error } = await supabase
      .from('transactions')
      .update({
        description: form.description,
        amount: parseFloat(form.amount.replace(',', '.')),
        date: form.date,
        category_id: form.category_id || null,
        notes: form.notes || null,
      })
      .eq('id', transaction.id)

    if (error) toast.error('Erro ao salvar: ' + error.message)
    else {
      toast.success('Lançamento atualizado!')
      onSaved()
      onClose()
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!transaction) return
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    const { error } = await supabase.from('transactions').delete().eq('id', transaction.id)
    if (error) toast.error('Erro ao excluir: ' + error.message)
    else {
      toast.success('Lançamento excluído')
      onSaved()
      onClose()
    }
    setDeleting(false)
  }

  const selectedCat = categories.find((c) => c.id === form.category_id)

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Editar lançamento</SheetTitle>
          {transaction && (
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={transaction.type === 'credit' ? 'default' : 'destructive'}>
                {transaction.type === 'credit' ? 'Entrada' : 'Saída'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Original: {formatCurrency(Number(transaction.amount))}
              </span>
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <DropdownMenu>
              <DropdownMenuTrigger className="w-full flex items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 h-9 text-sm hover:bg-accent transition-colors">
                {selectedCat ? (
                  <span className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: selectedCat.color }}
                    />
                    {selectedCat.name}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Sem categoria</span>
                )}
                <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 max-h-64 overflow-y-auto">
                <DropdownMenuItem onClick={() => setForm({ ...form, category_id: '' })}>
                  <span className="text-muted-foreground">Sem categoria</span>
                </DropdownMenuItem>
                {categories.map((c) => (
                  <DropdownMenuItem
                    key={c.id}
                    onClick={() => setForm({ ...form, category_id: c.id })}
                    className="gap-2"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                    {c.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-1.5">
            <Label>Observações</Label>
            <Input
              placeholder="Notas opcionais..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        <SheetFooter className="flex-col gap-2 sm:flex-col border-t pt-4">
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Salvar alterações
          </Button>
          <Button
            variant={confirmDelete ? 'destructive' : 'outline'}
            onClick={handleDelete}
            disabled={deleting}
            className="w-full"
          >
            {deleting
              ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
              : <Trash2 className="w-4 h-4 mr-2" />
            }
            {confirmDelete ? 'Confirmar exclusão' : 'Excluir lançamento'}
          </Button>
          {confirmDelete && (
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-muted-foreground hover:underline"
            >
              Cancelar exclusão
            </button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
