"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Smartphone, 
  Play, 
  Square, 
  RotateCcw, 
  Plus, 
  QrCode, 
  Settings,
  Trash2,
  Activity
} from "lucide-react"
import { getSessions, supabase, type WhatsAppSession } from "@/lib/supabase"
import { useSessionsRealtime } from "@/hooks/use-realtime"
import { QRCodeModal } from "@/components/qr-code-modal"
import { CreateSessionModal } from "@/components/create-session-modal"

export default function InstancesPage() {
  const [sessions, setSessions] = useState<WhatsAppSession[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Realtime subscription for sessions
  const { isConnected } = useSessionsRealtime(() => {
    loadSessions()
  })

  useEffect(() => {
    loadSessions()
    
    // Atualizar dados a cada 10 segundos (fallback)
    const interval = setInterval(loadSessions, 10000)
    return () => clearInterval(interval)
  }, [])

  async function loadSessions() {
    try {
      const data = await getSessions()
      setSessions(data)
    } catch (error) {
      console.error('Erro ao carregar sessões:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSessionAction(sessionId: string, action: 'start' | 'stop' | 'restart') {
    try {
      const response = await fetch(`/api/sessions/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      })

      if (response.ok) {
        // Recarregar sessões após ação
        setTimeout(() => loadSessions(), 1000)
      }
    } catch (error) {
      console.error(`Erro ao ${action} sessão:`, error)
    }
  }

  async function handleDeleteSession(sessionId: string) {
    if (!confirm('Tem certeza que deseja deletar esta sessão?')) return

    try {
      const { error } = await supabase
        .from('whatsapp_sessions')
        .delete()
        .eq('id', sessionId)

      if (!error) {
        loadSessions()
      } else {
        console.error('Erro ao deletar sessão:', error)
      }
    } catch (error) {
      console.error('Erro ao deletar sessão:', error)
    }
  }

  function getStatusColor(isActive: boolean) {
    return isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
  }

  function getStatusIcon(isActive: boolean) {
    return isActive ? "🟢" : "🔴"
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
          <h1 className="text-3xl font-bold tracking-tight">Instâncias WhatsApp</h1>
          <p className="text-muted-foreground">
            Gerencie suas sessões WhatsApp ativas
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>Nova Sessão</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Smartphone className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total</p>
                <p className="text-2xl font-bold">{sessions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Ativas</p>
                <p className="text-2xl font-bold">{sessions.filter(s => s.is_active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Square className="h-4 w-4 text-gray-600" />
              <div>
                <p className="text-sm font-medium">Inativas</p>
                <p className="text-2xl font-bold">{sessions.filter(s => !s.is_active).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sessions.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Smartphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">Nenhuma sessão encontrada</p>
            <p className="text-muted-foreground mb-4">Crie sua primeira sessão WhatsApp</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Sessão
            </Button>
          </div>
        ) : (
          sessions.map((session) => (
            <Card key={session.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <span>{getStatusIcon(session.is_active)}</span>
                    <span>{session.session_name}</span>
                  </CardTitle>
                  <Badge className={getStatusColor(session.is_active)}>
                    {session.is_active ? "Conectada" : "Desconectada"}
                  </Badge>
                </div>
                <CardDescription>
                  {session.phone_number || 'Número não definido'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-xs text-muted-foreground">
                  <p>Criada: {new Date(session.created_at).toLocaleDateString('pt-BR')}</p>
                  <p>Atualizada: {new Date(session.updated_at).toLocaleDateString('pt-BR')}</p>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  {session.is_active ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSessionAction(session.id, 'stop')}
                      >
                        <Square className="h-3 w-3 mr-1" />
                        Parar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSessionAction(session.id, 'restart')}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Reiniciar
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleSessionAction(session.id, 'start')}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Iniciar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedSession(session.id)}
                      >
                        <QrCode className="h-3 w-3 mr-1" />
                        QR Code
                      </Button>
                    </>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Config
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteSession(session.id)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Deletar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* QR Code Modal */}
      {selectedSession && (
        <QRCodeModal
          sessionId={selectedSession}
          isOpen={!!selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}

      {/* Create Session Modal */}
      {showCreateModal && (
        <CreateSessionModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            loadSessions()
          }}
        />
      )}
    </div>
  )
}