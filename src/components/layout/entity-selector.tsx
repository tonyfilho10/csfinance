'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEntityStore } from '@/store/entity-store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { Entity } from '@/types'

export function EntitySelector() {
  const supabase = createClient()
  const { currentEntity, setCurrentEntity } = useEntityStore()
  const [entities, setEntities] = useState<Entity[]>([])

  useEffect(() => {
    async function fetchEntities() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('entities')
        .select('*')
        .order('name')

      if (data) {
        setEntities(data)
        if (!currentEntity && data.length > 0) {
          setCurrentEntity(data[0])
        }
      }
    }
    fetchEntities()
  }, [])

  if (entities.length === 0) return null

  return (
    <Select
      value={currentEntity?.id ?? ''}
      onValueChange={(id) => {
        const entity = entities.find((e) => e.id === id)
        if (entity) setCurrentEntity(entity)
      }}
    >
      <SelectTrigger className="w-full sm:w-64">
        <SelectValue placeholder="Selecionar entidade" />
      </SelectTrigger>
      <SelectContent>
        {entities.map((entity) => (
          <SelectItem key={entity.id} value={entity.id}>
            <div className="flex items-center gap-2">
              <span>{entity.name}</span>
              <Badge variant={entity.type === 'PF' ? 'secondary' : 'default'} className="text-xs">
                {entity.type}
              </Badge>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
