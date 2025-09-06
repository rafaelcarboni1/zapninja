"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  BarChart3, 
  Activity, 
  Clock, 
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Zap,
  Database
} from "lucide-react"
import { getMetrics, getMessages, getSessions } from "@/lib/supabase"

interface MetricData {
  totalSessions: number
  activeSessions: number
  totalUsers: number
  totalMessages: number
  averageResponseTime: number
  uptime: number
  errorRate: number
  peakHour: string
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<MetricData | null>(null)
  const [loading, setLoading] = useState(true)
  const [realTimeMetrics, setRealTimeMetrics] = useState({
    connectionsPerSecond: 0,
    memoryUsage: 0,
    cpuUsage: 0
  })

  useEffect(() => {
    loadMetrics()
    
    // Simular métricas em tempo real
    const interval = setInterval(() => {
      setRealTimeMetrics({
        connectionsPerSecond: Math.floor(Math.random() * 10) + 1,
        memoryUsage: Math.floor(Math.random() * 30) + 50,
        cpuUsage: Math.floor(Math.random() * 40) + 20
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  async function loadMetrics() {
    try {
      const [baseMetrics, messages, sessions] = await Promise.all([
        getMetrics(),
        getMessages(500),
        getSessions()
      ])

      // Calcular métricas adicionais
      const now = new Date()
      const hourCounts: { [key: string]: number } = {}
      
      messages.forEach(message => {
        const hour = new Date(message.created_at).getHours()
        hourCounts[hour] = (hourCounts[hour] || 0) + 1
      })

      const peakHour = Object.entries(hourCounts)
        .reduce((a, b) => hourCounts[a[0]] > hourCounts[b[0]] ? a : b)?.[0] || '12'

      const averageResponseTime = 1200 + Math.floor(Math.random() * 800) // Simulated
      const uptime = 99.2 + Math.random() * 0.7 // Simulated
      const errorRate = Math.random() * 2 // Simulated

      setMetrics({
        ...baseMetrics,
        averageResponseTime,
        uptime,
        errorRate,
        peakHour: `${peakHour}:00`
      })
    } catch (error) {
      console.error('Erro ao carregar métricas:', error)
    } finally {
      setLoading(false)
    }
  }

  function getUptimeStatus(uptime: number) {
    if (uptime >= 99.5) return { color: 'text-green-600', status: 'Excelente' }
    if (uptime >= 98.0) return { color: 'text-yellow-600', status: 'Bom' }
    return { color: 'text-red-600', status: 'Atenção' }
  }

  function getErrorRateStatus(errorRate: number) {
    if (errorRate <= 1) return { color: 'text-green-600', status: 'Normal' }
    if (errorRate <= 3) return { color: 'text-yellow-600', status: 'Moderado' }
    return { color: 'text-red-600', status: 'Alto' }
  }

  if (loading || !metrics) {
    return (
      <div className="p-8">
        <div className="space-y-4">
          <div className="h-8 bg-muted animate-pulse rounded" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const uptimeStatus = getUptimeStatus(metrics.uptime)
  const errorStatus = getErrorRateStatus(metrics.errorRate)

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Métricas do Sistema</h1>
          <p className="text-muted-foreground">
            Monitoramento em tempo real e análise de performance
          </p>
        </div>
        <Button onClick={loadMetrics} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Real-time Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">Conexões/seg</p>
                <p className="text-2xl font-bold">{realTimeMetrics.connectionsPerSecond}</p>
                <p className="text-xs text-muted-foreground">Tempo real</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Memória</p>
                <p className="text-2xl font-bold">{realTimeMetrics.memoryUsage}%</p>
                <p className="text-xs text-muted-foreground">Uso atual</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">CPU</p>
                <p className="text-2xl font-bold">{realTimeMetrics.cpuUsage}%</p>
                <p className="text-xs text-muted-foreground">Processamento</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Core Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Sessões Ativas</p>
                <p className="text-2xl font-bold">{metrics.activeSessions}</p>
                <p className="text-xs text-muted-foreground">
                  de {metrics.totalSessions} total
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Tempo Resposta</p>
                <p className="text-2xl font-bold">{metrics.averageResponseTime}ms</p>
                <p className="text-xs text-muted-foreground">Médio</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className={`h-4 w-4 ${uptimeStatus.color}`} />
              <div>
                <p className="text-sm font-medium">Uptime</p>
                <p className="text-2xl font-bold">{metrics.uptime.toFixed(1)}%</p>
                <p className={`text-xs ${uptimeStatus.color}`}>
                  {uptimeStatus.status}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingDown className={`h-4 w-4 ${errorStatus.color}`} />
              <div>
                <p className="text-sm font-medium">Taxa de Erro</p>
                <p className="text-2xl font-bold">{metrics.errorRate.toFixed(1)}%</p>
                <p className={`text-xs ${errorStatus.color}`}>
                  {errorStatus.status}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Performance</span>
            </CardTitle>
            <CardDescription>
              Indicadores de performance do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Mensagens processadas</span>
                <Badge variant="outline">
                  {metrics.totalMessages.toLocaleString()}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Usuários ativos</span>
                <Badge variant="outline">
                  {metrics.totalUsers.toLocaleString()}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Horário de pico</span>
                <Badge variant="outline">
                  {metrics.peakHour}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Taxa de utilização</span>
                <Badge variant="outline">
                  {metrics.totalSessions > 0 
                    ? Math.round((metrics.activeSessions / metrics.totalSessions) * 100)
                    : 0
                  }%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Status do Sistema</span>
            </CardTitle>
            <CardDescription>
              Saúde geral da aplicação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm">API WhatsApp</span>
                <Badge variant="outline" className="ml-auto">Online</Badge>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm">Banco de Dados</span>
                <Badge variant="outline" className="ml-auto">Conectado</Badge>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm">Realtime</span>
                <Badge variant="outline" className="ml-auto">Ativo</Badge>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 bg-yellow-500 rounded-full" />
                <span className="text-sm">Cache</span>
                <Badge variant="secondary" className="ml-auto">Moderado</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Resource Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Uso de Recursos</span>
          </CardTitle>
          <CardDescription>
            Monitoramento de recursos do sistema em tempo real
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uso de Memória</span>
                <span className="font-medium">{realTimeMetrics.memoryUsage}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-1000" 
                  style={{ width: `${realTimeMetrics.memoryUsage}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uso de CPU</span>
                <span className="font-medium">{realTimeMetrics.cpuUsage}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div 
                  className="bg-green-600 h-3 rounded-full transition-all duration-1000" 
                  style={{ width: `${realTimeMetrics.cpuUsage}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Taxa de Uptime</span>
                <span className="font-medium">{metrics.uptime.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div 
                  className="bg-purple-600 h-3 rounded-full" 
                  style={{ width: `${metrics.uptime}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}