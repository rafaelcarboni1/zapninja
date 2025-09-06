-- Limpar todas as sessões antigas do WhatsApp
-- Esta migração remove todos os dados das tabelas relacionadas às sessões

-- Limpar mensagens (dependente de conversations)
DELETE FROM messages;

-- Limpar conversas (dependente de whatsapp_users e whatsapp_sessions)
DELETE FROM conversations;

-- Limpar usuários do WhatsApp
DELETE FROM whatsapp_users;

-- Limpar sessões do WhatsApp
DELETE FROM whatsapp_sessions;

-- Resetar sequências para começar do ID 1 novamente
ALTER SEQUENCE messages_id_seq RESTART WITH 1;
ALTER SEQUENCE conversations_id_seq RESTART WITH 1;
ALTER SEQUENCE whatsapp_users_id_seq RESTART WITH 1;
ALTER SEQUENCE whatsapp_sessions_id_seq RESTART WITH 1;