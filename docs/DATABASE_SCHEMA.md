# ZAPNINJA - Documentação do Banco de Dados Supabase

## Visão Geral

O ZAPNINJA utiliza PostgreSQL através da plataforma Supabase para armazenamento de dados persistente. O esquema foi projetado para suportar múltiplas sessões, usuários, conversas e um sistema avançado de contexto e memória conversacional.

## Configuração do Supabase

### Conexão e Autenticação

```typescript
// Configuração Principal (src/config/supabase.ts)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Cliente Público (operações básicas)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente Administrativo (privilégios elevados)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
```

### Variáveis de Ambiente Necessárias

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Esquema do Banco de Dados

### Função de Trigger para updated_at

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';
```

## Tabelas do Sistema

### 1. whatsapp_sessions
**Propósito**: Gerencia as sessões ativas do WhatsApp Bot

```sql
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_name VARCHAR(100) UNIQUE NOT NULL,
  phone_number VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  ai_config JSONB DEFAULT '{}',
  timing_config JSONB DEFAULT '{}',
  custom_prompt TEXT,
  max_messages INTEGER DEFAULT 100 CHECK (max_messages > 0 AND max_messages <= 1000),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Campos Detalhados:
- `id`: Identificador único da sessão
- `session_name`: Nome único da sessão (usado para identificação)
- `phone_number`: Número do WhatsApp associado à sessão
- `is_active`: Status ativo/inativo da sessão
- `ai_config`: Configurações específicas da IA (JSON)
  ```json
  {
    "model": "gpt-4",
    "temperature": 0.7,
    "max_tokens": 2000,
    "system_prompt": "Você é um assistente virtual..."
  }
  ```
- `timing_config`: Configurações de timing e delays (JSON)
  ```json
  {
    "response_time": 2000,
    "message_delay": 1000,
    "rest_period": 300000,
    "working_hours": {"start": "08:00", "end": "22:00"},
    "message_limit_per_hour": 100,
    "typing_simulation": true
  }
  ```
- `custom_prompt`: Prompt personalizado para a sessão
- `max_messages`: Limite máximo de mensagens por conversa

#### Índices:
```sql
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_session_name ON whatsapp_sessions(session_name);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone_number ON whatsapp_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_is_active ON whatsapp_sessions(is_active);
```

### 2. whatsapp_users
**Propósito**: Armazena informações dos usuários do WhatsApp

```sql
CREATE TABLE IF NOT EXISTS whatsapp_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255),
  display_name VARCHAR(255),
  profile_data JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Campos Detalhados:
- `phone_number`: Número único do usuário (chave natural)
- `name`: Nome do usuário no WhatsApp
- `display_name`: Nome de exibição personalizado
- `profile_data`: Dados do perfil extraídos do WhatsApp (JSON)
  ```json
  {
    "avatar_url": "https://...",
    "status": "Disponível",
    "last_seen": "2024-01-15T10:30:00Z",
    "business_account": false
  }
  ```
- `preferences`: Preferências do usuário (JSON)
  ```json
  {
    "language": "pt-BR",
    "notifications": true,
    "preferred_response_style": "formal",
    "timezone": "America/Sao_Paulo"
  }
  ```

#### Índices:
```sql
CREATE INDEX IF NOT EXISTS idx_whatsapp_users_phone_number ON whatsapp_users(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_users_name ON whatsapp_users(name);
```

### 3. conversations
**Propósito**: Mapeia conversas entre usuários e sessões

```sql
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES whatsapp_users(id) ON DELETE CASCADE,
  conversation_data JSONB DEFAULT '{}',
  context_summary TEXT,
  last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);
```

#### Campos Detalhados:
- `session_id`: Referência à sessão do WhatsApp
- `user_id`: Referência ao usuário
- `conversation_data`: Dados específicos da conversa (JSON)
  ```json
  {
    "total_messages": 145,
    "avg_response_time": 2.5,
    "conversation_score": 4.2,
    "topics": ["tecnologia", "suporte", "vendas"],
    "language_detected": "pt-BR",
    "sentiment_history": ["positive", "neutral", "positive"]
  }
  ```
- `context_summary`: Resumo textual do contexto atual
- `last_interaction`: Timestamp da última interação

#### Índices:
```sql
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_interaction ON conversations(last_interaction);
```

### 4. messages
**Propósito**: Armazena todas as mensagens trocadas

```sql
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'ai', 'system')),
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'document', 'command')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Campos Detalhados:
- `conversation_id`: Referência à conversa
- `sender_type`: Tipo do remetente (user/ai/system)
- `content`: Conteúdo da mensagem
- `message_type`: Tipo da mensagem
- `metadata`: Metadados da mensagem (JSON)
  ```json
  {
    "timestamp": "2024-01-15T10:30:00Z",
    "ai_model": "gpt-4",
    "response_time": 1.2,
    "tokens_used": 150,
    "confidence_score": 0.95,
    "message_id": "3EB0C767D95A2C5E626F",
    "retry_count": 0
  }
  ```

