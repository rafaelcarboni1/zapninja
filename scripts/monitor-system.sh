#!/bin/bash

# Script de monitoramento do sistema PM2
# Monitora performance, saúde e métricas em tempo real

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para exibir header
show_header() {
    clear
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}🔍 MONITOR DO SISTEMA PM2 - $(date)${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Função para verificar status do PM2
check_pm2_status() {
    echo -e "${YELLOW}📊 STATUS DOS PROCESSOS:${NC}"
    pm2 jlist | jq -r '.[] | "\(.name): \(.pm2_env.status) (CPU: \(.monit.cpu)%, MEM: \(.monit.memory/1024/1024 | floor)MB)"' 2>/dev/null || {
        echo "❌ Erro ao obter status do PM2"
        return 1
    }
    echo ""
}

# Função para verificar uso de recursos
check_resources() {
    echo -e "${YELLOW}💻 RECURSOS DO SISTEMA:${NC}"
    
    # CPU
    cpu_usage=$(top -l 1 -s 0 | grep "CPU usage" | awk '{print $3}' | sed 's/%//')
    echo -e "CPU: ${cpu_usage}%"
    
    # Memória
    memory_info=$(vm_stat | perl -ne '/page size of (\d+)/ and $size=$1; /Pages\s+([^:]+):\s+(\d+)/ and printf("%-16s % 16.2f Mi\n", "$1:", $2 * $size / 1048576);')
    echo -e "${memory_info}"
    
    # Disco
    echo "Uso do disco:"
    df -h / | tail -1 | awk '{print "Usado: " $3 " / " $2 " (" $5 ")"}'
    echo ""
}

# Função para verificar logs de erro
check_error_logs() {
    echo -e "${YELLOW}🚨 ÚLTIMOS ERROS (últimas 10 linhas):${NC}"
    
    if [ -f "logs/pm2-error.log" ]; then
        tail -10 logs/pm2-error.log 2>/dev/null || echo "Nenhum erro recente"
    else
        echo "Arquivo de erro não encontrado"
    fi
    echo ""
}

# Função para verificar conectividade
check_connectivity() {
    echo -e "${YELLOW}🌐 CONECTIVIDADE:${NC}"
    
    # Verificar portas em uso
    echo "Portas em uso pelo sistema:"
    lsof -i -P -n | grep LISTEN | grep node | head -5
    echo ""
}

# Função para mostrar estatísticas de uptime
show_uptime_stats() {
    echo -e "${YELLOW}⏱️  ESTATÍSTICAS DE UPTIME:${NC}"
    pm2 jlist | jq -r '.[] | "\(.name): \(.pm2_env.pm_uptime | tonumber | . / 1000 | floor) segundos"' 2>/dev/null || echo "Erro ao obter uptime"
    echo ""
}

# Função para mostrar alertas
show_alerts() {
    echo -e "${RED}⚠️  ALERTAS:${NC}"
    
    # Verificar processos com alta CPU
    high_cpu=$(pm2 jlist | jq -r '.[] | select(.monit.cpu > 80) | "\(.name): CPU \(.monit.cpu)%"' 2>/dev/null)
    if [ ! -z "$high_cpu" ]; then
        echo -e "${RED}🔥 Processos com alta CPU:${NC}"
        echo "$high_cpu"
    fi
    
    # Verificar processos com alta memória
    high_mem=$(pm2 jlist | jq -r '.[] | select(.monit.memory > 536870912) | "\(.name): MEM \(.monit.memory/1024/1024 | floor)MB"' 2>/dev/null)
    if [ ! -z "$high_mem" ]; then
        echo -e "${RED}🧠 Processos com alta memória (>512MB):${NC}"
        echo "$high_mem"
    fi
    
    # Verificar processos parados
    stopped=$(pm2 jlist | jq -r '.[] | select(.pm2_env.status != "online") | "\(.name): \(.pm2_env.status)"' 2>/dev/null)
    if [ ! -z "$stopped" ]; then
        echo -e "${RED}🛑 Processos não online:${NC}"
        echo "$stopped"
    fi
    
    if [ -z "$high_cpu" ] && [ -z "$high_mem" ] && [ -z "$stopped" ]; then
        echo -e "${GREEN}✅ Nenhum alerta ativo${NC}"
    fi
    echo ""
}

# Função principal de monitoramento
monitor_loop() {
    while true; do
        show_header
        check_pm2_status
        check_resources
        show_uptime_stats
        show_alerts
        check_error_logs
        check_connectivity
        
        echo -e "${BLUE}Pressione Ctrl+C para sair. Atualizando em 10 segundos...${NC}"
        sleep 10
    done
}

# Função para mostrar ajuda
show_help() {
    echo "Uso: $0 [opção]"
    echo ""
    echo "Opções:"
    echo "  -m, --monitor    Monitoramento contínuo (padrão)"
    echo "  -s, --status     Status único"
    echo "  -a, --alerts     Apenas alertas"
    echo "  -l, --logs       Últimos logs"
    echo "  -h, --help       Mostrar esta ajuda"
    echo ""
}

# Verificar se PM2 está rodando
if ! pgrep -f "PM2" > /dev/null; then
    echo -e "${RED}❌ PM2 não está rodando!${NC}"
    echo "Execute: pm2 start ecosystem.config.js"
    exit 1
fi

# Verificar se jq está instalado
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠️  jq não encontrado. Instalando...${NC}"
    if command -v brew &> /dev/null; then
        brew install jq
    else
        echo "Por favor, instale jq manualmente"
        exit 1
    fi
fi

# Processar argumentos
case "${1:-}" in
    -s|--status)
        show_header
        check_pm2_status
        check_resources
        ;;
    -a|--alerts)
        show_header
        show_alerts
        ;;
    -l|--logs)
        show_header
        check_error_logs
        ;;
    -h|--help)
        show_help
        ;;
    -m|--monitor|"")
        monitor_loop
        ;;
    *)
        echo "Opção inválida: $1"
        show_help
        exit 1
        ;;
esac