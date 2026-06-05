'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEntityStore } from '@/store/entity-store'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, Building2, User } from 'lucide-react'
import type { Entity } from '@/types'

export function EntitySelector() {
  const supabase = createClient()
  const { currentEntity, setCurrentEntity } = useEntityStore()
  const [entities, setEntities] = useState<Entity[]>([])

  useEffect(() => {
    async function fetchEntities() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase.from('entities').select('*').order('name')
      const allowed = data ?? []
      setEntities(allowed)

      // Se a entidade no store não está na lista retornada pelo RLS
      // (outro usuário a possuía e o RLS bloqueou), limpa e usa a primeira disponível
      if (allowed.length > 0) {
        const stillValid = currentEntity
          ? allowed.some((e) => e.id === currentEntity.id)
          : false

        if (!stillValid) {
          setCurrentEntity(allowed[0])
        }
      } else {
        setCurrentEntity(null)
      }
    }
    fetchEntities()
  }, [])

  if (entities.length === 0) return null

  // Usar a entidade do store apenas se ela estiver na lista (segurança extra)
  const safeEntity = currentEntity && entities.some(e => e.id === currentEntity.id)
    ? currentEntity
    : entities[0] ?? null

  const Icon = safeEntity?.type === 'PJ' ? Building2 : User

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-input bg-transparent px-3 h-8 text-sm font-medium hover:bg-accent transition-colors max-w-64">
        <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <span className="truncate flex-1 text-left">
          {safeEntity?.name ?? 'Selecionar entidade'}
        </span>
        {safeEntity && (
          <Badge variant={safeEntity.type === 'PF' ? 'secondary' : 'default'} className="text-xs flex-shrink-0">
            {safeEntity.type}
          </Badge>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {entities.map((entity) => (
          <DropdownMenuItem
            key={entity.id}
            onClick={() => setCurrentEntity(entity)}
            className="gap-2"
          >
            {entity.type === 'PJ'
              ? <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              : <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            }
            <span className="flex-1 truncate">{entity.name}</span>
            <Badge variant={entity.type === 'PF' ? 'secondary' : 'default'} className="text-xs">
              {entity.type}
            </Badge>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
