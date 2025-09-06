# 📊 Sistema de Monitoramento WhatsApp Multi-Session

## Visão Geral

O sistema de monitoramento fornece visibilidade em tempo real sobre o status dos processos PM2, métricas do sistema e análise de logs estruturados.

## Comandos Disponíveis

### Monitoramento
```bash
# Dashboard interativo em tempo real
npm run monitor

# Monitoramento nativo do PM2
npm run monit

# Status dos processos
npm run status
```

### Logs
```bash
# Ver logs recentes (50 linhas)
npm run logs

# Seguir logs em tempo real
npm run logs:follow

# Ver apenas erros
npm run logs:errors

# Limpar todos os logs
npm run flush-logs
```

### Gerenciamento de Processos
```bash
# Reiniciar todos os processos
npm run restart

# Reload sem downtime
npm run reload

# Parar todos os processos
npm run stop
```

## Dashboard de Monitoramento

O dashboard (`npm run monitor`) exibe:

### 🔄 Processos PM2
- Status de cada processo (online/stopped/error)
- Uso de CPU e memória por processo
- Número de restarts
- Uptime de cada processo

### 💻 Métricas do Sistema
- Uptime do Node.js
- Uso de memória do sistema
- Load average
- Heap usage

### 📋 Análise de Logs
- Contagem de erros nos últimos 5 minutos
- Contagem de warnings
- Requisições HTTP processadas

### 🚨 Sistema de Alertas
- **Memória alta**: > 85% de uso
- **CPU alta**: > 80% de uso
- **Processos offline**: Qualquer processo parado
- **Taxa de erro alta**: > 5% de requisições com erro

## Configuração de Logs

### PM2 Log Rotate
Configurado automaticamente com:
- **Tamanho máximo**: 10MB por arquivo
- **Retenção**: 30 dias
- **Formato de data**: YYYY-MM-DD_HH-mm-ss
- **Compressão**: Desabilitada
- **Intervalo**: 30 segundos

### Logs Estruturados
Os logs são salvos em formato JSON para facilitar análise:
```json
{
  "timestamp": "2025-01-09T22:40:07.123Z",
  "level": "info",
  "service": "orchestrator",
  "message": "Sessão iniciada com sucesso",
  "sessionId": "session-001",
  "metadata": {
    "userId": "user123",
    "action": "session_start"
  }
}
```

## Localização dos Arquivos

### Logs
```
logs/
├── master-combined.log          # Logs do processo master
├── master-error.log            # Erros do master
├── orchestrator-combined.log   # Logs dos orchestrators
├── orchestrator-error.log      # Erros dos orchestrators
└── bot-YYYY-MM-DD.log         # Logs diários do bot
```

### Configurações
```
config/
├── logging.config.js           # Configuração de logs estruturados
ecosystem.config.cjs            # Configuração do PM2
scripts/
└── monitoring-dashboard.js     # Dashboard de monitoramento
```

## Troubleshooting

### Dashboard não mostra processos
1. Verificar se PM2 está rodando: `pm2 status`
2. Verificar PATH do PM2: `which pm2`
3. Reiniciar dashboard: `Ctrl+C` e `npm run monitor`

### Logs não aparecem
1. Verificar se diretório logs existe
2. Verificar permissões de escrita
3. Reiniciar processos: `npm run restart`

### Alta utilização de memória
1. Verificar no dashboard quais processos consomem mais
2. Analisar logs de erro: `npm run logs:errors`
3. Considerar ajustar `max_memory_restart` no ecosystem.config.cjs

### Processos ficam reiniciando
1. Verificar logs de erro específicos
2. Verificar se portas estão disponíveis
3. Verificar configurações de ambiente

## Métricas de Performance

### Indicadores Saudáveis
- **CPU**: < 80% por processo
- **Memória**: < 85% do sistema
- **Restarts**: < 3 por hora
- **Uptime**: > 99%
- **Response Time**: < 2s

### Alertas Críticos
- Qualquer processo offline por > 1 minuto
- Uso de memória > 95%
- Taxa de erro > 10%
- Load average > número de CPUs

## Comandos Avançados

```bash
# Ver logs de um processo específico
pm2 logs whatsapp-master --lines 100

# Reiniciar apenas um processo
pm2 restart whatsapp-master

# Ver métricas detalhadas
pm2 show whatsapp-orchestrator

# Salvar configuração atual
pm2 save

# Ressuscitar processos salvos
pm2 resurrect

# Configurar startup automático
pm2 startup
pm2 save
```

## Integração com Ferramentas Externas

### Prometheus/Grafana
Para integração com sistemas de monitoramento externos:
```bash
npm install pm2-prometheus-exporter
pm2 install pm2-prometheus-exporter
```

### Slack/Discord Notifications
Configurar webhooks para alertas críticos no arquivo de configuração.

---

**Nota**: Este sistema de monitoramento foi projetado para fornecer visibilidade completa sobre a saúde da aplicação WhatsApp Multi-Session. Use os comandos regularmente para manter o sistema otimizado.