#### Índices:
```sql
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON messages(sender_type);
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
```

### 5. user_context
**Propósito**: Sistema inteligente de contexto dos usuários

```sql
CREATE TABLE IF NOT EXISTS user_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES whatsapp_users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
  context_type VARCHAR(50) NOT NULL,
  context_data JSONB NOT NULL,
  relevance_score DECIMAL(3,2) DEFAULT 1.0 CHECK (relevance_score >= 0 AND relevance_score <= 1),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, session_id, context_type)
);
```

#### Tipos de Contexto e Estruturas:

**1. user_profile**
```json
{
  "interaction_style": "formal",
  "preferred_topics": ["tecnologia", "negócios"],
  "response_preference": "detailed",
  "common_phrases": ["obrigado", "por favor"],
  "activity_pattern": {
    "most_active_hour": 14,
    "average_session_length": 15,
    "typical_days": ["monday", "wednesday", "friday"]
  }
}
```

**2. conversation_memory**
```json
{
  "current_topic": "suporte técnico",
  "previous_topics": ["vendas", "produto"],
  "unresolved_issues": ["problema com login"],
  "preferences_mentioned": ["atendimento rápido"],
  "important_dates": ["2024-01-20"],
  "follow_up_needed": true
}
```

**3. emotional_state**
```json
{
  "current_mood": "positive",
  "satisfaction_level": 4,
  "frustration_indicators": [],
  "compliments_given": 2,
  "complaints_made": 0
}
```

**4. extracted_entities**
```json
{
  "emails": ["user@example.com"],
  "phone_numbers": ["11999999999"],
  "cpf": ["123.456.789-00"],
  "cnpj": [],
  "addresses": ["Rua das Flores, 123"],
  "money_values": [199.90],
  "dates": ["2024-01-20"],
  "urls": ["https://example.com"]
}
```

#### Índices:
```sql
CREATE INDEX IF NOT EXISTS idx_user_context_user_id ON user_context(user_id);
CREATE INDEX IF NOT EXISTS idx_user_context_session_id ON user_context(session_id);
CREATE INDEX IF NOT EXISTS idx_user_context_context_type ON user_context(context_type);
CREATE INDEX IF NOT EXISTS idx_user_context_relevance_score ON user_context(relevance_score);
CREATE INDEX IF NOT EXISTS idx_user_context_expires_at ON user_context(expires_at);
```

### 6. admin_commands
**Propósito**: Registra comandos administrativos executados

```sql
CREATE TABLE IF NOT EXISTS admin_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
  command_name VARCHAR(100) NOT NULL,
  parameters JSONB DEFAULT '{}',
  executed_by VARCHAR(20) NOT NULL,
  execution_result JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Campos Detalhados:
- `command_name`: Nome do comando executado
- `parameters`: Parâmetros do comando (JSON)
- `executed_by`: Número do admin que executou
- `execution_result`: Resultado da execução (JSON)
  ```json
  {
    "success": true,
    "message": "Sessão criada com sucesso",
    "data": {"session_id": "uuid"},
    "execution_time": 1.2,
    "warnings": []
  }
  ```

#### Índices:
```sql
CREATE INDEX IF NOT EXISTS idx_admin_commands_session_id ON admin_commands(session_id);
CREATE INDEX IF NOT EXISTS idx_admin_commands_command_name ON admin_commands(command_name);
CREATE INDEX IF NOT EXISTS idx_admin_commands_executed_by ON admin_commands(executed_by);
CREATE INDEX IF NOT EXISTS idx_admin_commands_created_at ON admin_commands(created_at);
```

### 7. system_metrics
**Propósito**: Armazena métricas do sistema

```sql
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
  metric_type VARCHAR(50) NOT NULL,
  metric_value JSONB NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Tipos de Métricas:

**1. performance**
```json
{
  "cpu_usage": 45.2,
  "memory_usage": 512.5,
  "response_time_avg": 1.8,
  "messages_per_minute": 12,
  "active_connections": 45
}
```

**2. usage_stats**
```json
{
  "total_messages": 1500,
  "unique_users": 89,
  "active_conversations": 23,
  "commands_executed": 45,
  "ai_requests": 1200
}
```

**3. error_tracking**
```json
{
  "error_count": 2,
  "error_types": ["connection_timeout", "ai_api_limit"],
  "recovery_time": 30,
  "affected_users": 3
}
```

