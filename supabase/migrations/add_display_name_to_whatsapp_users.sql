-- Adiciona coluna display_name à tabela whatsapp_users
-- Esta migração resolve o erro: Could not find the display_name column of whatsapp_users in the schema cache

ALTER TABLE whatsapp_users 
ADD COLUMN display_name VARCHAR(255);

-- Atualiza registros existentes copiando o valor de 'name' para 'display_name'
UPDATE whatsapp_users 
SET display_name = name 
WHERE name IS NOT NULL;

-- Adiciona comentário à coluna
COMMENT ON COLUMN whatsapp_users.display_name IS 'Nome de exibição do usuário no WhatsApp';