"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface UseRealtimeProps {
  table: string
  onInsert?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
  onUpdate?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
  onDelete?: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void
  enabled?: boolean
}

export function useRealtime({ table, onInsert, onUpdate, onDelete, enabled = true }: UseRealtimeProps) {
  const [isConnected, setIsConnected] = useState(false)
  // Quando Supabase não está configurado, evitamos criar canal
  const channelRef = useRef<any>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>()

  const handlePayload = useCallback((payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
    console.log(`Realtime ${table} update:`, payload.eventType)
    
    switch (payload.eventType) {
      case 'INSERT':
        onInsert?.(payload)
        break
      case 'UPDATE':
        onUpdate?.(payload)
        break
      case 'DELETE':
        onDelete?.(payload)
        break
    }
  }, [table, onInsert, onUpdate, onDelete])

  const setupChannel = useCallback(() => {
    // Se supabase não estiver disponível (envs ausentes), não registrar realtime
    if (!enabled || channelRef.current || !supabase) return

    const channelName = `realtime_${table}_${Date.now()}`
    
    channelRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
        },
        handlePayload
      )
      .subscribe((status) => {
        console.log(`Realtime ${table} status:`, status)
        setIsConnected(status === 'SUBSCRIBED')
        
        // Se desconectou, tentar reconectar após 5 segundos
        if (status === 'CLOSED' && enabled) {
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (channelRef.current) {
              channelRef.current.unsubscribe()
              channelRef.current = null
              setupChannel()
            }
          }, 5000)
        }
      })
  }, [enabled, table, handlePayload])

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
    }
    
    setIsConnected(false)
  }, [])

  useEffect(() => {
    if (enabled && supabase) {
      setupChannel()
    } else {
      cleanup()
    }

    return cleanup
  }, [enabled, setupChannel, cleanup])

  return { isConnected }
}

// Hook específico para sessões WhatsApp
export function useSessionsRealtime(onSessionUpdate?: (sessions: unknown[]) => void) {
  return useRealtime({
    table: 'whatsapp_sessions',
    onInsert: (payload) => {
      console.log('Nova sessão criada:', payload.new)
      onSessionUpdate?.([])
    },
    onUpdate: (payload) => {
      console.log('Sessão atualizada:', payload.new)
      onSessionUpdate?.([])
    },
    onDelete: (payload) => {
      console.log('Sessão deletada:', payload.old)
      onSessionUpdate?.([])
    }
  })
}

// Hook específico para mensagens
export function useMessagesRealtime(onMessageUpdate?: () => void) {
  return useRealtime({
    table: 'messages',
    onInsert: (payload) => {
      console.log('Nova mensagem:', payload.new)
      onMessageUpdate?.()
    }
  })
}