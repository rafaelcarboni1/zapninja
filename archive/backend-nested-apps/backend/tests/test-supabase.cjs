const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configurações do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testando integração com Supabase...');
console.log('URL:', supabaseUrl);
console.log('Anon Key:', supabaseAnonKey ? 'Configurada ✅' : 'Não configurada ❌');
console.log('Service Role Key:', supabaseServiceRoleKey ? 'Configurada ✅' : 'Não configurada ❌');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Configurações do Supabase não encontradas!');
  process.exit(1);
}

// Cliente público
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente administrativo
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

async function testConnection() {
  console.log('\n📡 Testando conexão básica...');
  
  try {
    // Teste 1: Conexão básica
    const { data, error } = await supabase.from('whatsapp_sessions').select('count').limit(1);
    
    if (error) {
      console.error('❌ Erro na conexão básica:', error.message);
      return false;
    }
    
    console.log('✅ Conexão básica estabelecida');
    
    // Teste 2: Verificar tabelas específicas
    console.log('\n📋 Verificando tabelas específicas...');
    const tablesToCheck = ['whatsapp_sessions', 'whatsapp_users', 'conversations', 'messages'];
    const existingTables = [];
    
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (!error) {
          existingTables.push(table);
          console.log(`✅ Tabela ${table} existe e é acessível`);
        } else {
          console.log(`❌ Tabela ${table}: ${error.message}`);
        }
      } catch (err) {
        console.log(`❌ Tabela ${table}: ${err.message}`);
      }
    }
    
    // Teste 3: Verificar permissões de escrita
    console.log('\n✍️ Testando permissões de escrita...');
    const testData = {
      session_name: 'test_connection_' + Date.now(),
      is_active: false,
      ai_config: { test: true },
      timing_config: { test: true }
    };
    
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from('whatsapp_sessions')
      .insert(testData)
      .select();
    
    if (insertError) {
      console.error('❌ Erro na escrita:', insertError.message);
      return false;
    }
    
    console.log('✅ Escrita funcionando - ID:', insertData[0]?.id);
    
    // Limpar dados de teste
    await supabaseAdmin
      .from('whatsapp_sessions')
      .delete()
      .eq('id', insertData[0]?.id);
    
    console.log('✅ Dados de teste removidos');
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    return false;
  }
}

async function testSchemaAlignment() {
  console.log('\n🏗️ Verificando alinhamento do schema...');
  
  const expectedTables = [
    'whatsapp_sessions',
    'whatsapp_users', 
    'conversations',
    'messages',
    'user_context',
    'admin_commands',
    'system_metrics',
    'learning_data'
  ];
  
  console.log('\n📊 Status das tabelas:');
  let existingCount = 0;
  
  for (const table of expectedTables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (!error) {
        console.log(`  ✅ ${table}`);
        existingCount++;
      } else {
        console.log(`  ❌ ${table} - ${error.message}`);
      }
    } catch (error) {
      console.log(`  ❌ ${table} - ${error.message}`);
    }
  }
  
  const missingCount = expectedTables.length - existingCount;
  
  if (missingCount > 0) {
    console.log(`\n⚠️ ${missingCount} tabelas faltando de ${expectedTables.length}`);
    return false;
  }
  
  console.log('\n✅ Todas as tabelas necessárias estão presentes');
  return true;
}

async function main() {
  console.log('🚀 Iniciando testes do Supabase...\n');
  
  const connectionOk = await testConnection();
  const schemaOk = await testSchemaAlignment();
  
  console.log('\n📋 Resumo dos testes:');
  console.log(`Conexão: ${connectionOk ? '✅ OK' : '❌ FALHOU'}`);
  console.log(`Schema: ${schemaOk ? '✅ OK' : '❌ FALHOU'}`);
  
  if (connectionOk && schemaOk) {
    console.log('\n🎉 Integração com Supabase está funcionando corretamente!');
    process.exit(0);
  } else {
    console.log('\n⚠️ Problemas encontrados na integração com Supabase');
    process.exit(1);
  }
}

main().catch(console.error);