'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEntityStore } from '@/store/entity-store'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import {
  Loader2, UserPlus, Building2, Users, Search,
  User, CheckCircle2, AlertCircle, ChevronDown, Trash2,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// Aba 1: Criar Pessoa Física
// ─────────────────────────────────────────────────────────────────────────────
function TabCriarPF() {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ full_name: '', cpf: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!form.full_name.trim()) e.full_name = 'Nome obrigatório'
    if (!form.cpf.replace(/\D/g, '').match(/^\d{11}$/)) e.cpf = 'CPF inválido (11 dígitos)'
    if (!form.email.includes('@')) e.email = 'E-mail inválido'
    if (form.password.length < 8) e.password = 'Mínimo 8 caracteres'
    if (form.password !== form.confirm) e.confirm = 'Senhas não coincidem'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)

    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        entity_type: 'PF',
        document: form.cpf.replace(/\D/g, ''),
      }),
    })
    const result = await res.json()

    if (!res.ok) toast.error(result.error ?? 'Erro ao criar usuário')
    else {
      toast.success(`Usuário PF "${form.full_name}" criado com sucesso!`)
      setForm({ full_name: '', cpf: '', email: '', password: '', confirm: '' })
      setErrors({})
    }
    setLoading(false)
  }

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (ev: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: ev.target.value })),
  })

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
      {/* Dados pessoais */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Dados pessoais</span>
        </div>

        <div className="space-y-1.5">
          <Label>Nome completo <span className="text-destructive">*</span></Label>
          <Input placeholder="João da Silva" {...field('full_name')} />
          {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>CPF <span className="text-destructive">*</span></Label>
          <Input placeholder="000.000.000-00" maxLength={14} {...field('cpf')} />
          {errors.cpf && <p className="text-xs text-destructive">{errors.cpf}</p>}
        </div>
      </div>

      <Separator />

      {/* Acesso ao sistema */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Acesso ao sistema</span>
        </div>

        <div className="space-y-1.5">
          <Label>E-mail <span className="text-destructive">*</span></Label>
          <Input type="email" placeholder="joao@email.com" {...field('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Senha <span className="text-destructive">*</span></Label>
            <Input type="password" placeholder="Mínimo 8 caracteres" {...field('password')} />
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Confirmar senha <span className="text-destructive">*</span></Label>
            <Input type="password" placeholder="••••••••" {...field('confirm')} />
            {errors.confirm && <p className="text-xs text-destructive">{errors.confirm}</p>}
          </div>
        </div>
      </div>

      <div className="pt-1 text-xs text-muted-foreground bg-muted rounded-lg p-3">
        <strong>O que será criado:</strong> conta de acesso + entidade Pessoa Física vinculada ao CPF informado.
        O usuário receberá acesso imediato ao sistema.
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
        Criar usuário PF
      </Button>
    </form>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Aba 2: Criar Pessoa Jurídica
// ─────────────────────────────────────────────────────────────────────────────
function TabCriarPJ() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [form, setForm] = useState({ razao_social: '', cnpj: '', admin_email: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [adminUser, setAdminUser] = useState<{ id: string; full_name: string; email: string; avatar_url?: string } | null>(null)
  const [adminNotFound, setAdminNotFound] = useState(false)

  async function searchAdmin() {
    if (!form.admin_email.includes('@')) return
    setSearching(true)
    setAdminUser(null)
    setAdminNotFound(false)

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .eq('email', form.admin_email.toLowerCase().trim())
      .single()

    if (data) setAdminUser(data)
    else setAdminNotFound(true)
    setSearching(false)
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.razao_social.trim()) e.razao_social = 'Razão social obrigatória'
    if (!form.cnpj.replace(/\D/g, '').match(/^\d{14}$/)) e.cnpj = 'CNPJ inválido (14 dígitos)'
    if (!adminUser) e.admin_email = 'Busque e confirme o usuário administrador'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)

    const res = await fetch('/api/admin/create-entity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.razao_social,
        document: form.cnpj.replace(/\D/g, ''),
        admin_email: adminUser!.email,
      }),
    })
    const result = await res.json()

    if (!res.ok) toast.error(result.error ?? 'Erro ao criar empresa')
    else {
      toast.success(`Empresa "${form.razao_social}" criada com sucesso!`)
      setForm({ razao_social: '', cnpj: '', admin_email: '' })
      setAdminUser(null)
      setErrors({})
    }
    setLoading(false)
  }

  const initials = adminUser?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-md">
      {/* Dados da empresa */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Dados da empresa</span>
        </div>

        <div className="space-y-1.5">
          <Label>Razão social <span className="text-destructive">*</span></Label>
          <Input
            placeholder="Empresa XYZ Ltda."
            value={form.razao_social}
            onChange={(e) => setForm((f) => ({ ...f, razao_social: e.target.value }))}
          />
          {errors.razao_social && <p className="text-xs text-destructive">{errors.razao_social}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>CNPJ <span className="text-destructive">*</span></Label>
          <Input
            placeholder="00.000.000/0001-00"
            maxLength={18}
            value={form.cnpj}
            onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))}
          />
          {errors.cnpj && <p className="text-xs text-destructive">{errors.cnpj}</p>}
        </div>
      </div>

      <Separator />

      {/* Administrador */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Administrador</span>
        </div>
        <p className="text-xs text-muted-foreground -mt-1">
          O administrador deve ter uma conta criada no sistema. Busque pelo e-mail.
        </p>

        <div className="space-y-1.5">
          <Label>E-mail do administrador <span className="text-destructive">*</span></Label>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="admin@empresa.com"
              value={form.admin_email}
              onChange={(e) => {
                setForm((f) => ({ ...f, admin_email: e.target.value }))
                setAdminUser(null)
                setAdminNotFound(false)
              }}
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={searchAdmin} disabled={searching}>
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
          {errors.admin_email && <p className="text-xs text-destructive">{errors.admin_email}</p>}
        </div>

        {/* Resultado da busca */}
        {adminUser && (
          <div className="flex items-center gap-3 rounded-lg bg-green-500/10 border border-green-500/30 p-3">
            <Avatar className="w-9 h-9 flex-shrink-0">
              <AvatarImage src={adminUser.avatar_url} />
              <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{adminUser.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{adminUser.email}</p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 ml-auto" />
          </div>
        )}
        {adminNotFound && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Usuário não encontrado. Crie a conta PF primeiro.
          </div>
        )}
      </div>

      <div className="pt-1 text-xs text-muted-foreground bg-muted rounded-lg p-3">
        <strong>O que será criado:</strong> entidade Pessoa Jurídica com o usuário encontrado como proprietário e administrador.
      </div>

      <Button type="submit" disabled={loading || !adminUser} className="w-full">
        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Building2 className="w-4 h-4 mr-2" />}
        Criar empresa PJ
      </Button>
    </form>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Aba 3: Membros
// ─────────────────────────────────────────────────────────────────────────────
function TabMembros() {
  const supabase = createClient()
  const { currentEntity } = useEntityStore()
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [inviting, setInviting] = useState(false)
  const [searchResult, setSearchResult] = useState<{ id: string; full_name: string; email: string } | null>(null)
  const [searching, setSearching] = useState(false)
  const [notFound, setNotFound] = useState(false)

  async function fetchMembers() {
    if (!currentEntity) return
    setLoading(true)
    const { data } = await supabase
      .from('entity_members')
      .select('*, profile:profiles(id, full_name, email, avatar_url)')
      .eq('entity_id', currentEntity.id)
      .order('invited_at')
    setMembers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchMembers() }, [currentEntity])

  async function searchUser() {
    setSearchResult(null)
    setNotFound(false)
    setSearching(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('email', inviteEmail.toLowerCase().trim())
      .single()
    if (data) setSearchResult(data)
    else setNotFound(true)
    setSearching(false)
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!searchResult || !currentEntity) return
    setInviting(true)

    const { error } = await supabase.from('entity_members').insert({
      entity_id: currentEntity.id,
      user_id: searchResult.id,
      role: inviteRole,
      accepted_at: new Date().toISOString(),
    })

    if (error) toast.error(error.message.includes('duplicate') ? 'Usuário já é membro desta empresa' : error.message)
    else {
      toast.success(`${searchResult.full_name} adicionado como ${inviteRole === 'admin' ? 'Admin' : 'Membro'}!`)
      setInviteEmail('')
      setSearchResult(null)
      fetchMembers()
    }
    setInviting(false)
  }

  async function handleRemove(memberId: string, name: string) {
    const { error } = await supabase.from('entity_members').delete().eq('id', memberId)
    if (error) toast.error('Erro ao remover membro')
    else {
      toast.success(`${name} removido`)
      fetchMembers()
    }
  }

  const roleLabels: Record<string, string> = { owner: 'Proprietário', admin: 'Admin', member: 'Membro' }
  const roleVariants: Record<string, 'default' | 'secondary' | 'outline'> = {
    owner: 'default', admin: 'secondary', member: 'outline',
  }

  if (!currentEntity) return (
    <p className="text-muted-foreground text-sm py-4">Selecione uma entidade PJ no seletor acima.</p>
  )
  if (currentEntity.type !== 'PJ') return (
    <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
      Membros são gerenciados apenas em entidades <strong>Pessoa Jurídica</strong>. A entidade atual é PF.
    </div>
  )

  return (
    <div className="space-y-5 max-w-lg">
      {/* Convidar membro */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Adicionar membro</span>
        </div>

        <form onSubmit={handleInvite} className="space-y-3">
          <div className="space-y-1.5">
            <Label>E-mail do usuário</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="usuario@email.com"
                value={inviteEmail}
                onChange={(e) => { setInviteEmail(e.target.value); setSearchResult(null); setNotFound(false) }}
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={searchUser} disabled={searching || !inviteEmail.includes('@')}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {searchResult && (
            <div className="flex items-center gap-3 rounded-lg bg-green-500/10 border border-green-500/30 p-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs text-primary-foreground font-semibold flex-shrink-0">
                {searchResult.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{searchResult.full_name}</p>
                <p className="text-xs text-muted-foreground">{searchResult.email}</p>
              </div>
            </div>
          )}

          {notFound && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-sm text-amber-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              Usuário não encontrado. Crie a conta PF primeiro.
            </div>
          )}

          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg border border-input bg-transparent px-3 h-9 text-sm font-medium hover:bg-accent transition-colors">
                {inviteRole === 'admin' ? 'Admin' : 'Membro'}
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setInviteRole('admin')}>
                  <div>
                    <p className="font-medium">Admin</p>
                    <p className="text-xs text-muted-foreground">Pode gerenciar membros e lançamentos</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInviteRole('member')}>
                  <div>
                    <p className="font-medium">Membro</p>
                    <p className="text-xs text-muted-foreground">Pode visualizar e lançar, sem gerenciar</p>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button type="submit" disabled={!searchResult || inviting} className="flex-1">
              {inviting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Adicionar
            </Button>
          </div>
        </form>
      </div>

      <Separator />

      {/* Lista de membros */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Membros atuais — {currentEntity.name}
          </span>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />)}
          </div>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum membro cadastrado</p>
        ) : (
          <div className="space-y-2">
            {members.map((m) => {
              const initials = m.profile?.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
              return (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <Avatar className="w-9 h-9 flex-shrink-0">
                    <AvatarImage src={m.profile?.avatar_url} />
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{m.profile?.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.profile?.email}</p>
                  </div>
                  <Badge variant={roleVariants[m.role]} className="flex-shrink-0">{roleLabels[m.role]}</Badge>
                  {m.role !== 'owner' && (
                    <button
                      onClick={() => handleRemove(m.id, m.profile?.full_name)}
                      className="p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Aba 4: Usuários
// ─────────────────────────────────────────────────────────────────────────────
function TabUsuarios() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        // Usa rota API com Service Role Key para ver todos os usuários (bypassa RLS)
        const res = await fetch('/api/admin/users')
        if (res.ok) {
          const data = await res.json()
          setUsers(data)
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 h-9 rounded-lg border border-input bg-transparent text-sm outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
        />
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} usuário{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</p>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum usuário encontrado</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => {
            const initials = u.full_name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() ?? '??'
            return (
              <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarImage src={u.avatar_url} />
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{u.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>

                <div className="flex flex-col gap-1 items-end flex-shrink-0">
                  {u.entities.length === 0 ? (
                    <Badge variant="outline" className="text-xs text-muted-foreground">Sem entidade</Badge>
                  ) : (
                    u.entities.map((e: any) => (
                      <Badge
                        key={e.id}
                        variant={e.type === 'PJ' ? 'default' : 'secondary'}
                        className="text-xs gap-1"
                      >
                        {e.type === 'PJ' ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {e.name.split(' ').slice(0, 2).join(' ')}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Administração</h1>
        <p className="text-sm text-muted-foreground">Gestão de usuários e empresas do sistema</p>
      </div>

      <Tabs defaultValue="usuarios">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="usuarios" className="gap-1.5">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Usuários</span>
          </TabsTrigger>
          <TabsTrigger value="pf" className="gap-1.5">
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Criar</span> PF
          </TabsTrigger>
          <TabsTrigger value="pj" className="gap-1.5">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Criar</span> PJ
          </TabsTrigger>
          <TabsTrigger value="membros" className="gap-1.5">
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Membros</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="usuarios">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Usuários cadastrados</CardTitle>
                <CardDescription>
                  Todos os usuários do sistema com suas entidades vinculadas (PF e PJ).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TabUsuarios />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pf">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Criar usuário Pessoa Física</CardTitle>
                <CardDescription>
                  Cria uma conta de acesso ao sistema e vincula automaticamente uma entidade PF com o CPF informado.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TabCriarPF />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pj">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Criar empresa Pessoa Jurídica</CardTitle>
                <CardDescription>
                  Cria uma entidade PJ e vincula um usuário já existente como administrador e proprietário.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TabCriarPJ />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="membros">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Gerenciar membros</CardTitle>
                <CardDescription>
                  Adicione ou remova colaboradores da empresa selecionada. Defina o nível de acesso de cada um.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TabMembros />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
