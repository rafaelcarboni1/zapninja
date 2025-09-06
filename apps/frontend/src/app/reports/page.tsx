"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  FileText, 
  Download, 
  Calendar, 
  BarChart3,
  TrendingUp,
  Users,
  MessageSquare,
  RefreshCw
} from "lucide-react"
import { getMetrics, getMessages, getSessions, getUsers } from "@/lib/supabase"

interface ReportData {
  totalSessions: number
  activeSessions: number
  totalUsers: number
  totalMessages: number
  messagesLastWeek: number
  messagesLastMonth: number
  topSessions: Array<{ name: string; messageCount: number }>
  dailyActivity: Array<{ date: string; messages: number }>
}

export default function ReportsPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generatingReport, setGeneratingReport] = useState(false)

  useEffect(() => {
    loadReportData()
  }, [])

  async function loadReportData() {
    try {
      const [metrics, messages, sessions, users] = await Promise.all([
        getMetrics(),
        getMessages(1000), // Últimas 1000 mensagens
        getSessions(),
        getUsers()
      ])

      // Calcular métricas adicionais
      const now = new Date()
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const messagesLastWeek = messages.filter(m => 
        new Date(m.created_at) >= oneWeekAgo
      ).length

      const messagesLastMonth = messages.filter(m => 
        new Date(m.created_at) >= oneMonthAgo
      ).length

      // Atividade diária dos últimos 7 dias
      const dailyActivity = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dateStr = date.toISOString().split('T')[0]
        const dayMessages = messages.filter(m => 
          m.created_at.startsWith(dateStr)
        ).length
        
        dailyActivity.push({
          date: date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
          messages: dayMessages
        })
      }

      setReportData({
        totalSessions: metrics.totalSessions,
        activeSessions: metrics.activeSessions,
        totalUsers: metrics.totalUsers,
        totalMessages: metrics.totalMessages,
        messagesLastWeek,
        messagesLastMonth,
        topSessions: [],
        dailyActivity
      })
    } catch (error) {
      console.error('Erro ao carregar dados do relatório:', error)
    } finally {
      setLoading(false)
    }
  }

  async function exportReport(format: 'csv' | 'json') {
    if (!reportData) return

    setGeneratingReport(true)
    
    try {
      let content: string
      let filename: string
      let mimeType: string

      const timestamp = new Date().toISOString().split('T')[0]

      if (format === 'csv') {
        content = generateCSVReport(reportData)
        filename = `zapninja_report_${timestamp}.csv`
        mimeType = 'text/csv'
      } else {
        content = JSON.stringify(reportData, null, 2)
        filename = `zapninja_report_${timestamp}.json`
        mimeType = 'application/json'
      }

      // Download do arquivo
      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erro ao exportar relatório:', error)
    } finally {
      setGeneratingReport(false)
    }
  }

  function generateCSVReport(data: ReportData): string {
    const headers = [
      'Métrica,Valor',
      `Total de Sessões,${data.totalSessions}`,
      `Sessões Ativas,${data.activeSessions}`,
      `Total de Usuários,${data.totalUsers}`,
      `Total de Mensagens,${data.totalMessages}`,
      `Mensagens (Última Semana),${data.messagesLastWeek}`,
      `Mensagens (Último Mês),${data.messagesLastMonth}`,
      '',
      'Atividade Diária',
      'Data,Mensagens'
    ]

    const dailyData = data.dailyActivity.map(day => 
      `${day.date},${day.messages}`
    )

    return [...headers, ...dailyData].join('\n')
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="space-y-4">
          <div className="h-8 bg-muted animate-pulse rounded" />
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-48 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Erro ao carregar relatórios</p>
            <Button onClick={loadReportData} className="mt-4">
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">
            Análise detalhada e exportação de dados do sistema
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={loadReportData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button 
            onClick={() => exportReport('csv')} 
            disabled={generatingReport}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button 
            onClick={() => exportReport('json')} 
            variant="outline"
            disabled={generatingReport}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar JSON
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total Sessões</p>
                <p className="text-2xl font-bold">{reportData.totalSessions}</p>
                <p className="text-xs text-muted-foreground">
                  {reportData.activeSessions} ativas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Usuários</p>
                <p className="text-2xl font-bold">{reportData.totalUsers}</p>
                <p className="text-xs text-muted-foreground">
                  Contatos cadastrados
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Mensagens</p>
                <p className="text-2xl font-bold">{reportData.totalMessages}</p>
                <p className="text-xs text-muted-foreground">
                  Total processadas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Esta Semana</p>
                <p className="text-2xl font-bold">{reportData.messagesLastWeek}</p>
                <p className="text-xs text-muted-foreground">
                  Mensagens nos últimos 7 dias
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Atividade dos Últimos 7 Dias</span>
          </CardTitle>
          <CardDescription>
            Número de mensagens processadas por dia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reportData.dailyActivity.map((day, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div className="w-16 text-sm font-medium">{day.date}</div>
                <div className="flex-1 bg-muted rounded-full h-4 relative">
                  <div 
                    className="bg-primary h-4 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(5, (day.messages / Math.max(...reportData.dailyActivity.map(d => d.messages))) * 100)}%`
                    }}
                  />
                </div>
                <div className="w-12 text-sm text-right font-medium">
                  {day.messages}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Estatísticas Temporais</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm">Última semana</span>
              <Badge variant="outline">
                {reportData.messagesLastWeek} mensagens
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Último mês</span>
              <Badge variant="outline">
                {reportData.messagesLastMonth} mensagens
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Média diária (7 dias)</span>
              <Badge variant="outline">
                {Math.round(reportData.messagesLastWeek / 7)} mensagens/dia
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Taxa de sessões ativas</span>
              <Badge variant="outline">
                {reportData.totalSessions > 0 
                  ? Math.round((reportData.activeSessions / reportData.totalSessions) * 100)
                  : 0
                }%
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Exportar Dados</span>
            </CardTitle>
            <CardDescription>
              Baixe relatórios detalhados em diferentes formatos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Button 
                onClick={() => exportReport('csv')} 
                disabled={generatingReport}
                className="w-full justify-start"
              >
                <Download className="h-4 w-4 mr-2" />
                Relatório CSV
                <Badge variant="secondary" className="ml-auto">
                  Planilha
                </Badge>
              </Button>
              
              <Button 
                onClick={() => exportReport('json')} 
                disabled={generatingReport}
                variant="outline"
                className="w-full justify-start"
              >
                <Download className="h-4 w-4 mr-2" />
                Dados JSON
                <Badge variant="secondary" className="ml-auto">
                  Técnico
                </Badge>
              </Button>
            </div>

            {generatingReport && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Gerando relatório...</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}