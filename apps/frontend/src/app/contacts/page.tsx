"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  Users, 
  Search, 
  Phone, 
  Clock,
  Activity,
  UserCheck,
  RefreshCw
} from "lucide-react"
import { getUsers, type WhatsAppUser } from "@/lib/supabase"

export default function ContactsPage() {
  const [contacts, setContacts] = useState<WhatsAppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    loadContacts()
  }, [])

  async function loadContacts() {
    try {
      const data = await getUsers()
      setContacts(data)
    } catch (error) {
      console.error('Erro ao carregar contatos:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredContacts = contacts.filter(contact =>
    contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone_number.includes(searchTerm) ||
    contact.display_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  function formatPhone(phone: string) {
    // Format phone number for display
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`
    }
    return phone
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('pt-BR')
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="space-y-4">
          <div className="h-8 bg-muted animate-pulse rounded" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contatos</h1>
          <p className="text-muted-foreground">
            Gerenciar usuários cadastrados no sistema
          </p>
        </div>
        <Button onClick={loadContacts} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Buscar Contatos</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Buscar por nome, número ou nome de exibição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total</p>
                <p className="text-2xl font-bold">{contacts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <UserCheck className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Ativos</p>
                <p className="text-2xl font-bold">
                  {contacts.filter(c => c.is_active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Hoje</p>
                <p className="text-2xl font-bold">
                  {contacts.filter(c => 
                    new Date(c.updated_at).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Phone className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Com Nome</p>
                <p className="text-2xl font-bold">
                  {contacts.filter(c => c.name && c.name !== c.phone_number).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contacts Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredContacts.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Nenhum contato encontrado</p>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Tente ajustar sua busca' : 'Os contatos aparecerão aqui quando cadastrados'}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredContacts.map((contact) => (
            <Card key={contact.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center space-x-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <span>{contact.name || 'Sem nome'}</span>
                    </CardTitle>
                    <CardDescription>
                      {contact.display_name && contact.display_name !== contact.name 
                        ? contact.display_name 
                        : 'Sem nome de exibição'
                      }
                    </CardDescription>
                  </div>
                  <Badge variant={contact.is_active ? "default" : "secondary"}>
                    {contact.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono">{formatPhone(contact.phone_number)}</span>
                </div>
                
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <div className="space-y-1">
                    <p>Criado: {formatDate(contact.created_at)}</p>
                    <p>Atualizado: {formatDate(contact.updated_at)}</p>
                  </div>
                </div>

                {(contact.profile_data && Object.keys(contact.profile_data).length > 0) && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">Dados do perfil disponíveis</p>
                  </div>
                )}

                {(contact.preferences && Object.keys(contact.preferences).length > 0) && (
                  <div className="pt-1">
                    <p className="text-xs text-muted-foreground">Preferências configuradas</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}