'use client'

import { useTheme } from './theme-provider'
import { Sun, Moon, Monitor } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  collapsed?: boolean
}

export function ThemeToggle({ collapsed }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const Icon = resolvedTheme === 'dark' ? Moon : Sun

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'
        )}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        {!collapsed && <span>Aparência</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" className="w-36">
        <DropdownMenuItem onClick={() => setTheme('light')} className="gap-2">
          <Sun className="w-4 h-4" />
          <span>Claro</span>
          {theme === 'light' && <span className="ml-auto text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')} className="gap-2">
          <Moon className="w-4 h-4" />
          <span>Escuro</span>
          {theme === 'dark' && <span className="ml-auto text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')} className="gap-2">
          <Monitor className="w-4 h-4" />
          <span>Sistema</span>
          {theme === 'system' && <span className="ml-auto text-primary">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
