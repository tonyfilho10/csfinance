'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EntitySelector } from './entity-selector'
import { toast } from 'sonner'

export function Header() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState<{ full_name: string; avatar_url?: string; email: string } | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) setProfile(data)
    }
    load()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    toast.success('Saiu com sucesso')
    router.push('/login')
    router.refresh()
  }

  const initials = profile?.full_name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '??'

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-4 gap-4 flex-shrink-0">
      <EntitySelector />

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 hover:opacity-80 transition-opacity rounded-lg px-2 py-1">
          <Avatar className="w-8 h-8">
            <AvatarImage src={profile?.avatar_url} />
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium hidden sm:block max-w-32 truncate">
            {profile?.full_name ?? '...'}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <div className="px-2 py-1.5 border-b mb-1">
            <p className="text-xs font-medium">{profile?.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
          </div>
          <DropdownMenuItem onClick={() => router.push('/settings')}>
            Configurações
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/admin')}>
            Administração
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} variant="destructive">
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
