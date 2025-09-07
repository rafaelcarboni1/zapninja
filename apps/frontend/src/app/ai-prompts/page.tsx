"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { 
  Bot, 
  Edit3, 
  Save, 
  RefreshCw, 
  Plus,
  Trash2,
  Eye,
  Settings
} from "lucide-react"
import { supabase, getSessions, type WhatsAppSession } from "@/lib/supabase"

interface SessionPrompt {
  id: string
  session_id: string
  prompt_text: string
  is_active: boolean
  created_at: string
  updated_at: string
  session?: WhatsAppSession
}

export default function AIPromptsPage() {
  const [prompts, setPrompts] = useState<SessionPrompt[]>([])
  const [sessions, setSessions] = useState<WhatsAppSession[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null)
  const [newPromptText, setNewPromptText] = useState("")
  const [selectedSessionId, setSelectedSessionId] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [sessionsData, promptsData] = await Promise.all([
        getSessions(),
        loadPrompts()
      ])
      
      setSessions(sessionsData)
      setPrompts(promptsData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadPrompts(): Promise<SessionPrompt[]> {
    type PromptRow = SessionPrompt & {
      whatsapp_sessions?: Pick<WhatsAppSession, 'session_name' | 'is_active'>
    }

    const { data, error } = await supabase
      .from('session_prompts')
      .select(`
        *,
        whatsapp_sessions (
          session_name,
          is_active
        )
      `)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar prompts:', error)
      return []
    }

    const rows = (data || []) as unknown as PromptRow[]
    return rows.map((item: PromptRow) => ({
      id: item.id,
      session_id: item.session_id,
      prompt_text: item.prompt_text,
      is_active: item.is_active,
      created_at: item.created_at,
      updated_at: item.updated_at,
      session: item.whatsapp_sessions
    }))
  }

  async function savePrompt(sessionId: string, promptText: string) {
    try {
      const { error } = await supabase
        .from('session_prompts')
        .upsert({
          session_id: sessionId,
          prompt_text: promptText,
          is_active: true,
          updated_at: new Date().toISOString()
        })

      if (error) throw error

      await loadData()
      setEditingPrompt(null)
      setNewPromptText("")
      setSelectedSessionId("")
    } catch (error) {
      console.error('Erro ao salvar prompt:', error)
    }
  }

  async function deletePrompt(promptId: string) {
    if (!confirm('Tem certeza que deseja deletar este prompt?')) return

    try {
      const { error } = await supabase
        .from('session_prompts')
        .delete()
        .eq('id', promptId)

      if (error) throw error

      await loadData()
    } catch (error) {
      console.error('Erro ao deletar prompt:', error)
    }
  }

  async function togglePromptStatus(promptId: string, isActive: boolean) {
    try {
      const { error } = await supabase
        .from('session_prompts')
        .update({ 
          is_active: !isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', promptId)

      if (error) throw error

      await loadData()
    } catch (error) {
      console.error('Erro ao alterar status:', error)
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('pt-BR')
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="space-y-4">
          <div className="h-8 bg-muted animate-pulse rounded" />
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
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
          <h1 className="text-3xl font-bold tracking-tight">IA & Prompts</h1>
          <p className="text-muted-foreground">
            Gerenciar prompts personalizados para cada sessão
          </p>
        </div>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Bot className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total Prompts</p>
                <p className="text-2xl font-bold">{prompts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Settings className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Ativos</p>
                <p className="text-2xl font-bold">
                  {prompts.filter(p => p.is_active).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Edit3 className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Sessões</p>
                <p className="text-2xl font-bold">{sessions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create New Prompt */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Criar Novo Prompt</span>
          </CardTitle>
          <CardDescription>
            Configure um prompt personalizado para uma sessão específica
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="session-select">Sessão</Label>
              <select
                id="session-select"
                className="w-full p-2 border rounded-md"
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
              >
                <option value="">Selecione uma sessão</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.session_name} {session.is_active ? '(Ativa)' : '(Inativa)'}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="prompt-text">Texto do Prompt</Label>
            <Textarea
              id="prompt-text"
              placeholder="Digite o prompt personalizado para esta sessão..."
              value={newPromptText}
              onChange={(e) => setNewPromptText(e.target.value)}
              rows={4}
            />
          </div>
          
          <Button 
            onClick={() => savePrompt(selectedSessionId, newPromptText)}
            disabled={!selectedSessionId || !newPromptText.trim()}
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar Prompt
          </Button>
        </CardContent>
      </Card>

      {/* Existing Prompts */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Prompts Existentes</h2>
        
        {prompts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bot className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Nenhum prompt encontrado</p>
              <p className="text-muted-foreground">Crie seu primeiro prompt personalizado</p>
            </CardContent>
          </Card>
        ) : (
          prompts.map((prompt) => (
            <Card key={prompt.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center space-x-2">
                      <Bot className="h-5 w-5" />
                      <span>
                        {prompt.session?.session_name || 'Sessão não encontrada'}
                      </span>
                    </CardTitle>
                    <CardDescription>
                      Criado: {formatDate(prompt.created_at)} | 
                      Atualizado: {formatDate(prompt.updated_at)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={prompt.is_active ? "default" : "secondary"}>
                      {prompt.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                    {prompt.session?.is_active && (
                      <Badge variant="outline" className="bg-green-50 text-green-700">
                        Sessão Ativa
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {editingPrompt === prompt.id ? (
                  <div className="space-y-4">
                    <Textarea
                      value={newPromptText}
                      onChange={(e) => setNewPromptText(e.target.value)}
                      rows={4}
                    />
                    <div className="flex space-x-2">
                      <Button 
                        onClick={() => savePrompt(prompt.session_id, newPromptText)}
                        size="sm"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </Button>
                      <Button 
                        onClick={() => {
                          setEditingPrompt(null)
                          setNewPromptText("")
                        }}
                        variant="outline" 
                        size="sm"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{prompt.prompt_text}</p>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => {
                          setEditingPrompt(prompt.id)
                          setNewPromptText(prompt.prompt_text)
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      
                      <Button
                        onClick={() => togglePromptStatus(prompt.id, prompt.is_active)}
                        variant="outline"
                        size="sm"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {prompt.is_active ? 'Desativar' : 'Ativar'}
                      </Button>
                      
                      <Button
                        onClick={() => deletePrompt(prompt.id)}
                        variant="destructive"
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Deletar
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}