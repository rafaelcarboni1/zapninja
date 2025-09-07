-- Migration: 001_initial_schema
-- Description: Rollback initial database schema
-- Created: 2025-09-05
-- Direction: DOWN

-- Drop triggers first
DROP TRIGGER IF EXISTS update_context_updated_at ON user_context;
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
DROP TRIGGER IF EXISTS update_users_updated_at ON whatsapp_users;
DROP TRIGGER IF EXISTS update_sessions_updated_at ON whatsapp_sessions;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop indexes
DROP INDEX IF EXISTS idx_learning_created;
DROP INDEX IF EXISTS idx_learning_type;
DROP INDEX IF EXISTS idx_learning_user;
DROP INDEX IF EXISTS idx_metrics_timestamp;
DROP INDEX IF EXISTS idx_metrics_name;
DROP INDEX IF EXISTS idx_commands_executed;
DROP INDEX IF EXISTS idx_commands_status;
DROP INDEX IF EXISTS idx_commands_session;
DROP INDEX IF EXISTS idx_commands_user;
DROP INDEX IF EXISTS idx_context_relevance;
DROP INDEX IF EXISTS idx_context_type;
DROP INDEX IF EXISTS idx_context_user;
DROP INDEX IF EXISTS idx_messages_from_me;
DROP INDEX IF EXISTS idx_messages_timestamp;
DROP INDEX IF EXISTS idx_messages_conversation;
DROP INDEX IF EXISTS idx_conversations_status;
DROP INDEX IF EXISTS idx_conversations_user;
DROP INDEX IF EXISTS idx_conversations_session;
DROP INDEX IF EXISTS idx_users_admin;
DROP INDEX IF EXISTS idx_users_phone;
DROP INDEX IF EXISTS idx_sessions_updated_at;
DROP INDEX IF EXISTS idx_sessions_status;

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS learning_data;
DROP TABLE IF EXISTS system_metrics;
DROP TABLE IF EXISTS admin_commands;
DROP TABLE IF EXISTS user_context;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS whatsapp_users;
DROP TABLE IF EXISTS whatsapp_sessions;

-- Drop extension
DROP EXTENSION IF EXISTS "uuid-ossp";