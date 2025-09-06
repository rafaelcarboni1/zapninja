/**
 * @file: 001_initial_schema.sql
 * @responsibility: Initial database schema for Railway PostgreSQL
 * @exports: Database schema, indexes, triggers
 * @imports: none
 * @layer: database
 */

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS user_context CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS whatsapp_users CASCADE;
DROP TABLE IF EXISTS whatsapp_sessions CASCADE;
DROP TABLE IF EXISTS admin_commands CASCADE;
DROP TABLE IF EXISTS system_metrics CASCADE;
DROP TABLE IF EXISTS learning_data CASCADE;

-- Function for auto-updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- CORE TABLES
-- =====================================================

-- 1. WhatsApp Sessions
CREATE TABLE whatsapp_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_name VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    ai_config JSONB DEFAULT '{
        "model": "gemini",
        "temperature": 0.7,
        "max_tokens": 2000,
        "system_prompt": "Você é um assistente virtual inteligente e amigável."
    }',
    timing_config JSONB DEFAULT '{
        "response_time": 2000,
        "message_delay": 1000,
        "rest_period": 300000,
        "working_hours": {"start": "08:00", "end": "22:00"},
        "message_limit_per_hour": 100,
        "typing_simulation": true
    }',
    custom_prompt TEXT,
    max_messages INTEGER DEFAULT 100 CHECK (max_messages > 0 AND max_messages <= 1000),
    qr_code_data TEXT,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_phone_number CHECK (phone_number ~ '^[0-9+\-\s\(\)]+$' OR phone_number IS NULL),
    CONSTRAINT valid_session_name CHECK (LENGTH(session_name) >= 3)
);

-- 2. WhatsApp Users
CREATE TABLE whatsapp_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255),
    display_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    profile_data JSONB DEFAULT '{}',
    preferences JSONB DEFAULT '{
        "language": "pt-BR",
        "notifications": true,
        "theme": "auto"
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_phone_number_users CHECK (phone_number ~ '^[0-9+\-\s\(\)]+$'),
    CONSTRAINT valid_name CHECK (LENGTH(name) >= 1 OR name IS NULL)
);

-- 3. Conversations
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES whatsapp_users(id) ON DELETE CASCADE,
    conversation_data JSONB DEFAULT '{}',
    context_summary TEXT,
    last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(session_id, user_id)
);

-- 4. Messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'ai', 'system')),
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'document', 'command')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT non_empty_content CHECK (LENGTH(TRIM(content)) > 0)
);

-- 5. User Context
CREATE TABLE user_context (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES whatsapp_users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
    context_type VARCHAR(50) NOT NULL,
    context_data JSONB NOT NULL,
    relevance_score DECIMAL(3,2) DEFAULT 1.0 CHECK (relevance_score >= 0 AND relevance_score <= 1),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, session_id, context_type)
);

-- =====================================================
-- SYSTEM TABLES
-- =====================================================

-- 6. Admin Commands Log
CREATE TABLE admin_commands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
    command_name VARCHAR(100) NOT NULL,
    parameters JSONB DEFAULT '{}',
    executed_by VARCHAR(20) NOT NULL,
    execution_result JSONB DEFAULT '{}',
    success BOOLEAN DEFAULT false,
    execution_time_ms INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_command_name CHECK (LENGTH(command_name) >= 1)
);

-- 7. System Metrics
CREATE TABLE system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL,
    metric_value JSONB NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_metric_type CHECK (LENGTH(metric_type) >= 1)
);

