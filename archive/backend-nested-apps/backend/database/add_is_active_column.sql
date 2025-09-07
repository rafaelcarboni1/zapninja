-- Adicionar coluna is_active para whatsapp_users
ALTER TABLE whatsapp_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_whatsapp_users_is_active ON whatsapp_users(is_active);

-- Atualizar valores existentes
UPDATE whatsapp_users SET is_active = true WHERE is_active IS NULL;

-- Verificar resultado
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'whatsapp_users' 
AND column_name = 'is_active';
EOF < /dev/null