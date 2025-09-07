require('dotenv').config();
const { adminCommandsService } = require('./dist/services/admin-commands.service.cjs');

async function testAdminPrompts() {
  console.log('🧪 Testando comandos administrativos de prompts...');
  
  try {
    // Teste 0: Listar sessões disponíveis
    console.log('\n0. Listando sessões disponíveis...');
    const listResult = await adminCommandsService.executeCommand(
      'listar_sessoes',
      [],
      'default',
      '5511999999999'
    );
    console.log('Resultado:', listResult);
    
    // Usar a sessão 'default' que sempre existe
    const sessionName = 'default';
    
    // Teste 1: Definir prompt para uma sessão
    console.log('\n1. Testando definição de prompt...');
    const setResult = await adminCommandsService.executeCommand(
      'prompt_sessao', 
      [sessionName, 'Você é um assistente especializado em testes administrativos. Responda sempre de forma técnica e precisa.'],
      'default',
      '5511999999999'
    );
    console.log('Resultado:', setResult);
    
    // Teste 2: Visualizar prompt da sessão
    console.log('\n2. Testando visualização de prompt...');
    const getResult = await adminCommandsService.executeCommand(
      'ver_prompt',
      [sessionName],
      'default', 
      '5511999999999'
    );
    console.log('Resultado:', getResult);
    
    // Teste 3: Tentar visualizar prompt de sessão inexistente
    console.log('\n3. Testando sessão inexistente...');
    const nonExistentResult = await adminCommandsService.executeCommand(
      'ver_prompt',
      ['sessao_inexistente'],
      'default',
      '5511999999999'
    );
    console.log('Resultado:', nonExistentResult);
    
    // Teste 4: Atualizar prompt existente
    console.log('\n4. Testando atualização de prompt...');
    const updateResult = await adminCommandsService.executeCommand(
      'prompt_sessao',
      [sessionName, 'Você é um assistente atualizado. Responda sempre com emojis e de forma amigável! 😊'],
      'default',
      '5511999999999'
    );
    console.log('Resultado:', updateResult);
    
    // Teste 5: Verificar se a atualização funcionou
    console.log('\n5. Verificando atualização...');
    const verifyResult = await adminCommandsService.executeCommand(
      'ver_prompt',
      [sessionName],
      'default',
      '5511999999999'
    );
    console.log('Resultado:', verifyResult);
    
    // Teste 6: Restaurar prompt padrão
    console.log('\n6. Restaurando prompt padrão...');
    const clearResult = await adminCommandsService.executeCommand(
      'prompt_sessao',
      [sessionName, 'Você é um assistente virtual inteligente e prestativo. Responda de forma clara e objetiva.'],
      'default',
      '5511999999999'
    );
    console.log('Resultado:', clearResult);
    
    console.log('\n✅ Todos os testes de comandos administrativos concluídos!');
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
    process.exit(1);
  }
}

testAdminPrompts();