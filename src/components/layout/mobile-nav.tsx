'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Building2, ArrowLeftRight, GitMerge, Settings } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/banks', label: 'Contas', icon: Building2 },
  { href: '/transactions', label: 'Lançamentos', icon: ArrowLeftRight },
  { href: '/reconciliation', label: 'Conciliação', icon: GitMerge },
  { href: '/settings', label: 'Config.', icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t flex md:hidden">
      {navItems.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            'flex flex-1 flex-col items-center justify-center py-2 text-xs font-medium gap-1 transition-colors',
            pathname === href || pathname.startsWith(href + '/')
              ? 'text-primary'
              : 'text-muted-foreground'
          )}
        >
          <Icon className="w-5 h-5" />
          {label}
        </Link>
      ))}
    </nav>
  )
}
