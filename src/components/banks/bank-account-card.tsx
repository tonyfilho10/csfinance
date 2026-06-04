'use client'

import { Building2, MoreVertical, Upload } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { BankAccount } from '@/types'
import { formatCurrency } from '@/lib/format'

interface BankAccountCardProps {
  account: BankAccount
  onImportOFX: (account: BankAccount) => void
  onEdit: (account: BankAccount) => void
}

export function BankAccountCard({ account, onImportOFX, onEdit }: BankAccountCardProps) {
  const isPositive = account.current_balance >= 0

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: account.color + '20', color: account.color }}
            >
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{account.name}</p>
              <p className="text-sm text-muted-foreground truncate">{account.bank_name}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex-shrink-0 -mr-2 rounded-md p-1.5 hover:bg-accent transition-colors">
              <MoreVertical className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onImportOFX(account)}>
                <Upload className="w-4 h-4 mr-2" />
                Importar OFX
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(account)}>
                Editar conta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-1">Saldo atual</p>
          <p className={`text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
            {formatCurrency(account.current_balance)}
          </p>
        </div>

        {account.account_number && (
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Ag {account.agency} • CC {account.account_number}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
