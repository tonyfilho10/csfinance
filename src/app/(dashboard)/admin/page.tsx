'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEntityStore } from '@/store/entity-store'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, UserPlus, Users, Building2, User } from 'lucide-react'

interface Member {
  id: string
  role: string
  accepted_at: string | null
  profile: { full_name: string; email: string; avatar_url?: string }
}

export default function AdminPage() {
  const supabase = createClient()
  const { currentEntity } = useEntityStore()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' })

  // PF user creation
  const [creatingPF, setCreatingPF] = useState(false)
  const [pfForm, setPfForm] = useState({ full_name: '', email: '', password: '', document: '' })

  // PJ entity creation
  const [creatingPJ, setCreatingPJ] = useState(false)
  const [pjForm, setPjForm] = useState({ name: '', document: '', admin_email: '' })

  async function fetchMembers() {
    if (!currentEntity) return
    setLoading(true)
    const { data } = await supabase
      .from('entity_members')
      .select('*, profile:profiles(full_name, email, avatar_url)')
      .eq('entity_id', currentEntity.id)
    setMembers((data as any[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchMembers() }, [currentEntity])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    // Invite flow: find user by email, add to entity_members
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', inviteForm.email)
      .single()

    if (!profile) {
      toast.error('Usuário não encontrado. Peça para ele criar uma conta primeiro.')
      setInviting(false)
      return
    }

    const { error } = await supabase.from('entity_members').insert({
      entity_id: currentEntity!.id,
      user_id: profile.id,
      role: inviteForm.role,
      accepted_at: new Date().toISOString(),
    })

    if (error) toast.error('Erro ao adicionar membro: ' + error.message)
    else {
      toast.success('Membro adicionado!')
      setInviteForm({ email: '', role: 'member' })
      fetchMembers()
    }
    setInviting(false)
  }

  async function handleCreatePFUser(e: React.FormEvent) {
    e.preventDefault()
    setCreatingPF(true)

    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: pfForm.email,
        password: pfForm.password,
        full_name: pfForm.full_name,
        entity_type: 'PF',
        document: pfForm.document,
      }),
    })

    const result = await res.json()
    if (!res.ok) toast.error(result.error ?? 'Erro ao criar usuário')
    else {
      toast.success('Usuário PF criado com sucesso!')
      setPfForm({ full_name: '', email: '', password: '', document: '' })
    }
    setCreatingPF(false)
  }

  async function handleCreatePJEntity(e: React.FormEvent) {
    e.preventDefault()
    setCreatingPJ(true)

    const res = await fetch('/api/admin/create-entity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pjForm),
    })

    const result = await res.json()
    if (!res.ok) toast.error(result.error ?? 'Erro ao criar entidade PJ')
    else {
      toast.success('Entidade PJ criada!')
      setPjForm({ name: '', document: '', admin_email: '' })
    }
    setCreatingPJ(false)
  }

  const roleLabels: Record<string, string> = { owner: 'Proprietário', admin: 'Admin', member: 'Membro' }
  const roleVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
    owner: 'default',
    admin: 'secondary',
    member: 'outline',
  }

  if (!currentEntity) {
    return <p className="text-muted-foreground text-center py-12">Selecione uma entidade para continuar.</p>
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Administração</h1>
        <p className="text-sm text-muted-foreground">{currentEntity.name}</p>
      </div>

      <Tabs defaultValue="members">
        <TabsList className="w-full">
          <TabsTrigger value="members" className="flex-1 gap-2">
            <Users className="w-4 h-4" /> Membros
          </TabsTrigger>
          <TabsTrigger value="create-pf" className="flex-1 gap-2">
            <User className="w-4 h-4" /> Criar PF
          </TabsTrigger>
          <TabsTrigger value="create-pj" className="flex-1 gap-2">
            <Building2 className="w-4 h-4" /> Criar PJ
          </TabsTrigger>
        </TabsList>

        {/* Members tab */}
        <TabsContent value="members" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Convidar membro</CardTitle>
              <CardDescription>Adicione colaboradores a esta entidade</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInvite} className="flex gap-2 flex-wrap">
                <Input
                  placeholder="email@exemplo.com"
                  type="email"
                  className="flex-1 min-w-48"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  required
                />
                <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v ?? 'member' })}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="member">Membro</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="submit" disabled={inviting}>
                  {inviting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  Convidar
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {loading ? (
              [...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)
            ) : members.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">Nenhum membro cadastrado</p>
            ) : (
              members.map((m) => {
                const initials = m.profile.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
                return (
                  <Card key={m.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9">
                          <AvatarImage src={m.profile.avatar_url} />
                          <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{m.profile.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{m.profile.email}</p>
                        </div>
                        <Badge variant={roleVariant[m.role]}>{roleLabels[m.role]}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </TabsContent>

        {/* Create PF */}
        <TabsContent value="create-pf" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Criar usuário Pessoa Física</CardTitle>
              <CardDescription>Cria uma conta de acesso e entidade PF automaticamente</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreatePFUser} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Nome completo *</Label>
                  <Input placeholder="João Silva" value={pfForm.full_name} onChange={(e) => setPfForm({ ...pfForm, full_name: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>E-mail *</Label>
                  <Input type="email" placeholder="joao@email.com" value={pfForm.email} onChange={(e) => setPfForm({ ...pfForm, email: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>CPF *</Label>
                  <Input placeholder="000.000.000-00" value={pfForm.document} onChange={(e) => setPfForm({ ...pfForm, document: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Senha inicial *</Label>
                  <Input type="password" placeholder="Mínimo 8 caracteres" value={pfForm.password} onChange={(e) => setPfForm({ ...pfForm, password: e.target.value })} required minLength={8} />
                </div>
                <Button type="submit" disabled={creatingPF}>
                  {creatingPF ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  Criar usuário PF
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create PJ */}
        <TabsContent value="create-pj" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Criar entidade Pessoa Jurídica</CardTitle>
              <CardDescription>Cria uma empresa para gestão financeira</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreatePJEntity} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Razão social *</Label>
                  <Input placeholder="Empresa XYZ Ltda." value={pjForm.name} onChange={(e) => setPjForm({ ...pjForm, name: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>CNPJ *</Label>
                  <Input placeholder="00.000.000/0001-00" value={pjForm.document} onChange={(e) => setPjForm({ ...pjForm, document: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>E-mail do administrador *</Label>
                  <Input type="email" placeholder="admin@empresa.com" value={pjForm.admin_email} onChange={(e) => setPjForm({ ...pjForm, admin_email: e.target.value })} required />
                </div>
                <Button type="submit" disabled={creatingPJ}>
                  {creatingPJ ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Building2 className="w-4 h-4 mr-2" />}
                  Criar entidade PJ
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
