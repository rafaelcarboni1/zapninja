-- Limpar todas as sessões antigas do WhatsApp Bot
-- Este script remove todos os dados das tabelas mantendo a estrutura

-- Desabilitar verificações de chave estrangeira temporariamente
SET session_replication_role = replica;

-- Limpar dados das tabelas na ordem correta (respeitando foreign keys)
DELETE FROM learning_data;
DELETE FROM system_metrics;
DELETE FROM admin_commands;
DELETE FROM user_context;
DELETE FROM messages;
DELETE FROM conversations;
DELETE FROM whatsapp_users;
DELETE FROM whatsapp_sessions;

-- Reabilitar verificações de chave estrangeira
SET session_replication_role = DEFAULT;

-- Comentário: Todas as sessões antigas foram removidas
-- As tabelas estão vazias e prontas para novas sessões