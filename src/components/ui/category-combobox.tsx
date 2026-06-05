'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Category } from '@/types'

interface CategoryComboboxProps {
  categories: Category[]
  value: string                        // category id
  onChange: (id: string) => void
  placeholder?: string
  size?: 'sm' | 'default'
  className?: string
}

export function CategoryCombobox({
  categories,
  value,
  onChange,
  placeholder = 'Sem categoria',
  size = 'default',
  className,
}: CategoryComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = categories.find((c) => c.id === value)

  const filtered = query.trim()
    ? categories.filter((c) =>
        c.name.toLowerCase().includes(query.toLowerCase())
      )
    : categories

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focar no input ao abrir
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  function select(id: string) {
    onChange(id)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'w-full flex items-center gap-2 rounded-lg border border-input bg-transparent text-sm transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring',
          size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3',
          open && 'ring-2 ring-ring'
        )}
      >
        {selected ? (
          <>
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: selected.color }}
            />
            <span className="flex-1 text-left truncate">{selected.name}</span>
          </>
        ) : (
          <span className="flex-1 text-left text-muted-foreground truncate">{placeholder}</span>
        )}
        <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {/* Dropdown com busca */}
      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-48 rounded-lg border bg-popover shadow-lg overflow-hidden">
          {/* Campo de busca */}
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar categoria..."
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
              onKeyDown={(e) => {
                if (e.key === 'Escape') { setOpen(false); setQuery('') }
                if (e.key === 'Enter' && filtered.length === 1) select(filtered[0].id)
              }}
            />
          </div>

          {/* Lista filtrada */}
          <div className="max-h-52 overflow-y-auto py-1">
            {/* Opção sem categoria */}
            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-muted-foreground"
              onClick={() => select('')}
            >
              <span className="w-2 h-2 rounded-full bg-muted-foreground/30 flex-shrink-0" />
              <span className="flex-1 text-left">Sem categoria</span>
              {!value && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
            </button>

            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-xs text-center text-muted-foreground">
                Nenhuma categoria encontrada
              </p>
            ) : (
              filtered.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
                  onClick={() => select(cat.id)}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="flex-1 text-left">{cat.name}</span>
                  {cat.id === value && <Check className="w-3.5 h-3.5 flex-shrink-0 text-primary" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
