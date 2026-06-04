'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Transaction } from '@/types'

interface TransactionDrawerProps {
  open: boolean
  onClose: () => void
  title: string
  transactions: Transaction[]
}

export function TransactionDrawer({ open, onClose, title, transactions }: TransactionDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2 overflow-y-auto max-h-[calc(100vh-6rem)]">
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Nenhum lançamento</p>
          ) : (
            transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border bg-card gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{t.description}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(t.date)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={t.type === 'credit' ? 'default' : 'destructive'} className="text-xs hidden sm:flex">
                    {t.type === 'credit' ? 'Entrada' : 'Saída'}
                  </Badge>
                  <span className={`font-semibold text-sm ${t.type === 'credit' ? 'text-green-600' : 'text-red-500'}`}>
                    {t.type === 'debit' ? '-' : '+'}{formatCurrency(t.amount)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
