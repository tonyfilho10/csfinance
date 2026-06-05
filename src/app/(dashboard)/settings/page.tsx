'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Plus, Camera } from 'lucide-react'

export default function SettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingEntity, setSavingEntity] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const [profile, setProfile] = useState({ full_name: '', email: '', avatar_url: '' })
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' })
  const [newEntity, setNewEntity] = useState({ name: '', type: 'PF', document: '' })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) setProfile({ full_name: data.full_name, email: data.email, avatar_url: data.avatar_url ?? '' })
    }
    load()
  }, [])

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const ext = file.name.split('.').pop()
    const path = `avatars/${user.id}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('profiles')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      toast.error('Erro ao fazer upload: ' + uploadError.message)
      setUploadingAvatar(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('profiles').getPublicUrl(path)

    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
    setProfile((p) => ({ ...p, avatar_url: publicUrl }))
    toast.success('Foto de perfil atualizada!')
    setUploadingAvatar(false)
    router.refresh()
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('profiles').update({ full_name: profile.full_name }).eq('id', user.id)

    if (profile.email !== user.email) {
      const { error: emailError } = await supabase.auth.updateUser({ email: profile.email })
      if (emailError) {
        toast.error('Erro ao atualizar e-mail: ' + emailError.message)
        setSavingProfile(false)
        return
      }
      toast.info('Confirme o novo e-mail na sua caixa de entrada')
    }

    if (error) toast.error('Erro ao salvar: ' + error.message)
    else toast.success('Perfil atualizado!')
    setSavingProfile(false)
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    if (passwords.next !== passwords.confirm) {
      toast.error('As senhas não coincidem')
      return
    }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: passwords.next })
    if (error) toast.error('Erro: ' + error.message)
    else {
      toast.success('Senha alterada com sucesso!')
      setPasswords({ current: '', next: '', confirm: '' })
    }
    setSavingPassword(false)
  }

  async function createEntity(e: React.FormEvent) {
    e.preventDefault()
    setSavingEntity(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('entities').insert({
      name: newEntity.name,
      type: newEntity.type,
      document: newEntity.document,
      owner_id: user.id,
    })
    if (error) toast.error('Erro ao criar entidade: ' + error.message)
    else {
      toast.success('Entidade criada!')
      setNewEntity({ name: '', type: 'PF', document: '' })
      router.refresh()
    }
    setSavingEntity(false)
  }

  const initials = profile.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold">Configurações</h1>

      {/* Avatar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Foto de perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-16 h-16">
                <AvatarImage src={profile.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">{initials || '??'}</AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-md hover:opacity-90 transition-opacity"
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? <Loader2 className="w-3 h-3 text-white animate-spin" /> : <Camera className="w-3 h-3 text-white" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
            <div>
              <p className="text-sm font-medium">{profile.full_name}</p>
              <p className="text-xs text-muted-foreground">{profile.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Perfil */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações pessoais</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveProfile} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome completo</Label>
              <Input
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                required
              />
            </div>
            <Button type="submit" disabled={savingProfile}>
              {savingProfile && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Salvar informações
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Senha */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alterar senha</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={savePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nova senha</Label>
              <Input
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={passwords.next}
                onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Confirmar nova senha</Label>
              <Input
                type="password"
                placeholder="••••••••"
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                required
              />
            </div>
            <Button type="submit" variant="outline" disabled={savingPassword}>
              {savingPassword && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Alterar senha
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Nova entidade */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova entidade</CardTitle>
          <CardDescription>Pessoa Física (PF) ou Jurídica (PJ)</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createEntity} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome *</Label>
              <Input
                placeholder="Minha Empresa Ltda."
                value={newEntity.name}
                onChange={(e) => setNewEntity({ ...newEntity, name: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo *</Label>
                <Select value={newEntity.type} onValueChange={(v) => setNewEntity({ ...newEntity, type: v ?? 'PF' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PF">Pessoa Física</SelectItem>
                    <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{newEntity.type === 'PF' ? 'CPF' : 'CNPJ'} *</Label>
                <Input
                  placeholder={newEntity.type === 'PF' ? '000.000.000-00' : '00.000.000/0001-00'}
                  value={newEntity.document}
                  onChange={(e) => setNewEntity({ ...newEntity, document: e.target.value })}
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={savingEntity}>
              {savingEntity ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
              Criar entidade
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
