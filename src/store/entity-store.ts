import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Entity } from '@/types'

interface EntityStore {
  currentEntity: Entity | null
  setCurrentEntity: (entity: Entity | null) => void
}

export const useEntityStore = create<EntityStore>()(
  persist(
    (set) => ({
      currentEntity: null,
      setCurrentEntity: (entity) => set({ currentEntity: entity }),
    }),
    { name: 'csfinance-entity' }
  )
)
