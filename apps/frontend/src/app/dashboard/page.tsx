"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Users, MessageSquare, Smartphone, Bot, TrendingUp } from "lucide-react"
import { getMetrics, getSessions, type WhatsAppSession } from "@/lib/supabase"
import { useSessionsRealtime, useMessagesRealtime } from "@/hooks/use-realtime"

interface DashboardMetrics {
  totalSessions: number
  activeSessions: number
  totalUsers: number
  totalConversations: number
  totalMessages: number
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalSessions: 0,
    activeSessions: 0,
    totalUsers: 0,
    totalConversations: 0,
    totalMessages: 0
  })
  const [sessions, setSessions] = useState<WhatsAppSession[]>([])
  const [loading, setLoading] = useState(true)

  const { isConnected: sessionsConnected } = useSessionsRealtime(() => {
    loadDashboardData()
  })
  const { isConnected: messagesConnected } = useMessagesRealtime(() => {
    loadDashboardData()
  })

  async function loadDashboardData() {
    try {
      const [metricsData, sessionsData] = await Promise.all([
        getMetrics(),
        getSessions()
      ])
      setMetrics(metricsData)
      setSessions(sessionsData.slice(0, 5))
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
    const interval = setInterval(loadDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  const metricCards = [
    { title: "Sessões WhatsApp", value: metrics.totalSessions, description: `${metrics.activeSessions} ativas`, icon: Smartphone, color: "text-blue-600" },
    { title: "Usuários Cadastrados", value: metrics.totalUsers, description: "Contatos no sistema", icon: Users, color: "text-green-600" },
    { title: "Conversas Ativas", value: metrics.totalConversations, description: "Em andamento", icon: MessageSquare, color: "text-purple-600" },
    { title: "Mensagens Processadas", value: metrics.totalMessages, description: "Total histórico", icon: Bot, color: "text-orange-600" },
  ]

  if (loading) {
    return (
      <div className="p-8">
        <div className="space-y-4">
          <div className="h-8 bg-muted animate-pulse rounded" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard ZAPNINJA</h1>
        <p className="text-muted-foreground">Visão geral do sistema de automação WhatsApp</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metricCards.map((metric) => (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">{metric.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Sessões Recentes</span>
            </CardTitle>
            <CardDescription>Status das últimas sessões WhatsApp</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma sessão encontrada</p>
            ) : (
              sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between space-x-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{session.session_name}</p>
                    <p className="text-xs text-muted-foreground">{session.phone_number || 'Número não definido'}</p>
                  </div>
                  <Badge variant={session.is_active ? "default" : "secondary"} className={session.is_active ? "bg-green-100 text-green-800" : ""}>
                    {session.is_active ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


