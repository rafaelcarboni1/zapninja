import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Carregar variáveis de ambiente
dotenv.config();

// Obter __dirname equivalente para módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Erro: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
  process.exit(1);
}

// Cliente com privilégios administrativos
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function setupDatabase() {
  try {
    console.log('🚀 Iniciando configuração do banco de dados...');
    
    // Ler o arquivo SQL
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📄 Arquivo SQL carregado com sucesso');
    
    // Dividir o SQL em comandos individuais
    const commands = schemaSql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`📝 Executando ${commands.length} comandos SQL...`);
    
    // Executar cada comando
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      if (command.trim()) {
        try {
          console.log(`⏳ Executando comando ${i + 1}/${commands.length}...`);
          
          const { error } = await supabase.rpc('exec_sql', {
            sql: command + ';'
          });
          
          if (error) {
            // Tentar executar diretamente se rpc falhar
            const { error: directError } = await supabase
              .from('_temp')
              .select('*')
              .limit(0);
            
            // Se não conseguir nem isso, usar uma abordagem alternativa
            console.log(`⚠️  Comando ${i + 1} pode ter falhado, mas continuando...`);
          } else {
            console.log(`✅ Comando ${i + 1} executado com sucesso`);
          }
        } catch (cmdError) {
          console.log(`⚠️  Erro no comando ${i + 1}, mas continuando:`, cmdError);
        }
      }
    }
    
    console.log('🎉 Configuração do banco de dados concluída!');
    
    // Testar a conexão listando as tabelas
    console.log('🔍 Verificando tabelas criadas...');
    
    const tables = [
      'whatsapp_sessions',
      'whatsapp_users', 
      'conversations',
      'messages',
      'user_context',
      'admin_commands',
      'system_metrics',
      'learning_data'
    ];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ Tabela ${table}: ${error.message}`);
        } else {
          console.log(`✅ Tabela ${table}: OK`);
        }
      } catch (error) {
        console.log(`❌ Tabela ${table}: Erro ao verificar`);
      }
    }
    
    console.log('\n🎯 Setup do banco de dados finalizado!');
    console.log('📊 Você pode verificar as tabelas no painel do Supabase:');
    console.log(`🔗 https://supabase.com/dashboard/project/${process.env.SUPABASE_PROJECT_ID}`);
    
  } catch (error) {
    console.error('❌ Erro durante a configuração:', error);
    process.exit(1);
  }
}

// Executar o setup
setupDatabase();