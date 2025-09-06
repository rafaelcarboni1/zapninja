"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  MessageSquare, 
  Search, 
  Clock, 
  User,
  Filter,
  RefreshCw
} from "lucide-react"
import { getConversations, type Conversation } from "@/lib/supabase"
import { useMessagesRealtime } from "@/hooks/use-realtime"

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  // Realtime subscription for new messages
  const { isConnected } = useMessagesRealtime(() => {
    loadConversations()
  })

  useEffect(() => {
    loadConversations()
  }, [])

  async function loadConversations() {
    try {
      const data = await getConversations()
      setConversations(data)
    } catch (error) {
      console.error('Erro ao carregar conversas:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredConversations = conversations.filter(conv =>
    conv.context_summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.id.includes(searchTerm)
  )

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('pt-BR')
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="space-y-4">
          <div className="h-8 bg-muted animate-pulse rounded" />
          <div className="grid gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded" />
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
          <h1 className="text-3xl font-bold tracking-tight">Conversas</h1>
          <p className="text-muted-foreground">
            Histórico de conversas e mensagens dos usuários
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>{isConnected ? 'Online' : 'Offline'}</span>
          </Badge>
          <Button onClick={loadConversations} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Buscar Conversas</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar por contexto ou ID da conversa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total</p>
                <p className="text-2xl font-bold">{conversations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Hoje</p>
                <p className="text-2xl font-bold">
                  {conversations.filter(c => 
                    new Date(c.last_interaction).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Usuários Únicos</p>
                <p className="text-2xl font-bold">
                  {new Set(conversations.map(c => c.user_id)).size}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversations List */}
      <div className="space-y-4">
        {filteredConversations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Nenhuma conversa encontrada</p>
              <p className="text-muted-foreground">
                {searchTerm ? 'Tente ajustar sua busca' : 'As conversas aparecerão aqui quando iniciadas'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredConversations.map((conversation) => (
            <Card key={conversation.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      Conversa #{conversation.id.slice(0, 8)}
                    </CardTitle>
                    <CardDescription>
                      Usuário: {conversation.user_id.slice(0, 8)}... | 
                      Sessão: {conversation.session_id.slice(0, 8)}...
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {formatDate(conversation.last_interaction)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Resumo do Contexto:</p>
                    <p className="text-sm">{conversation.context_summary || 'Sem resumo disponível'}</p>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Criada: {formatDate(conversation.created_at)}</span>
                    <span>Atualizada: {formatDate(conversation.updated_at)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}