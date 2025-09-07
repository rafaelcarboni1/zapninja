-- Adicionar constraint única para user_context
ALTER TABLE user_context ADD CONSTRAINT user_context_unique_key UNIQUE (user_id, session_id, context_type);