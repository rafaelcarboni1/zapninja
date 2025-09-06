"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Loader2 } from "lucide-react"

interface CreateSessionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateSessionModal({ isOpen, onClose, onSuccess }: CreateSessionModalProps) {
  const [sessionName, setSessionName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreateSession() {
    if (!sessionName.trim()) {
      setError("Nome da sessão é obrigatório")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/sessions/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionName: sessionName.trim(),
          aiConfig: {
            model: 'gpt-3.5-turbo',
            temperature: 0.7,
          },
          timingConfig: {
            delayBetweenMessages: 2000,
            maxMessagesPerHour: 100,
          }
        }),
      })

      if (response.ok) {
        onSuccess()
        setSessionName("")
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Erro ao criar sessão')
      }
    } catch (error) {
      console.error('Erro ao criar sessão:', error)
      setError('Erro de conexão com o servidor')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    if (loading) return
    setSessionName("")
    setError(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Criar Nova Sessão</span>
          </DialogTitle>
          <DialogDescription>
            Configure uma nova instância WhatsApp para automação
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="sessionName">Nome da Sessão</Label>
            <Input
              id="sessionName"
              placeholder="Ex: sessao_vendas, suporte_cliente, etc."
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Use apenas letras, números e underscore (_)
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreateSession}
              disabled={loading || !sessionName.trim()}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Sessão
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}