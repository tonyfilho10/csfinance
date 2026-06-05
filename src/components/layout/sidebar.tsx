'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useSidebarStore } from '@/store/sidebar-store'
import { ThemeToggle } from './theme-toggle'
import {
  LayoutDashboard,
  Building2,
  ArrowLeftRight,
  GitMerge,
  Settings,
  LogOut,
  TrendingUp,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  BarChart3,
  PiggyBank,
} from 'lucide-react'
import { toast } from 'sonner'

const navItems = [
  { href: '/dashboard',       label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/investimentos',   label: 'Investimentos',  icon: PiggyBank },
  { href: '/banks',          label: 'Contas',          icon: Building2 },
  { href: '/transactions',   label: 'Lançamentos',     icon: ArrowLeftRight },
  { href: '/reconciliation', label: 'Conciliação',     icon: GitMerge },
  { href: '/admin',          label: 'Administração',   icon: Users },
  { href: '/settings',       label: 'Configurações',   icon: Settings },
]

function TooltipWrapper({
  label, collapsed, children,
}: { label: string; collapsed: boolean; children: React.ReactNode }) {
  if (!collapsed) return <>{children}</>
  return (
    <div className="relative group/tip">
      {children}
      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 hidden group-hover/tip:block pointer-events-none">
        <div className="bg-popover text-popover-foreground text-xs font-medium px-2.5 py-1.5 rounded-md shadow-lg border whitespace-nowrap">
          {label}
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { collapsed, toggle } = useSidebarStore()

  async function handleSignOut() {
    await supabase.auth.signOut()
    toast.success('Saiu com sucesso')
    router.push('/login')
    router.refresh()
  }

  const activeClass = 'bg-sidebar-primary text-sidebar-primary-foreground'
  const inactiveClass = 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'

  return (
    <aside
      className={cn(
        'flex flex-col min-h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo + toggle */}
      <div className={cn(
        'flex items-center h-14 border-b border-sidebar-border px-3',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        {collapsed ? (
          <Link href="/dashboard" className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-sidebar-primary-foreground" />
          </Link>
        ) : (
          <>
            <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-sidebar-primary-foreground" />
              </div>
              <span className="font-bold text-lg text-sidebar-foreground tracking-wide truncate">
                CSFinance
              </span>
            </Link>
            <button
              onClick={toggle}
              className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors flex-shrink-0"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {collapsed && (
        <div className="flex justify-center py-2 border-b border-sidebar-border">
          <button
            onClick={toggle}
            className="p-1.5 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <TooltipWrapper key={href} label={label} collapsed={collapsed}>
              <Link
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors',
                  collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5',
                  active ? activeClass : inactiveClass
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            </TooltipWrapper>
          )
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-2 pb-3 space-y-0.5 border-t border-sidebar-border pt-3">
        <ThemeToggle collapsed={collapsed} />

        <TooltipWrapper label="Sair" collapsed={collapsed}>
          <button
            onClick={handleSignOut}
            className={cn(
              'w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-colors text-sidebar-foreground/70 hover:bg-red-500/20 hover:text-red-400',
              collapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'
            )}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </TooltipWrapper>
      </div>
    </aside>
  )
}