#### Índices:
```sql
CREATE INDEX IF NOT EXISTS idx_system_metrics_session_id ON system_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_system_metrics_metric_type ON system_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON system_metrics(recorded_at);
```

### 8. learning_data
**Propósito**: Armazena dados para aprendizado da IA

```sql
CREATE TABLE IF NOT EXISTS learning_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES whatsapp_users(id) ON DELETE CASCADE,
  interaction_type VARCHAR(50) NOT NULL,
  input_data JSONB NOT NULL,
  output_data JSONB NOT NULL,
  feedback_score INTEGER CHECK (feedback_score >= 1 AND feedback_score <= 5),
  learning_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Campos Detalhados:
- `interaction_type`: Tipo de interação (question, complaint, compliment, etc.)
- `input_data`: Dados de entrada (JSON)
  ```json
  {
    "user_message": "Como fazer login?",
    "context": "primeira_vez",
    "sentiment": "neutral",
    "entities": ["login"]
  }
  ```
- `output_data`: Resposta gerada (JSON)
  ```json
  {
    "ai_response": "Para fazer login...",
    "model_used": "gpt-4",
    "confidence": 0.95,
    "response_time": 1.2
  }
  ```
- `feedback_score`: Pontuação de 1-5 estrelas
- `learning_tags`: Tags para categorização

#### Índices:
```sql
CREATE INDEX IF NOT EXISTS idx_learning_data_session_id ON learning_data(session_id);
CREATE INDEX IF NOT EXISTS idx_learning_data_user_id ON learning_data(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_data_interaction_type ON learning_data(interaction_type);
CREATE INDEX IF NOT EXISTS idx_learning_data_feedback_score ON learning_data(feedback_score);
CREATE INDEX IF NOT EXISTS idx_learning_data_learning_tags ON learning_data USING GIN(learning_tags);
CREATE INDEX IF NOT EXISTS idx_learning_data_created_at ON learning_data(created_at);
```

## Triggers Automáticos

```sql
-- Trigger para whatsapp_sessions
CREATE TRIGGER update_whatsapp_sessions_updated_at
  BEFORE UPDATE ON whatsapp_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para whatsapp_users
CREATE TRIGGER update_whatsapp_users_updated_at
  BEFORE UPDATE ON whatsapp_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para conversations
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para user_context
CREATE TRIGGER update_user_context_updated_at
  BEFORE UPDATE ON user_context
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## Dados Iniciais

### Sessões Padrão

```sql
-- Sessão Principal
INSERT INTO whatsapp_sessions (session_name, is_active, ai_config, timing_config)
VALUES (
  'sessionName',
  true,
  '{
    "model": "gpt-4",
    "temperature": 0.7,
    "max_tokens": 2000,
    "system_prompt": "Você é um assistente virtual inteligente e amigável."
  }',
  '{
    "response_time": 2000,
    "message_delay": 1000,
    "rest_period": 300000,
    "working_hours": {"start": "08:00", "end": "22:00"},
    "message_limit_per_hour": 100,
    "typing_simulation": true
  }'
)
ON CONFLICT (session_name) DO NOTHING;

-- Sessão Secundária
INSERT INTO whatsapp_sessions (session_name, is_active, ai_config, timing_config)
VALUES (
  'sessionName2',
  true,
  '{
    "model": "gpt-4",
    "temperature": 0.7,
    "max_tokens": 2000,
    "system_prompt": "Você é um assistente virtual inteligente e amigável."
  }',
  '{
    "response_time": 2000,
    "message_delay": 1000,
    "rest_period": 300000,
    "working_hours": {"start": "08:00", "end": "22:00"},
    "message_limit_per_hour": 100,
    "typing_simulation": true
  }'
)
ON CONFLICT (session_name) DO NOTHING;
```

## Relacionamentos e Integridade

### Diagrama de Relacionamentos

```
whatsapp_sessions (1) ←→ (N) conversations (N) ←→ (1) whatsapp_users
        ↓                         ↓                           ↓
        ↓                         ↓                           ↓
   admin_commands            messages                  user_context
   system_metrics           learning_data
```

### Cascatas de Deleção

- **whatsapp_sessions**: Ao deletar, remove todas as conversations, admin_commands, system_metrics e learning_data relacionados
- **whatsapp_users**: Ao deletar, remove todas as conversations, user_context e learning_data relacionados  
- **conversations**: Ao deletar, remove todas as messages relacionadas

## Queries Comuns

### 1. Buscar Histórico de Conversa

```sql
SELECT m.content, m.sender_type, m.created_at, m.metadata
FROM messages m
JOIN conversations c ON m.conversation_id = c.id
JOIN whatsapp_users u ON c.user_id = u.id
JOIN whatsapp_sessions s ON c.session_id = s.id
WHERE u.phone_number = '5511999999999'
  AND s.session_name = 'sessionName'
ORDER BY m.created_at DESC
LIMIT 10;
```

### 2. Buscar Contexto do Usuário

```sql
SELECT context_type, context_data, relevance_score, created_at
FROM user_context uc
JOIN whatsapp_users u ON uc.user_id = u.id
JOIN whatsapp_sessions s ON uc.session_id = s.id
WHERE u.phone_number = '5511999999999'
  AND s.session_name = 'sessionName'
  AND (expires_at IS NULL OR expires_at > NOW())
ORDER BY relevance_score DESC;
```

### 3. Estatísticas de Sessão

```sql
SELECT 
  s.session_name,
  COUNT(DISTINCT c.user_id) as unique_users,
  COUNT(m.id) as total_messages,
  AVG(CASE WHEN m.sender_type = 'ai' THEN 
    EXTRACT(EPOCH FROM m.created_at - 
      LAG(m.created_at) OVER (PARTITION BY c.id ORDER BY m.created_at))
  END) as avg_response_time
FROM whatsapp_sessions s
LEFT JOIN conversations c ON s.id = c.session_id
LEFT JOIN messages m ON c.id = m.conversation_id
WHERE s.is_active = true
GROUP BY s.id, s.session_name;
```

### 4. Usuários Mais Ativos

```sql
SELECT 
  u.phone_number,
  u.name,
  COUNT(m.id) as message_count,
  MAX(m.created_at) as last_message,
  AVG(CASE WHEN uc.context_type = 'emotional_state' 
    THEN (uc.context_data->>'satisfaction_level')::integer END) as avg_satisfaction
FROM whatsapp_users u
JOIN conversations c ON u.id = c.user_id
JOIN messages m ON c.id = m.conversation_id
LEFT JOIN user_context uc ON u.id = uc.user_id
WHERE m.created_at > NOW() - INTERVAL '30 days'
GROUP BY u.id, u.phone_number, u.name
ORDER BY message_count DESC
LIMIT 10;
```

## Políticas de Retenção de Dados

### Configuração de TTL

```sql
-- Limpar mensagens antigas (> 90 dias)
DELETE FROM messages 
WHERE created_at < NOW() - INTERVAL '90 days';

-- Limpar contexto expirado
DELETE FROM user_context 
WHERE expires_at < NOW();

-- Arquivar métricas antigas (> 30 dias)
DELETE FROM system_metrics 
WHERE recorded_at < NOW() - INTERVAL '30 days';
```

### Backup e Recovery

```sql
-- Backup de dados essenciais
SELECT * FROM whatsapp_sessions;
SELECT * FROM whatsapp_users;
SELECT * FROM user_context WHERE expires_at IS NULL OR expires_at > NOW();

-- Restore de sessões
INSERT INTO whatsapp_sessions SELECT * FROM backup_sessions ON CONFLICT (session_name) DO UPDATE SET
  ai_config = EXCLUDED.ai_config,
  timing_config = EXCLUDED.timing_config,
  updated_at = NOW();
```

## Monitoramento e Alertas

### Views para Monitoramento

```sql
-- View de Saúde do Sistema
CREATE VIEW system_health AS
SELECT 
  COUNT(CASE WHEN s.is_active THEN 1 END) as active_sessions,
  COUNT(DISTINCT CASE WHEN m.created_at > NOW() - INTERVAL '1 hour' THEN c.user_id END) as active_users_last_hour,
  COUNT(CASE WHEN m.created_at > NOW() - INTERVAL '1 hour' AND m.sender_type = 'ai' THEN 1 END) as ai_responses_last_hour,
  AVG(CASE WHEN m.sender_type = 'ai' AND m.created_at > NOW() - INTERVAL '1 hour' 
    THEN (m.metadata->>'response_time')::float END) as avg_response_time_last_hour
FROM whatsapp_sessions s
LEFT JOIN conversations c ON s.id = c.session_id
LEFT JOIN messages m ON c.id = m.conversation_id;

-- View de Performance por Sessão
CREATE VIEW session_performance AS
SELECT 
  s.session_name,
  s.is_active,
  COUNT(DISTINCT c.user_id) as unique_users,
  COUNT(CASE WHEN m.created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as messages_last_24h,
  AVG(CASE WHEN m.sender_type = 'ai' 
    THEN (m.metadata->>'response_time')::float END) as avg_response_time,
  MAX(m.created_at) as last_activity
FROM whatsapp_sessions s
LEFT JOIN conversations c ON s.id = c.session_id
LEFT JOIN messages m ON c.id = m.conversation_id
GROUP BY s.id, s.session_name, s.is_active;
```

---

*Documentação gerada automaticamente pelo sistema ZAPNINJA*
*Versão: 2.1 - Data: $(date)*