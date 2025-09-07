-- Schema completo do sistema de IA com memória persistente
-- Criado para o projeto WhatsApp Bot com Supabase

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. Tabela principal para gerenciar sessões do WhatsApp
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

-- 2. Tabela para usuários do WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  profile_data JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela para conversas
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

-- 4. Tabela para mensagens
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'ai', 'system')),
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'document', 'command')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabela para contexto dos usuários
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

-- 6. Tabela para comandos administrativos
CREATE TABLE IF NOT EXISTS admin_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
  command_name VARCHAR(100) NOT NULL,
  parameters JSONB DEFAULT '{}',
  executed_by VARCHAR(20) NOT NULL,
  execution_result JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Tabela para métricas do sistema
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
  metric_type VARCHAR(50) NOT NULL,
  metric_value JSONB NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Tabela para dados de aprendizado
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

-- ÍNDICES PARA OTIMIZAÇÃO

-- Índices para whatsapp_sessions
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_session_name ON whatsapp_sessions(session_name);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone_number ON whatsapp_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_is_active ON whatsapp_sessions(is_active);

-- Índices para whatsapp_users
CREATE INDEX IF NOT EXISTS idx_whatsapp_users_phone_number ON whatsapp_users(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_users_name ON whatsapp_users(name);
CREATE INDEX IF NOT EXISTS idx_whatsapp_users_is_active ON whatsapp_users(is_active);

-- Índices para conversations
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_interaction ON conversations(last_interaction);

-- Índices para messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON messages(sender_type);
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Índices para user_context
CREATE INDEX IF NOT EXISTS idx_user_context_user_id ON user_context(user_id);
CREATE INDEX IF NOT EXISTS idx_user_context_session_id ON user_context(session_id);
CREATE INDEX IF NOT EXISTS idx_user_context_context_type ON user_context(context_type);
CREATE INDEX IF NOT EXISTS idx_user_context_relevance_score ON user_context(relevance_score);
CREATE INDEX IF NOT EXISTS idx_user_context_expires_at ON user_context(expires_at);

-- Índices para admin_commands
CREATE INDEX IF NOT EXISTS idx_admin_commands_session_id ON admin_commands(session_id);
CREATE INDEX IF NOT EXISTS idx_admin_commands_command_name ON admin_commands(command_name);
CREATE INDEX IF NOT EXISTS idx_admin_commands_executed_by ON admin_commands(executed_by);
CREATE INDEX IF NOT EXISTS idx_admin_commands_created_at ON admin_commands(created_at);

-- Índices para system_metrics
CREATE INDEX IF NOT EXISTS idx_system_metrics_session_id ON system_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_system_metrics_metric_type ON system_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON system_metrics(recorded_at);

-- Índices para learning_data
CREATE INDEX IF NOT EXISTS idx_learning_data_session_id ON learning_data(session_id);
CREATE INDEX IF NOT EXISTS idx_learning_data_user_id ON learning_data(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_data_interaction_type ON learning_data(interaction_type);
CREATE INDEX IF NOT EXISTS idx_learning_data_feedback_score ON learning_data(feedback_score);
CREATE INDEX IF NOT EXISTS idx_learning_data_learning_tags ON learning_data USING GIN(learning_tags);
CREATE INDEX IF NOT EXISTS idx_learning_data_created_at ON learning_data(created_at);

-- TRIGGERS PARA ATUALIZAR updated_at

CREATE TRIGGER update_whatsapp_sessions_updated_at
  BEFORE UPDATE ON whatsapp_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_users_updated_at
  BEFORE UPDATE ON whatsapp_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_context_updated_at
  BEFORE UPDATE ON user_context
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- COMENTÁRIOS PARA DOCUMENTAÇÃO

COMMENT ON TABLE whatsapp_sessions IS 'Tabela para gerenciar sessões ativas do WhatsApp Bot';
COMMENT ON COLUMN whatsapp_sessions.session_name IS 'Nome único da sessão';
COMMENT ON COLUMN whatsapp_sessions.phone_number IS 'Número de telefone associado à sessão';
COMMENT ON COLUMN whatsapp_sessions.ai_config IS 'Configurações específicas da IA para esta sessão';
COMMENT ON COLUMN whatsapp_sessions.timing_config IS 'Configurações de timing e delays para esta sessão';

COMMENT ON TABLE whatsapp_users IS 'Tabela para armazenar informações dos usuários do WhatsApp';
COMMENT ON COLUMN whatsapp_users.profile_data IS 'Dados do perfil do usuário (nome, foto, etc.)';
COMMENT ON COLUMN whatsapp_users.preferences IS 'Preferências do usuário (idioma, notificações, etc.)';

COMMENT ON TABLE conversations IS 'Tabela para gerenciar conversas entre usuários e sessões';
COMMENT ON COLUMN conversations.conversation_data IS 'Dados específicos da conversa (histórico resumido, tópicos, etc.)';
COMMENT ON COLUMN conversations.context_summary IS 'Resumo do contexto atual da conversa';

COMMENT ON TABLE messages IS 'Tabela para armazenar todas as mensagens trocadas';
COMMENT ON COLUMN messages.metadata IS 'Metadados da mensagem (timestamp, status de entrega, etc.)';

COMMENT ON TABLE user_context IS 'Tabela para armazenar contexto específico dos usuários';
COMMENT ON COLUMN user_context.relevance_score IS 'Pontuação de relevância do contexto (0.0 a 1.0)';
COMMENT ON COLUMN user_context.expires_at IS 'Data de expiração do contexto (NULL = nunca expira)';

COMMENT ON TABLE admin_commands IS 'Tabela para registrar comandos administrativos executados';
COMMENT ON COLUMN admin_commands.execution_result IS 'Resultado da execução do comando';

COMMENT ON TABLE system_metrics IS 'Tabela para armazenar métricas do sistema';
COMMENT ON COLUMN system_metrics.metric_value IS 'Valor da métrica em formato JSON';

COMMENT ON TABLE learning_data IS 'Tabela para armazenar dados de aprendizado da IA';
COMMENT ON COLUMN learning_data.feedback_score IS 'Pontuação de feedback (1-5 estrelas)';
COMMENT ON COLUMN learning_data.learning_tags IS 'Tags para categorizar o aprendizado';

-- INSERIR DADOS INICIAIS

-- Inserir sessão padrão se não existir
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

-- Inserir segunda sessão se não existir
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
