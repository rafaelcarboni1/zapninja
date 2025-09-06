"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { 
  Settings, 
  Save, 
  RefreshCw, 
  Bell,
  Shield,
  Database,
  Zap,
  Globe
} from "lucide-react"

interface SystemSettings {
  notifications: {
    emailAlerts: boolean
    systemNotifications: boolean
    errorAlerts: boolean
  }
  api: {
    rateLimit: number
    timeout: number
    retryAttempts: number
  }
  database: {
    maxConnections: number
    queryTimeout: number
    backupEnabled: boolean
  }
  realtime: {
    enabled: boolean
    reconnectAttempts: number
    heartbeatInterval: number
  }
  general: {
    systemName: string
    adminEmail: string
    timezone: string
    language: string
  }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>({
    notifications: {
      emailAlerts: true,
      systemNotifications: true,
      errorAlerts: true
    },
    api: {
      rateLimit: 100,
      timeout: 30000,
      retryAttempts: 3
    },
    database: {
      maxConnections: 10,
      queryTimeout: 15000,
      backupEnabled: true
    },
    realtime: {
      enabled: true,
      reconnectAttempts: 5,
      heartbeatInterval: 30000
    },
    general: {
      systemName: "ZAPNINJA Dashboard",
      adminEmail: "admin@zapninja.com",
      timezone: "America/Sao_Paulo",
      language: "pt-BR"
    }
  })
  
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  async function saveSettings() {
    setLoading(true)
    setSaved(false)
    
    try {
      // Simular salvamento (em produção, enviaria para API)
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Salvar no localStorage para persistir
      localStorage.setItem('zapninja-settings', JSON.stringify(settings))
      
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadSettings() {
    try {
      const saved = localStorage.getItem('zapninja-settings')
      if (saved) {
        setSettings(JSON.parse(saved))
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  function updateSetting(category: keyof SystemSettings, key: string, value: unknown) {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }))
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações do sistema e preferências
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={loadSettings} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Recarregar
          </Button>
          <Button onClick={saveSettings} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Configurações Gerais</span>
            </CardTitle>
            <CardDescription>
              Configurações básicas do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="systemName">Nome do Sistema</Label>
              <Input
                id="systemName"
                value={settings.general.systemName}
                onChange={(e) => updateSetting('general', 'systemName', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Email do Administrador</Label>
              <Input
                id="adminEmail"
                type="email"
                value={settings.general.adminEmail}
                onChange={(e) => updateSetting('general', 'adminEmail', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="timezone">Fuso Horário</Label>
              <select
                id="timezone"
                className="w-full p-2 border rounded-md"
                value={settings.general.timezone}
                onChange={(e) => updateSetting('general', 'timezone', e.target.value)}
              >
                <option value="America/Sao_Paulo">América/São Paulo (GMT-3)</option>
                <option value="America/New_York">América/Nova York (GMT-5)</option>
                <option value="Europe/London">Europa/Londres (GMT+0)</option>
                <option value="Asia/Tokyo">Ásia/Tóquio (GMT+9)</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="language">Idioma</Label>
              <select
                id="language"
                className="w-full p-2 border rounded-md"
                value={settings.general.language}
                onChange={(e) => updateSetting('general', 'language', e.target.value)}
              >
                <option value="pt-BR">Português (Brasil)</option>
                <option value="en-US">English (US)</option>
                <option value="es-ES">Español</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notificações</span>
            </CardTitle>
            <CardDescription>
              Configure alertas e notificações do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Alertas por Email</Label>
                <p className="text-xs text-muted-foreground">
                  Receber notificações importantes por email
                </p>
              </div>
              <Switch
                checked={settings.notifications.emailAlerts}
                onCheckedChange={(checked) => updateSetting('notifications', 'emailAlerts', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Notificações do Sistema</Label>
                <p className="text-xs text-muted-foreground">
                  Mostrar notificações na interface
                </p>
              </div>
              <Switch
                checked={settings.notifications.systemNotifications}
                onCheckedChange={(checked) => updateSetting('notifications', 'systemNotifications', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Alertas de Erro</Label>
                <p className="text-xs text-muted-foreground">
                  Notificar sobre erros críticos
                </p>
              </div>
              <Switch
                checked={settings.notifications.errorAlerts}
                onCheckedChange={(checked) => updateSetting('notifications', 'errorAlerts', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* API Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <span>API</span>
            </CardTitle>
            <CardDescription>
              Configurações da API e comunicação externa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rateLimit">Limite de Requisições (por minuto)</Label>
              <Input
                id="rateLimit"
                type="number"
                value={settings.api.rateLimit}
                onChange={(e) => updateSetting('api', 'rateLimit', parseInt(e.target.value))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="timeout">Timeout (ms)</Label>
              <Input
                id="timeout"
                type="number"
                value={settings.api.timeout}
                onChange={(e) => updateSetting('api', 'timeout', parseInt(e.target.value))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="retryAttempts">Tentativas de Retry</Label>
              <Input
                id="retryAttempts"
                type="number"
                value={settings.api.retryAttempts}
                onChange={(e) => updateSetting('api', 'retryAttempts', parseInt(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Database Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Banco de Dados</span>
            </CardTitle>
            <CardDescription>
              Configurações de conexão e performance do banco
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="maxConnections">Máximo de Conexões</Label>
              <Input
                id="maxConnections"
                type="number"
                value={settings.database.maxConnections}
                onChange={(e) => updateSetting('database', 'maxConnections', parseInt(e.target.value))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="queryTimeout">Timeout de Query (ms)</Label>
              <Input
                id="queryTimeout"
                type="number"
                value={settings.database.queryTimeout}
                onChange={(e) => updateSetting('database', 'queryTimeout', parseInt(e.target.value))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Backup Automático</Label>
                <p className="text-xs text-muted-foreground">
                  Ativar backup automático diário
                </p>
              </div>
              <Switch
                checked={settings.database.backupEnabled}
                onCheckedChange={(checked) => updateSetting('database', 'backupEnabled', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Realtime Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5" />
              <span>Tempo Real</span>
            </CardTitle>
            <CardDescription>
              Configurações de conexão em tempo real
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Realtime Habilitado</Label>
                <p className="text-xs text-muted-foreground">
                  Ativar atualizações em tempo real
                </p>
              </div>
              <Switch
                checked={settings.realtime.enabled}
                onCheckedChange={(checked) => updateSetting('realtime', 'enabled', checked)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reconnectAttempts">Tentativas de Reconexão</Label>
              <Input
                id="reconnectAttempts"
                type="number"
                value={settings.realtime.reconnectAttempts}
                onChange={(e) => updateSetting('realtime', 'reconnectAttempts', parseInt(e.target.value))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="heartbeatInterval">Intervalo Heartbeat (ms)</Label>
              <Input
                id="heartbeatInterval"
                type="number"
                value={settings.realtime.heartbeatInterval}
                onChange={(e) => updateSetting('realtime', 'heartbeatInterval', parseInt(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Status do Sistema</span>
            </CardTitle>
            <CardDescription>
              Informações sobre o estado atual do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Dashboard</span>
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full" />
                  <span className="text-sm text-green-600">Online</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">API</span>
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full" />
                  <span className="text-sm text-green-600">Funcionando</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Banco de Dados</span>
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full" />
                  <span className="text-sm text-green-600">Conectado</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Realtime</span>
                <div className="flex items-center space-x-2">
                  <div className={`h-2 w-2 rounded-full ${settings.realtime.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className={`text-sm ${settings.realtime.enabled ? 'text-green-600' : 'text-gray-500'}`}>
                    {settings.realtime.enabled ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}