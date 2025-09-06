"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RefreshCw, X, Smartphone } from "lucide-react"
import Image from "next/image"

interface QRCodeModalProps {
  sessionId: string
  isOpen: boolean
  onClose: () => void
}

export function QRCodeModal({ sessionId, isOpen, onClose }: QRCodeModalProps) {
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'waiting' | 'connected' | 'error'>('waiting')

  useEffect(() => {
    if (isOpen && sessionId) {
      fetchQRCode()
      
      // Polling para status da conexão
      const statusInterval = setInterval(checkConnectionStatus, 3000)
      return () => clearInterval(statusInterval)
    }
  }, [isOpen, sessionId])

  async function fetchQRCode() {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/sessions/${sessionId}/qr`, {
        method: 'GET',
      })
      
      if (response.ok) {
        const data = await response.json()
        setQrCode(data.qrCode)
      } else {
        setError('Erro ao gerar QR Code. Tente novamente.')
      }
    } catch (error) {
      console.error('Erro ao buscar QR Code:', error)
      setError('Erro de conexão com o servidor.')
    } finally {
      setLoading(false)
    }
  }

  async function checkConnectionStatus() {
    try {
      const response = await fetch(`/api/sessions/${sessionId}/status`)
      
      if (response.ok) {
        const data = await response.json()
        if (data.status === 'connected') {
          setConnectionStatus('connected')
        } else if (data.status === 'error') {
          setConnectionStatus('error')
        }
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Smartphone className="h-5 w-5" />
            <span>Conectar WhatsApp</span>
          </DialogTitle>
          <DialogDescription>
            Escaneie o QR Code com seu WhatsApp para conectar a sessão
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Connection Status */}
          <div className="p-3 rounded-lg bg-muted">
            <div className="flex items-center space-x-2">
              {connectionStatus === 'waiting' && (
                <>
                  <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse" />
                  <span className="text-sm">Aguardando conexão...</span>
                </>
              )}
              {connectionStatus === 'connected' && (
                <>
                  <div className="h-2 w-2 bg-green-500 rounded-full" />
                  <span className="text-sm text-green-700">Conectado com sucesso!</span>
                </>
              )}
              {connectionStatus === 'error' && (
                <>
                  <div className="h-2 w-2 bg-red-500 rounded-full" />
                  <span className="text-sm text-red-700">Erro na conexão</span>
                </>
              )}
            </div>
          </div>

          {/* QR Code Display */}
          <div className="flex justify-center p-4 bg-white rounded-lg border">
            {loading ? (
              <div className="flex flex-col items-center space-y-2">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center space-y-2">
                <X className="h-8 w-8 text-red-500" />
                <p className="text-sm text-red-600">{error}</p>
                <Button size="sm" onClick={fetchQRCode}>
                  Tentar Novamente
                </Button>
              </div>
            ) : qrCode ? (
              <div className="flex flex-col items-center space-y-2">
                <div className="p-2 bg-white rounded border">
                  <Image
                    src={`data:image/svg+xml;base64,${qrCode}`}
                    alt="QR Code WhatsApp"
                    width={200}
                    height={200}
                    className="rounded"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Abra o WhatsApp → Mais opções → Dispositivos conectados → Conectar dispositivo
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <Smartphone className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">QR Code não disponível</p>
              </div>
            )}
          </div>

          {connectionStatus === 'connected' && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">
                ✅ WhatsApp conectado com sucesso! Você pode fechar esta janela.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={fetchQRCode}
              disabled={loading}
              className="flex-1"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar QR
            </Button>
            <Button onClick={onClose} className="flex-1">
              {connectionStatus === 'connected' ? 'Fechar' : 'Cancelar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}