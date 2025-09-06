-- Adicionar coluna is_active na tabela whatsapp_users se necessário
-- Esta migração corrige o erro: Could not find the 'is_active' column of 'whatsapp_users'

-- Verificar se a coluna não existe e adicioná-la
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'whatsapp_users' 
        AND column_name = 'is_active'
    ) THEN
        -- Adicionar coluna is_active com valor padrão true
        ALTER TABLE whatsapp_users ADD COLUMN is_active BOOLEAN DEFAULT true;
        
        -- Criar índice para melhor performance
        CREATE INDEX IF NOT EXISTS idx_whatsapp_users_is_active ON whatsapp_users(is_active);
        
        -- Adicionar comentário
        COMMENT ON COLUMN whatsapp_users.is_active IS 'Indica se o usuário está ativo no sistema';
        
        RAISE NOTICE 'Coluna is_active adicionada à tabela whatsapp_users com sucesso';
    ELSE
        RAISE NOTICE 'Coluna is_active já existe na tabela whatsapp_users';
    END IF;
END $$;