-- Migration: 001_initial_schema
-- Description: Initial database schema for ZAPNINJA
-- Created: 2025-09-05
-- Direction: UP

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. WhatsApp Sessions Table
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_name VARCHAR(255) NOT NULL UNIQUE,
    phone_number VARCHAR(20),
    status VARCHAR(50) NOT NULL DEFAULT 'initializing',
    qr_code TEXT,
    connected_at TIMESTAMP WITH TIME ZONE,
    disconnected_at TIMESTAMP WITH TIME ZONE,
    last_activity TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. WhatsApp Users Table
CREATE TABLE IF NOT EXISTS whatsapp_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255),
    profile_pic_url TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    language VARCHAR(10) DEFAULT 'pt-BR',
    preferences JSONB DEFAULT '{}'::jsonb,
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES whatsapp_users(id) ON DELETE CASCADE,
    is_group BOOLEAN DEFAULT FALSE,
    group_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, user_id, group_id)
);

-- 4. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    message_id VARCHAR(255) NOT NULL,
    from_me BOOLEAN NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'text',
    content TEXT,
    media_url TEXT,
    quoted_message_id VARCHAR(255),
    status VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(conversation_id, message_id)
);

-- 5. User Context Table
CREATE TABLE IF NOT EXISTS user_context (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES whatsapp_users(id) ON DELETE CASCADE,
    context_key VARCHAR(255) NOT NULL,
    context_value TEXT NOT NULL,
    context_type VARCHAR(50) DEFAULT 'general',
    expires_at TIMESTAMP WITH TIME ZONE,
    relevance_score FLOAT DEFAULT 1.0,
    usage_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, context_key)
);

-- 6. Admin Commands Table
CREATE TABLE IF NOT EXISTS admin_commands (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES whatsapp_users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
    command VARCHAR(255) NOT NULL,
    parameters JSONB DEFAULT '{}'::jsonb,
    result TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. System Metrics Table
CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    metric_name VARCHAR(255) NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_unit VARCHAR(50),
    session_id UUID REFERENCES whatsapp_sessions(id) ON DELETE SET NULL,
    tags JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Learning Data Table
CREATE TABLE IF NOT EXISTS learning_data (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES whatsapp_users(id) ON DELETE CASCADE,
    interaction_type VARCHAR(50) NOT NULL,
    input_data TEXT NOT NULL,
    output_data TEXT NOT NULL,
    feedback_score FLOAT,
    feedback_text TEXT,
    model_used VARCHAR(50),
    tokens_used INTEGER,
    processing_time_ms INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_sessions_status ON whatsapp_sessions(status);
CREATE INDEX idx_sessions_updated_at ON whatsapp_sessions(updated_at DESC);
CREATE INDEX idx_users_phone ON whatsapp_users(phone_number);
CREATE INDEX idx_users_admin ON whatsapp_users(is_admin) WHERE is_admin = TRUE;
CREATE INDEX idx_conversations_session ON conversations(session_id);
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX idx_messages_from_me ON messages(from_me);
CREATE INDEX idx_context_user ON user_context(user_id);
CREATE INDEX idx_context_type ON user_context(context_type);
CREATE INDEX idx_context_relevance ON user_context(relevance_score DESC);
CREATE INDEX idx_commands_user ON admin_commands(user_id);
CREATE INDEX idx_commands_session ON admin_commands(session_id);
CREATE INDEX idx_commands_status ON admin_commands(status);
CREATE INDEX idx_commands_executed ON admin_commands(executed_at DESC);
CREATE INDEX idx_metrics_name ON system_metrics(metric_name);
CREATE INDEX idx_metrics_timestamp ON system_metrics(timestamp DESC);
CREATE INDEX idx_learning_user ON learning_data(user_id);
CREATE INDEX idx_learning_type ON learning_data(interaction_type);
CREATE INDEX idx_learning_created ON learning_data(created_at DESC);

-- Create update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON whatsapp_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON whatsapp_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_context_updated_at BEFORE UPDATE ON user_context
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();