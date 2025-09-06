#!/bin/bash

# Script de teste de escalabilidade para PM2
# Testa performance com diferentes números de instâncias

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações de teste
TEST_DURATION=60  # segundos
MAX_INSTANCES=8
STEP_INSTANCES=2
TEST_URL="http://localhost:3000/health"
REPORT_FILE="logs/scalability-report-$(date +%Y%m%d-%H%M%S).json"

echo -e "${BLUE}🧪 TESTE DE ESCALABILIDADE PM2${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""

# Verificar dependências
check_dependencies() {
    echo -e "${YELLOW}🔍 Verificando dependências...${NC}"
    
    # Verificar PM2
    if ! command -v pm2 &> /dev/null; then
        echo -e "${RED}❌ PM2 não encontrado${NC}"
        exit 1
    fi
    
    # Verificar curl
    if ! command -v curl &> /dev/null; then
        echo -e "${RED}❌ curl não encontrado${NC}"
        exit 1
    fi
    
    # Verificar jq
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}⚠️  jq não encontrado. Instalando...${NC}"
        if command -v brew &> /dev/null; then
            brew install jq
        else
            echo -e "${RED}❌ Por favor, instale jq manualmente${NC}"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✅ Dependências verificadas${NC}"
    echo ""
}

# Função para medir performance
measure_performance() {
    local instances=$1
    local test_name="test-${instances}-instances"
    
    echo -e "${BLUE}📊 Testando com ${instances} instâncias...${NC}"
    
    # Parar processos existentes
    pm2 delete all 2>/dev/null || true
    sleep 2
    
    # Iniciar com número específico de instâncias
    PM2_INSTANCES=$instances pm2 start ecosystem.config.js --env production
    
    # Aguardar inicialização
    echo "⏳ Aguardando inicialização (10s)..."
    sleep 10
    
    # Verificar se os processos estão online
    local online_count=$(pm2 jlist | jq '[.[] | select(.pm2_env.status == "online")] | length')
    if [ "$online_count" -ne "$instances" ]; then
        echo -e "${RED}❌ Apenas $online_count de $instances instâncias online${NC}"
        return 1
    fi
    
    echo -e "${GREEN}✅ $instances instâncias online${NC}"
    
    # Coletar métricas iniciais
    local start_time=$(date +%s)
    local initial_memory=$(pm2 jlist | jq '[.[] | .monit.memory] | add')
    local initial_cpu=$(pm2 jlist | jq '[.[] | .monit.cpu] | add')
    
    echo "📈 Coletando métricas por ${TEST_DURATION}s..."
    
    # Arrays para armazenar métricas
    local memory_samples=()
    local cpu_samples=()
    local response_times=()
    local error_count=0
    local success_count=0
    
    # Coletar métricas durante o teste
    for ((i=0; i<TEST_DURATION; i++)); do
        # Testar endpoint se disponível
        if curl -s --max-time 5 "$TEST_URL" > /dev/null 2>&1; then
            local response_time=$(curl -s -w "%{time_total}" -o /dev/null "$TEST_URL")
            response_times+=("$response_time")
            ((success_count++))
        else
            ((error_count++))
        fi
        
        # Coletar métricas do PM2
        local current_memory=$(pm2 jlist | jq '[.[] | .monit.memory] | add' 2>/dev/null || echo "0")
        local current_cpu=$(pm2 jlist | jq '[.[] | .monit.cpu] | add' 2>/dev/null || echo "0")
        
        memory_samples+=("$current_memory")
        cpu_samples+=("$current_cpu")
        
        echo -n "."
        sleep 1
    done
    
    echo ""
    
    # Calcular estatísticas
    local avg_memory=$(printf '%s\n' "${memory_samples[@]}" | jq -s 'add/length')
    local max_memory=$(printf '%s\n' "${memory_samples[@]}" | jq -s 'max')
    local avg_cpu=$(printf '%s\n' "${cpu_samples[@]}" | jq -s 'add/length')
    local max_cpu=$(printf '%s\n' "${cpu_samples[@]}" | jq -s 'max')
    
    local avg_response_time=0
    local max_response_time=0
    if [ ${#response_times[@]} -gt 0 ]; then
        avg_response_time=$(printf '%s\n' "${response_times[@]}" | jq -s 'add/length')
        max_response_time=$(printf '%s\n' "${response_times[@]}" | jq -s 'max')
    fi
    
    # Exibir resultados
    echo -e "${GREEN}📊 RESULTADOS - $instances instâncias:${NC}"
    echo "   Memória média: $(echo "$avg_memory/1024/1024" | bc)MB"
    echo "   Memória máxima: $(echo "$max_memory/1024/1024" | bc)MB"
    echo "   CPU média: ${avg_cpu}%"
    echo "   CPU máxima: ${max_cpu}%"
    echo "   Tempo resposta médio: ${avg_response_time}s"
    echo "   Tempo resposta máximo: ${max_response_time}s"
    echo "   Requisições bem-sucedidas: $success_count"
    echo "   Requisições com erro: $error_count"
    echo ""
    
    # Salvar dados no relatório
    local test_result=$(cat <<EOF
{
  "instances": $instances,
  "test_duration": $TEST_DURATION,
  "timestamp": "$(date -Iseconds)",
  "metrics": {
    "memory": {
      "average": $avg_memory,
      "maximum": $max_memory,
      "samples": $(printf '%s\n' "${memory_samples[@]}" | jq -s '.')
    },
    "cpu": {
      "average": $avg_cpu,
      "maximum": $max_cpu,
      "samples": $(printf '%s\n' "${cpu_samples[@]}" | jq -s '.')
    },
    "response_time": {
      "average": $avg_response_time,
      "maximum": $max_response_time,
      "samples": $(printf '%s\n' "${response_times[@]}" | jq -s '.')
    },
    "requests": {
      "success": $success_count,
      "errors": $error_count,
      "total": $((success_count + error_count))
    }
  }
}
EOF
    )
    
    # Adicionar ao arquivo de relatório
    if [ ! -f "$REPORT_FILE" ]; then
        echo '{"tests": []}' > "$REPORT_FILE"
    fi
    
    # Adicionar resultado ao array de testes
    jq ".tests += [$test_result]" "$REPORT_FILE" > "${REPORT_FILE}.tmp" && mv "${REPORT_FILE}.tmp" "$REPORT_FILE"
    
    return 0
}

# Função para gerar relatório final
generate_report() {
    echo -e "${BLUE}📋 RELATÓRIO FINAL DE ESCALABILIDADE${NC}"
    echo -e "${BLUE}═══════════════════════════════════════${NC}"
    
    if [ ! -f "$REPORT_FILE" ]; then
        echo -e "${RED}❌ Arquivo de relatório não encontrado${NC}"
        return 1
    fi
    
    # Exibir resumo
    echo "Arquivo do relatório: $REPORT_FILE"
    echo ""
    
    # Tabela de resultados
    echo -e "${YELLOW}📊 RESUMO DOS TESTES:${NC}"
    printf "%-12s %-15s %-15s %-15s %-15s\n" "Instâncias" "Mem Média (MB)" "CPU Média (%)" "Resp Média (s)" "Taxa Sucesso"
    echo "────────────────────────────────────────────────────────────────────────────"
    
    jq -r '.tests[] | [.instances, (.metrics.memory.average/1024/1024|floor), .metrics.cpu.average, .metrics.response_time.average, (.metrics.requests.success/(.metrics.requests.total)*100|floor)] | @tsv' "$REPORT_FILE" | \
    while IFS=$'\t' read -r instances mem cpu resp success; do
        printf "%-12s %-15s %-15s %-15s %-15s%%\n" "$instances" "$mem" "$cpu" "$resp" "$success"
    done
    
    echo ""
    
    # Recomendações
    echo -e "${YELLOW}💡 RECOMENDAÇÕES:${NC}"
    
    local best_instances=$(jq -r '.tests | sort_by(.metrics.cpu.average + (.metrics.memory.average/1024/1024/1024)) | .[0].instances' "$REPORT_FILE")
    local worst_instances=$(jq -r '.tests | sort_by(.metrics.cpu.average + (.metrics.memory.average/1024/1024/1024)) | .[-1].instances' "$REPORT_FILE")
    
    echo "✅ Melhor configuração: $best_instances instâncias"
    echo "⚠️  Pior configuração: $worst_instances instâncias"
    
    # Verificar se há degradação de performance
    local high_cpu_tests=$(jq -r '.tests[] | select(.metrics.cpu.average > 80) | .instances' "$REPORT_FILE")
    if [ ! -z "$high_cpu_tests" ]; then
        echo -e "${RED}🚨 Alta utilização de CPU detectada em: $high_cpu_tests instâncias${NC}"
    fi
    
    local high_mem_tests=$(jq -r '.tests[] | select(.metrics.memory.average > 1073741824) | .instances' "$REPORT_FILE")
    if [ ! -z "$high_mem_tests" ]; then
        echo -e "${RED}🚨 Alta utilização de memória (>1GB) detectada em: $high_mem_tests instâncias${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}✅ Relatório completo salvo em: $REPORT_FILE${NC}"
}

# Função principal
main() {
    # Criar diretório de logs se não existir
    mkdir -p logs
    
    check_dependencies
    
    echo -e "${YELLOW}🚀 Iniciando testes de escalabilidade...${NC}"
    echo "Duração de cada teste: ${TEST_DURATION}s"
    echo "Instâncias testadas: 1 até $MAX_INSTANCES (passo $STEP_INSTANCES)"
    echo "URL de teste: $TEST_URL"
    echo ""
    
    # Executar testes
    for ((instances=1; instances<=MAX_INSTANCES; instances+=STEP_INSTANCES)); do
        if ! measure_performance $instances; then
            echo -e "${RED}❌ Teste com $instances instâncias falhou${NC}"
            continue
        fi
        
        # Pausa entre testes
        if [ $instances -lt $MAX_INSTANCES ]; then
            echo "⏳ Pausa de 5s antes do próximo teste..."
            sleep 5
        fi
    done
    
    # Limpar processos
    pm2 delete all 2>/dev/null || true
    
    # Gerar relatório final
    generate_report
}

# Verificar argumentos
case "${1:-}" in
    -h|--help)
        echo "Uso: $0 [opções]"
        echo ""
        echo "Opções:"
        echo "  -d, --duration SECONDS    Duração de cada teste (padrão: 60s)"
        echo "  -m, --max-instances NUM   Número máximo de instâncias (padrão: 8)"
        echo "  -s, --step NUM           Passo entre testes (padrão: 2)"
        echo "  -u, --url URL            URL para teste de resposta"
        echo "  -h, --help               Mostrar esta ajuda"
        echo ""
        exit 0
        ;;
    -d|--duration)
        TEST_DURATION=$2
        shift 2
        ;;
    -m|--max-instances)
        MAX_INSTANCES=$2
        shift 2
        ;;
    -s|--step)
        STEP_INSTANCES=$2
        shift 2
        ;;
    -u|--url)
        TEST_URL=$2
        shift 2
        ;;
esac

# Executar função principal
main