-- 8. Learning Data (for AI improvement)
CREATE TABLE learning_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES whatsapp_users(id) ON DELETE CASCADE,
    interaction_type VARCHAR(50) NOT NULL,
    input_data JSONB NOT NULL,
    output_data JSONB NOT NULL,
    feedback_score INTEGER CHECK (feedback_score >= 1 AND feedback_score <= 5),
    learning_tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- WhatsApp Sessions indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_name ON whatsapp_sessions(session_name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_phone ON whatsapp_sessions(phone_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_active ON whatsapp_sessions(is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_last_activity ON whatsapp_sessions(last_activity);

-- WhatsApp Users indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_phone ON whatsapp_users(phone_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_name ON whatsapp_users(name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active ON whatsapp_users(is_active);

-- Conversations indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_session ON conversations(session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_last_interaction ON conversations(last_interaction);

-- Messages indexes (most important for performance)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_created_desc ON messages(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_type ON messages(sender_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_type ON messages(message_type);

-- User Context indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_context_user_session ON user_context(user_id, session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_context_type ON user_context(context_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_context_relevance ON user_context(relevance_score);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_context_expires ON user_context(expires_at);

-- Admin Commands indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_commands_session ON admin_commands(session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_commands_name ON admin_commands(command_name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_commands_executor ON admin_commands(executed_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_commands_created ON admin_commands(created_at);

-- System Metrics indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_session ON system_metrics(session_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_type ON system_metrics(metric_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_metrics_recorded ON system_metrics(recorded_at);

-- Learning Data indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_learning_session_user ON learning_data(session_id, user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_learning_type ON learning_data(interaction_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_learning_tags ON learning_data USING GIN(learning_tags);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_learning_feedback ON learning_data(feedback_score);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATE
-- =====================================================

-- Triggers for updated_at columns
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON whatsapp_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON whatsapp_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_context_updated_at
    BEFORE UPDATE ON user_context
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default session
INSERT INTO whatsapp_sessions (session_name, is_active, custom_prompt) 
VALUES (
    'sessionName', 
    true,
    'Você é o ZAPNINJA, um assistente virtual inteligente especializado em atendimento ao cliente via WhatsApp. Seja sempre cordial, eficiente e útil.'
) ON CONFLICT (session_name) DO NOTHING;

-- Insert test session for development
INSERT INTO whatsapp_sessions (session_name, is_active, custom_prompt) 
VALUES (
    'teste', 
    true,
    'Você é um assistente de testes para desenvolvimento do ZAPNINJA. Ajude com testes e validações.'
) ON CONFLICT (session_name) DO NOTHING;

-- =====================================================
-- VIEWS FOR CONVENIENCE
-- =====================================================

-- View for session statistics
CREATE OR REPLACE VIEW session_stats AS
SELECT 
    s.id,
    s.session_name,
    s.phone_number,
    s.is_active,
    COUNT(DISTINCT c.user_id) as total_users,
    COUNT(DISTINCT CASE WHEN c.last_interaction > NOW() - INTERVAL '24 hours' THEN c.user_id END) as active_users_24h,
    COUNT(m.id) as total_messages,
    COUNT(CASE WHEN m.created_at > NOW() - INTERVAL '24 hours' THEN m.id END) as messages_24h,
    MAX(m.created_at) as last_message_at,
    s.last_activity,
    s.created_at
FROM whatsapp_sessions s
LEFT JOIN conversations c ON s.id = c.session_id
LEFT JOIN messages m ON c.id = m.conversation_id
GROUP BY s.id, s.session_name, s.phone_number, s.is_active, s.last_activity, s.created_at;

-- View for user conversation history
CREATE OR REPLACE VIEW user_conversation_summary AS
SELECT 
    u.id as user_id,
    u.phone_number,
    u.name,
    u.display_name,
    s.session_name,
    c.id as conversation_id,
    COUNT(m.id) as message_count,
    MAX(m.created_at) as last_message_at,
    MIN(m.created_at) as first_message_at,
    c.context_summary,
    c.last_interaction
FROM whatsapp_users u
JOIN conversations c ON u.id = c.user_id
JOIN whatsapp_sessions s ON c.session_id = s.id
LEFT JOIN messages m ON c.id = m.conversation_id
GROUP BY u.id, u.phone_number, u.name, u.display_name, s.session_name, c.id, c.context_summary, c.last_interaction;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE whatsapp_sessions IS 'Tabela principal para gerenciar sessões do WhatsApp Bot';
COMMENT ON TABLE whatsapp_users IS 'Usuários que interagem com o bot via WhatsApp';
COMMENT ON TABLE conversations IS 'Conversas entre usuários e sessões específicas';
COMMENT ON TABLE messages IS 'Todas as mensagens trocadas no sistema';
COMMENT ON TABLE user_context IS 'Contexto inteligente dos usuários para personalização';
COMMENT ON TABLE admin_commands IS 'Log de comandos administrativos executados';
COMMENT ON TABLE system_metrics IS 'Métricas de performance e uso do sistema';
COMMENT ON TABLE learning_data IS 'Dados para aprendizado e melhoria da IA';

-- Success message
SELECT 'ZAPNINJA Railway PostgreSQL Schema created successfully! 🚀' as status;