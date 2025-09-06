# Planejamento Completo - Sistema de IA com Memória Persistente e Gerenciamento de Sessões

## 📋 Visão Geral do Sistema

Este documento consolida todo o planejamento para implementação de um sistema avançado de IA com memória persistente, gerenciamento dinâmico de sessões WhatsApp e assistência inteligente ao administrador.

### Objetivos Principais
- **Memória Persistente**: Cada usuário tem contexto histórico completo
- **Isolamento por Sessão**: Dados completamente isolados entre sessões
- **Gerenciamento Dinâmico**: Criação e configuração de sessões via WhatsApp
- **Assistência Inteligente**: Sistema de sugestões e comandos para administrador
- **Prompts Personalizados**: Cada sessão pode ter comportamento único

---

## 🏗️ Arquitetura do Sistema

### Componentes Principais

1. **Core de Sessões**
   - Gerenciador de múltiplas sessões WhatsApp
   - Isolamento completo de dados por sessão
   - Vinculação número/sessão para identificação

2. **Sistema de Memória**
   - Contexto histórico por usuário
   - Aprendizado contínuo baseado em feedback
   - Reconhecimento inteligente de usuários

3. **Painel Administrativo via WhatsApp**
   - Comandos para gerenciar todas as sessões
   - Sistema de sugestões inteligentes
   - Monitoramento em tempo real

4. **Integração Supabase**
   - Persistência de dados
   - Sincronização em tempo real
   - Backup automático

---

## 🗄️ Schema do Banco de Dados (Supabase)

### Tabela: whatsapp_sessions
```sql
CREATE TABLE whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_name VARCHAR(100) UNIQUE NOT NULL,
  phone_number VARCHAR(20) UNIQUE,
  status VARCHAR(20) DEFAULT 'inactive',
  custom_prompt TEXT,
  ai_provider VARCHAR(50) DEFAULT 'openai',
  ai_config JSONB DEFAULT '{}',
  auto_start BOOLEAN DEFAULT false,
  config_json JSONB DEFAULT '{}',
  timing_config JSONB DEFAULT '{
    "response_delay": 2,
    "message_delay": 1000,
    "rest_period_minutes": 0,
    "working_hours": {"start": "00:00", "end": "23:59"},
    "message_limit_per_hour": 100,
    "typing_simulation": true,
    "read_receipt_delay": 500
  }',
  qr_code_data TEXT,
  last_activity TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabela: users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES whatsapp_sessions(id),
  phone_number VARCHAR(20) NOT NULL,
  name VARCHAR(255),
  age INTEGER,
  location VARCHAR(255),
  occupation VARCHAR(255),
  interests TEXT[],
  personality_profile JSONB,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, phone_number)
);
```

### Tabela: conversations
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES whatsapp_sessions(id),
  user_id UUID REFERENCES users(id),
  conversation_context JSONB DEFAULT '{}',
  last_message_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabela: messages
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  session_id UUID REFERENCES whatsapp_sessions(id),
  user_id UUID REFERENCES users(id),
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  sender VARCHAR(20) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabela: intelligent_context
```sql
CREATE TABLE intelligent_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES whatsapp_sessions(id),
  user_id UUID REFERENCES users(id),
  context_type VARCHAR(50) NOT NULL,
  context_data JSONB NOT NULL,
  relevance_score DECIMAL(3,2) DEFAULT 1.0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabela: feedback_learning
```sql
CREATE TABLE feedback_learning (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES whatsapp_sessions(id),
  user_id UUID REFERENCES users(id),
  message_id UUID REFERENCES messages(id),
  feedback_type VARCHAR(50) NOT NULL,
  feedback_data JSONB NOT NULL,
  learning_applied BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabela: session_control
```sql
CREATE TABLE session_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES whatsapp_sessions(id),
  admin_phone VARCHAR(20) NOT NULL,
  action VARCHAR(100) NOT NULL,
  parameters JSONB DEFAULT '{}',
  result JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Tabela: admin_metrics
```sql
CREATE TABLE admin_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES whatsapp_sessions(id),
  metric_type VARCHAR(50) NOT NULL,
  metric_value JSONB NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE,
  period_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🤖 Sistema de Comandos Administrativos

### Comandos de Criação e Listagem
- `!nova_sessao [nome]` - Cria nova sessão
- `!listar_sessoes` - Lista todas as sessões
- `!status_sessao [nome]` - Status detalhado da sessão

### Comandos de Configuração
- `!configurar_sessao [nome]` - Wizard de configuração
- `!prompt_sessao [nome] [prompt]` - Define prompt personalizado
- `!ia_sessao [nome] [provider]` - Configura provedor de IA
- `!config_avancada [nome]` - Configurações avançadas (temperatura, tokens, etc.)
- `!tempo_resposta [nome] [segundos]` - Define tempo de resposta da IA
- `!delay_mensagem [nome] [ms]` - Configura delay entre mensagens
- `!tempo_descanso [nome] [minutos]` - Define período de descanso da sessão
- `!horario_funcionamento [nome] [inicio-fim]` - Define horário de funcionamento
- `!limite_mensagens [nome] [quantidade]` - Limite de mensagens por usuário/hora
- `!config_timing [nome]` - Wizard completo de configurações de tempo

### Comandos de Controle
- `!iniciar_sessao [nome]` - Inicia sessão (gera QR Code)
- `!parar_sessao [nome]` - Para sessão
- `!reiniciar_sessao [nome]` - Reinicia sessão
- `!deletar_sessao [nome]` - Remove sessão
- `!pausar_sessao [nome]` - Pausa temporariamente
- `!reativar_sessao [nome]` - Reativa sessão pausada

### Comandos de Monitoramento
- `!dashboard` - Dashboard geral em tempo real
- `!logs_sessao [nome]` - Logs específicos da sessão
- `!metricas_sessao [nome]` - Métricas detalhadas
- `!usuarios_ativos [nome]` - Usuários ativos na sessão
- `!conversas_recentes [nome]` - Últimas conversas

### Comandos de Backup e Manutenção
- `!backup_sessao [nome]` - Força backup da sessão
- `!limpar_cache [nome]` - Limpa cache da sessão
- `!resetar_contexto [nome]` - Reseta contexto de usuários
- `!exportar_dados [nome]` - Exporta dados da sessão

### Comando de Ajuda
- `!ajuda` - Lista completa de comandos com descrições
- `!ajuda [comando]` - Ajuda específica do comando

---

## ⏱️ Sistema de Configurações de Timing

### Configurações Disponíveis

#### Tempo de Resposta da IA
- **Comando**: `!tempo_resposta [nome] [segundos]`
- **Função**: Define quantos segundos a IA aguarda antes de responder
- **Exemplo**: `!tempo_resposta vendas 3` (IA aguarda 3 segundos)
- **Uso**: Simula tempo de "pensamento" humano

#### Delay Entre Mensagens
- **Comando**: `!delay_mensagem [nome] [ms]`
- **Função**: Intervalo entre o envio de mensagens sequenciais
- **Exemplo**: `!delay_mensagem suporte 1500` (1.5 segundos entre mensagens)
- **Uso**: Evita spam e simula digitação natural

#### Período de Descanso
- **Comando**: `!tempo_descanso [nome] [minutos]`
- **Função**: Pausa automática da sessão após período de atividade
- **Exemplo**: `!tempo_descanso atendimento 60` (pausa de 1 hora após 8h ativas)
- **Uso**: Simula intervalos humanos de trabalho

#### Horário de Funcionamento
- **Comando**: `!horario_funcionamento [nome] [inicio-fim]`
- **Função**: Define quando a sessão está ativa
- **Exemplo**: `!horario_funcionamento comercial 08:00-18:00`
- **Uso**: Respeita horário comercial

#### Limite de Mensagens
- **Comando**: `!limite_mensagens [nome] [quantidade]`
- **Função**: Máximo de mensagens por usuário por hora
- **Exemplo**: `!limite_mensagens suporte 50`
- **Uso**: Previne abuso e controla carga

#### Wizard de Configurações de Tempo
- **Comando**: `!config_timing [nome]`
- **Função**: Fluxo interativo para configurar todos os timings
- **Exemplo**: Guia passo-a-passo para configuração completa

### Configuração JSON de Timing
```json
{
  "response_delay": 2,              // Segundos antes de responder
  "message_delay": 1000,            // MS entre mensagens
  "rest_period_minutes": 0,         // Minutos de descanso (0 = desabilitado)
  "working_hours": {
    "start": "00:00",               // Início do funcionamento
    "end": "23:59"                  // Fim do funcionamento
  },
  "message_limit_per_hour": 100,    // Limite de mensagens/hora por usuário
  "typing_simulation": true,        // Simula "digitando..."
  "read_receipt_delay": 500,        // MS para marcar como lida
  "auto_pause_after_hours": 8,      // Pausa automática após X horas
  "weekend_mode": false,            // Funcionamento em fins de semana
  "holiday_mode": false             // Funcionamento em feriados
}
```

### Exemplos de Uso Prático

**Configuração para Atendimento Comercial:**
```
!horario_funcionamento vendas 08:00-18:00
!tempo_resposta vendas 2
!delay_mensagem vendas 1200
!limite_mensagens vendas 30
!tempo_descanso vendas 60
```

**Configuração para Suporte 24h:**
```
!horario_funcionamento suporte 00:00-23:59
!tempo_resposta suporte 1
!delay_mensagem suporte 800
!limite_mensagens suporte 100
!tempo_descanso suporte 0
```

**Configuração para Bot Casual:**
```
!tempo_resposta casual 5
!delay_mensagem casual 2000
!limite_mensagens casual 20
!horario_funcionamento casual 09:00-21:00
```

### Lógica de Implementação
```typescript
interface TimingConfig {
  response_delay: number;
  message_delay: number;
  rest_period_minutes: number;
  working_hours: { start: string; end: string };
  message_limit_per_hour: number;
  typing_simulation: boolean;
  read_receipt_delay: number;
  auto_pause_after_hours?: number;
  weekend_mode?: boolean;
  holiday_mode?: boolean;
}

class TimingManager {
  async shouldRespond(sessionId: string, userId: string): Promise<boolean> {
    const config = await this.getTimingConfig(sessionId);
    
    // Verificar horário de funcionamento
    if (!this.isWithinWorkingHours(config.working_hours)) {
      return false;
    }
    
    // Verificar limite de mensagens
    const messageCount = await this.getHourlyMessageCount(sessionId, userId);
    if (messageCount >= config.message_limit_per_hour) {
      return false;
    }
    
    // Verificar período de descanso
    if (await this.isInRestPeriod(sessionId, config)) {
      return false;
    }
    
    return true;
  }
  
  async applyResponseDelay(sessionId: string): Promise<void> {
    const config = await this.getTimingConfig(sessionId);
    
    if (config.typing_simulation) {
      await this.simulateTyping(sessionId);
    }
    
    await this.delay(config.response_delay * 1000);
  }
  
  async applyMessageDelay(sessionId: string): Promise<void> {
    const config = await this.getTimingConfig(sessionId);
    await this.delay(config.message_delay);
  }
}
```

---

## 🎯 Sistema de Sugestões Inteligentes

### Lógica de Sugestões
Após cada comando executado, o sistema analisa:
1. **Contexto do comando** executado
2. **Estado atual** das sessões
3. **Padrões de uso** do administrador
4. **Ações relacionadas** mais comuns

### Exemplos de Sugestões

**Após `!nova_sessao vendas`:**
```
✅ Sessão 'vendas' criada com sucesso!

💡 Sugestões relacionadas:
• !configurar_sessao vendas - Configure a nova sessão
• !prompt_sessao vendas - Defina um prompt personalizado
• !iniciar_sessao vendas - Inicie a sessão agora
```

**Após `!parar_sessao suporte`:**
```
✅ Sessão 'suporte' pausada!

💡 Sugestões relacionadas:
• !logs_sessao suporte - Veja os últimos logs
• !backup_sessao suporte - Faça backup antes de mudanças
• !reiniciar_sessao suporte - Reinicie quando necessário
```

**Após `!dashboard`:**
```
📊 Dashboard atualizado!

💡 Sugestões relacionadas:
• !metricas_sessao [nome] - Métricas específicas
• !usuarios_ativos [nome] - Veja usuários ativos
• !conversas_recentes [nome] - Últimas conversas
```

**Após `!tempo_resposta vendas 3`:**
```
✅ Tempo de resposta configurado para 3 segundos!

💡 Sugestões relacionadas:
• !delay_mensagem vendas 1200 - Configure delay entre mensagens
• !config_timing vendas - Configure todos os timings
• !horario_funcionamento vendas - Defina horário de trabalho
```

**Após `!config_timing suporte`:**
```
⚙️ Wizard de timing iniciado para 'suporte'!

💡 Sugestões relacionadas:
• !limite_mensagens suporte 100 - Defina limite de mensagens
• !tempo_descanso suporte 0 - Configure período de descanso
• !iniciar_sessao suporte - Inicie a sessão configurada
```

**Após `!horario_funcionamento comercial 08:00-18:00`:**
```
🕐 Horário comercial configurado (08:00-18:00)!

💡 Sugestões relacionadas:
• !tempo_resposta comercial 2 - Configure tempo de resposta
• !limite_mensagens comercial 50 - Defina limite para horário comercial
• !tempo_descanso comercial 60 - Configure pausa para almoço
```

### Algoritmo de Sugestões
```typescript
interface SuggestionEngine {
  generateSuggestions(command: string, context: AdminContext): Suggestion[];
}

class IntelligentSuggestionEngine implements SuggestionEngine {
  private suggestionRules: Map<string, SuggestionRule[]>;
  
  generateSuggestions(command: string, context: AdminContext): Suggestion[] {
    const baseRules = this.suggestionRules.get(command) || [];
    const contextualSuggestions = this.analyzeContext(context);
    const personalizedSuggestions = this.analyzeUsagePatterns(context.adminId);
    
    return this.rankAndFilter([
      ...baseRules.map(rule => rule.generate(context)),
      ...contextualSuggestions,
      ...personalizedSuggestions
    ]);
  }
}
```

---

## 🔧 Implementação Técnica

### Estrutura de Arquivos
```
src/
├── core/
│   ├── SessionManager.ts          # Gerenciador principal de sessões
│   ├── AdminCommandHandler.ts     # Processador de comandos admin
│   └── SuggestionEngine.ts        # Motor de sugestões
├── services/
│   ├── SupabaseService.ts         # Integração com Supabase
│   ├── WhatsAppService.ts         # Serviços WhatsApp por sessão
│   └── AIService.ts               # Serviços de IA personalizados
├── models/
│   ├── Session.ts                 # Modelo de sessão
│   ├── User.ts                    # Modelo de usuário
│   └── AdminCommand.ts            # Modelo de comando admin
└── utils/
    ├── QRCodeGenerator.ts         # Gerador de QR Code
    ├── ConfigWizard.ts            # Wizard de configuração
    └── MetricsCollector.ts        # Coletor de métricas
```

### Exemplo: AdminCommandHandler
```typescript
export class AdminCommandHandler {
  private supabase: SupabaseService;
  private suggestionEngine: SuggestionEngine;
  private sessionManager: SessionManager;

  async handleCommand(adminPhone: string, command: string): Promise<string> {
    const parsedCommand = this.parseCommand(command);
    let response: string;
    
    try {
      response = await this.executeCommand(parsedCommand, adminPhone);
      
      // Registrar ação no banco
      await this.logAdminAction(adminPhone, parsedCommand);
      
      // Gerar sugestões inteligentes
      const suggestions = await this.suggestionEngine.generateSuggestions(
        parsedCommand.action,
        { adminPhone, sessionStates: await this.getSessionStates() }
      );
      
      // Adicionar sugestões à resposta
      if (suggestions.length > 0) {
        response += '\n\n💡 Sugestões relacionadas:\n';
        response += suggestions.map(s => `• ${s.command} - ${s.description}`).join('\n');
      }
      
    } catch (error) {
      response = `❌ Erro: ${error.message}`;
    }
    
    return response;
  }

  private async executeCommand(command: ParsedCommand, adminPhone: string): Promise<string> {
    switch (command.action) {
      case 'nova_sessao':
        return await this.createNewSession(command.params[0], adminPhone);
      
      case 'listar_sessoes':
        return await this.listSessions();
      
      case 'configurar_sessao':
        return await this.startConfigWizard(command.params[0], adminPhone);
      
      case 'ajuda':
        return this.getHelpText(command.params[0]);
      
      // Comandos de Timing
      case 'tempo_resposta':
        return await this.setResponseTime(command.params[0], parseInt(command.params[1]));
      
      case 'delay_mensagem':
        return await this.setMessageDelay(command.params[0], parseInt(command.params[1]));
      
      case 'tempo_descanso':
        return await this.setRestPeriod(command.params[0], parseInt(command.params[1]));
      
      case 'horario_funcionamento':
        return await this.setWorkingHours(command.params[0], command.params[1]);
      
      case 'limite_mensagens':
        return await this.setMessageLimit(command.params[0], parseInt(command.params[1]));
      
      case 'config_timing':
        return await this.startTimingWizard(command.params[0], adminPhone);
      
      // ... outros comandos
      
      default:
        return '❌ Comando não reconhecido. Use !ajuda para ver comandos disponíveis.';
    }
  }

  private getHelpText(specificCommand?: string): string {
    if (specificCommand) {
      return this.getSpecificHelp(specificCommand);
    }
    
    return `
📚 **COMANDOS DISPONÍVEIS**

**🆕 Criação e Listagem:**
• !nova_sessao [nome] - Cria nova sessão
• !listar_sessoes - Lista todas as sessões
• !status_sessao [nome] - Status detalhado

**⚙️ Configuração:**
• !configurar_sessao [nome] - Wizard de configuração
• !prompt_sessao [nome] [prompt] - Define prompt personalizado
• !ia_sessao [nome] [provider] - Configura provedor de IA
• !config_avancada [nome] - Configurações avançadas
• !tempo_resposta [nome] [segundos] - Tempo de resposta da IA
• !delay_mensagem [nome] [ms] - Delay entre mensagens
• !tempo_descanso [nome] [minutos] - Período de descanso
• !horario_funcionamento [nome] [inicio-fim] - Horário de funcionamento
• !limite_mensagens [nome] [quantidade] - Limite de mensagens/hora
• !config_timing [nome] - Wizard de configurações de tempo

**🎮 Controle:**
• !iniciar_sessao [nome] - Inicia sessão (QR Code)
• !parar_sessao [nome] - Para sessão
• !reiniciar_sessao [nome] - Reinicia sessão
• !deletar_sessao [nome] - Remove sessão
• !pausar_sessao [nome] - Pausa temporariamente
• !reativar_sessao [nome] - Reativa sessão

**📊 Monitoramento:**
• !dashboard - Dashboard geral
• !logs_sessao [nome] - Logs específicos
• !metricas_sessao [nome] - Métricas detalhadas
• !usuarios_ativos [nome] - Usuários ativos
• !conversas_recentes [nome] - Últimas conversas

**🔧 Manutenção:**
• !backup_sessao [nome] - Força backup
• !limpar_cache [nome] - Limpa cache
• !resetar_contexto [nome] - Reseta contexto
• !exportar_dados [nome] - Exporta dados

**❓ Ajuda:**
• !ajuda - Esta lista de comandos
• !ajuda [comando] - Ajuda específica

**⏱️ Configurações de Timing:**
• !tempo_resposta [nome] [segundos] - Tempo de resposta da IA
• !delay_mensagem [nome] [ms] - Delay entre mensagens
• !tempo_descanso [nome] [minutos] - Período de descanso
• !horario_funcionamento [nome] [inicio-fim] - Horário de funcionamento
• !limite_mensagens [nome] [quantidade] - Limite de mensagens/hora
• !config_timing [nome] - Wizard de configurações de tempo

💡 **Dica:** Após cada comando, receba sugestões automáticas de ações relacionadas!
    `;
  }
}
```

### Exemplo: Sistema de Sugestões
```typescript
export class SuggestionEngine {
  private rules: Map<string, SuggestionRule[]> = new Map([
    ['nova_sessao', [
      { command: '!configurar_sessao', description: 'Configure a nova sessão', priority: 1 },
      { command: '!prompt_sessao', description: 'Defina um prompt personalizado', priority: 2 },
      { command: '!iniciar_sessao', description: 'Inicie a sessão agora', priority: 3 }
    ]],
    ['parar_sessao', [
      { command: '!logs_sessao', description: 'Veja os últimos logs', priority: 1 },
      { command: '!backup_sessao', description: 'Faça backup antes de mudanças', priority: 2 },
      { command: '!reiniciar_sessao', description: 'Reinicie quando necessário', priority: 3 }
    ]],
    ['dashboard', [
      { command: '!metricas_sessao', description: 'Métricas específicas', priority: 1 },
      { command: '!usuarios_ativos', description: 'Veja usuários ativos', priority: 2 },
      { command: '!conversas_recentes', description: 'Últimas conversas', priority: 3 }
    ]]
  ]);

  async generateSuggestions(command: string, context: AdminContext): Promise<Suggestion[]> {
    const baseSuggestions = this.rules.get(command) || [];
    const contextualSuggestions = await this.getContextualSuggestions(command, context);
    
    return [...baseSuggestions, ...contextualSuggestions]
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 3); // Máximo 3 sugestões
  }

  private async getContextualSuggestions(command: string, context: AdminContext): Promise<Suggestion[]> {
    // Lógica para sugestões baseadas no contexto atual
    const suggestions: Suggestion[] = [];
    
    // Exemplo: Se há sessões inativas, sugerir reativação
    if (context.inactiveSessions?.length > 0) {
      suggestions.push({
        command: '!reativar_sessao',
        description: `Reative ${context.inactiveSessions.length} sessão(ões) inativa(s)`,
        priority: 1
      });
    }
    
    return suggestions;
  }
}

### Implementação dos Comandos de Timing
```typescript
export class AdminCommandHandler {
  // ... código anterior ...
  
  private async setResponseTime(sessionName: string, seconds: number): Promise<string> {
    if (!sessionName || seconds < 0 || seconds > 30) {
      return '❌ Uso: !tempo_resposta [nome] [segundos] (0-30 segundos)';
    }
    
    const session = await this.sessionManager.getSession(sessionName);
    if (!session) {
      return `❌ Sessão '${sessionName}' não encontrada.`;
    }
    
    await this.supabase.updateSessionTimingConfig(session.id, {
      response_delay: seconds
    });
    
    return `✅ Tempo de resposta configurado para ${seconds} segundos na sessão '${sessionName}'!`;
  }
  
  private async setMessageDelay(sessionName: string, milliseconds: number): Promise<string> {
    if (!sessionName || milliseconds < 0 || milliseconds > 10000) {
      return '❌ Uso: !delay_mensagem [nome] [ms] (0-10000 ms)';
    }
    
    const session = await this.sessionManager.getSession(sessionName);
    if (!session) {
      return `❌ Sessão '${sessionName}' não encontrada.`;
    }
    
    await this.supabase.updateSessionTimingConfig(session.id, {
      message_delay: milliseconds
    });
    
    return `✅ Delay entre mensagens configurado para ${milliseconds}ms na sessão '${sessionName}'!`;
  }
  
  private async setRestPeriod(sessionName: string, minutes: number): Promise<string> {
    if (!sessionName || minutes < 0 || minutes > 480) {
      return '❌ Uso: !tempo_descanso [nome] [minutos] (0-480 minutos, 0 = desabilitado)';
    }
    
    const session = await this.sessionManager.getSession(sessionName);
    if (!session) {
      return `❌ Sessão '${sessionName}' não encontrada.`;
    }
    
    await this.supabase.updateSessionTimingConfig(session.id, {
      rest_period_minutes: minutes
    });
    
    const status = minutes === 0 ? 'desabilitado' : `${minutes} minutos`;
    return `✅ Período de descanso configurado para ${status} na sessão '${sessionName}'!`;
  }
  
  private async setWorkingHours(sessionName: string, hours: string): Promise<string> {
    if (!sessionName || !hours) {
      return '❌ Uso: !horario_funcionamento [nome] [inicio-fim] (ex: 08:00-18:00)';
    }
    
    const hoursRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]-([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!hoursRegex.test(hours)) {
      return '❌ Formato inválido. Use: HH:MM-HH:MM (ex: 08:00-18:00)';
    }
    
    const [start, end] = hours.split('-');
    const session = await this.sessionManager.getSession(sessionName);
    if (!session) {
      return `❌ Sessão '${sessionName}' não encontrada.`;
    }
    
    await this.supabase.updateSessionTimingConfig(session.id, {
      working_hours: { start, end }
    });
    
    return `✅ Horário de funcionamento configurado para ${hours} na sessão '${sessionName}'!`;
  }
  
  private async setMessageLimit(sessionName: string, limit: number): Promise<string> {
    if (!sessionName || limit < 1 || limit > 1000) {
      return '❌ Uso: !limite_mensagens [nome] [quantidade] (1-1000 mensagens/hora)';
    }
    
    const session = await this.sessionManager.getSession(sessionName);
    if (!session) {
      return `❌ Sessão '${sessionName}' não encontrada.`;
    }
    
    await this.supabase.updateSessionTimingConfig(session.id, {
      message_limit_per_hour: limit
    });
    
    return `✅ Limite de mensagens configurado para ${limit}/hora na sessão '${sessionName}'!`;
  }
  
  private async startTimingWizard(sessionName: string, adminPhone: string): Promise<string> {
    const session = await this.sessionManager.getSession(sessionName);
    if (!session) {
      return `❌ Sessão '${sessionName}' não encontrada.`;
    }
    
    // Iniciar wizard interativo
    await this.configWizard.startTimingWizard(adminPhone, sessionName);
    
    return `⚙️ **Wizard de Configurações de Timing - ${sessionName}**

Vamos configurar os tempos de resposta da sua sessão!

**Passo 1/6:** Tempo de resposta da IA
Quantos segundos a IA deve aguardar antes de responder?

• Digite um número de 0 a 30 segundos
• Recomendado: 2-5 segundos para parecer mais humano
• Digite 'pular' para manter atual

*Responda com apenas o número desejado.*`;
  }
}
```
```

---

## 🚀 Fluxo de Implementação

### Fase 1: Preparação do Banco de Dados (2-3 horas)
1. **Configurar Supabase**
   - Criar tabelas conforme schema
   - Configurar RLS (Row Level Security)
   - Criar índices para performance

2. **Configurar Autenticação**
   - Service role para operações admin
   - Anon key para operações públicas
   - Configurar políticas de acesso

### Fase 2: Core do Sistema (4-6 horas)
1. **SessionManager**
   - Gerenciamento de múltiplas sessões
   - Isolamento de dados por sessão
   - Persistência no Supabase

2. **AdminCommandHandler**
   - Parser de comandos
   - Execução de ações administrativas
   - Sistema de validação e segurança

3. **SuggestionEngine**
   - Motor de sugestões inteligentes
   - Análise de contexto
   - Personalização baseada em uso

### Fase 3: Integração WhatsApp (4-5 horas)
1. **Detecção de Comandos Admin**
   - Identificar mensagens de comando
   - Validar permissões de administrador
   - Processar comandos em tempo real

2. **QR Code Dinâmico**
   - Geração de QR Code por sessão
   - Envio automático via WhatsApp
   - Monitoramento de conexão

3. **Wizard de Configuração**
   - Fluxo interativo de configuração
   - Validação de inputs
   - Persistência de configurações

4. **Sistema de Timing**
   - Implementar todos os comandos de timing
   - Wizard interativo de configurações de tempo
   - Validação e aplicação de delays e limites

### Fase 4: Sistema de Memória e Timing (5-6 horas)
1. **Contexto Inteligente**
   - Reconhecimento de usuários
   - Histórico de conversas
   - Aprendizado contínuo

2. **Prompts Personalizados**
   - Sistema de templates
   - Variáveis dinâmicas
   - Configuração por sessão

3. **Motor de Timing**
   - Aplicação de delays de resposta
   - Controle de horário de funcionamento
   - Simulação de digitação
   - Limites de mensagens por usuário

### Fase 5: Monitoramento e Métricas (2-3 horas)
1. **Dashboard em Tempo Real**
   - Métricas por sessão
   - Status de conexões
   - Usuários ativos

2. **Sistema de Logs**
   - Logs estruturados
   - Filtragem por sessão
   - Alertas automáticos

### Fase 6: Testes e Validação (2-3 horas)
1. **Testes de Comandos**
   - Validar todos os comandos admin
   - Testar fluxos de configuração
   - Verificar isolamento de dados

2. **Testes de Integração**
   - Múltiplas sessões simultâneas
   - Reconexão automática
   - Backup e recuperação

---

## 🎯 Benefícios da Arquitetura

### Para o Administrador
- **Controle Total via WhatsApp**: Não precisa sair do aplicativo
- **Sugestões Inteligentes**: Sistema aprende padrões de uso
- **Configuração Flexível**: Cada sessão pode ter comportamento único
- **Monitoramento em Tempo Real**: Dashboard completo via comandos
- **Múltiplos Administradores**: Sistema suporta vários admins

### Para os Usuários
- **Experiência Personalizada**: IA se adapta a cada usuário
- **Contexto Preservado**: Conversas mantêm histórico completo
- **Respostas Inteligentes**: Sistema aprende com feedback
- **Isolamento Garantido**: Dados não vazam entre sessões

### Para o Sistema
- **Escalabilidade**: Suporta múltiplas sessões simultâneas
- **Confiabilidade**: Backup automático no Supabase
- **Manutenibilidade**: Código modular e bem estruturado
- **Observabilidade**: Logs e métricas completas
- **Controle de Timing**: Sistema avançado de delays e limites
- **Simulação Humana**: Comportamento natural com tempos realistas

---

## 📝 Próximos Passos

1. **Revisar e Aprovar** este planejamento completo
2. **Configurar Supabase** com as credenciais fornecidas
3. **Implementar Fase 1** (Preparação do Banco)
4. **Desenvolver Core** do sistema (Fase 2)
5. **Integrar WhatsApp** (Fase 3)
6. **Implementar Memória e Timing** (Fase 4)
7. **Adicionar Monitoramento** (Fase 5)
8. **Testar e Validar** (Fase 6)

## 🆕 Novidades Adicionadas

### Comandos de Timing Implementados
- ✅ **6 novos comandos** para controle de timing
- ✅ **Wizard interativo** para configuração completa
- ✅ **Validação robusta** de parâmetros
- ✅ **Sugestões inteligentes** específicas para timing
- ✅ **Exemplos práticos** de configuração

### Funcionalidades de Timing
- ⏱️ **Tempo de resposta** configurável (0-30 segundos)
- 📨 **Delay entre mensagens** (0-10 segundos)
- 😴 **Períodos de descanso** automáticos
- 🕐 **Horários de funcionamento** personalizados
- 🚫 **Limites de mensagens** por usuário/hora
- 💬 **Simulação de digitação** realista

### Benefícios do Sistema de Timing
- 🤖 **Comportamento mais humano** da IA
- 🛡️ **Proteção contra spam** e abuso
- ⚡ **Controle de carga** do sistema
- 🎯 **Experiência personalizada** por sessão
- 📊 **Métricas de performance** aprimoradas

---

## 🔐 Configurações do Supabase

**Credenciais fornecidas:**
- Project ID: `rnqvgqjqvqhqjqvqhqjq`
- Anon Public Key: `[fornecida]`
- Service Role Secret: `[fornecida]`
- Access Token: `[fornecida]`
- Senha: `[fornecida]`

**Próximo passo:** Aguardando aprovação para iniciar implementação.

---

*Este documento representa o planejamento completo consolidado de todas as discussões anteriores. Após aprovação, iniciaremos a implementação seguindo as fases definidas.*