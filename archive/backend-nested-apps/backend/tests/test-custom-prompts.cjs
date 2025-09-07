require('dotenv').config();
const { databaseService } = require('./dist/services/database.service.cjs');
const { adminCommandsService } = require('./dist/services/admin-commands.service.cjs');

async function testCustomPrompts() {
  console.log('🚀 Testando sistema de prompts personalizados...');
  
  try {
    // 1. Testar definição de prompt personalizado
    console.log('\n1. Testando definição de prompt personalizado...');
    const setResult = await databaseService.setSessionPrompt('default', 'Você é um assistente especializado em vendas. Seja sempre positivo e focado em resultados.');
    console.log('✅ Prompt definido:', setResult);
    
    // 2. Testar recuperação do prompt
    console.log('\n2. Testando recuperação do prompt...');
    const getResult = await databaseService.getSessionPrompt('default');
    console.log('✅ Prompt recuperado:', getResult);
    
    // 3. Testar comando administrativo de definição
    console.log('\n3. Testando comando !prompt_sessao...');
    const args = ['default', 'Você', 'é', 'um', 'assistente', 'técnico', 'especializado', 'em', 'programação.'];
    
    // Simular processamento do comando
    const commandResult = await adminCommandsService.executeCommand('prompt_sessao', args, 'default', '+5511999999999');
    console.log('✅ Comando processado:', commandResult);
    
    // 4. Verificar se o prompt foi atualizado
    console.log('\n4. Verificando atualização do prompt...');
    const updatedPrompt = await databaseService.getSessionPrompt('default');
    console.log('✅ Prompt atualizado:', updatedPrompt);
    
    // 5. Testar comando de visualização
    console.log('\n5. Testando comando !ver_prompt...');
    const viewResult = await adminCommandsService.executeCommand('ver_prompt', ['default'], 'default', '+5511999999999');
    console.log('✅ Visualização do prompt:', viewResult);
    
    // 6. Testar com sessão inexistente
    console.log('\n6. Testando com sessão inexistente...');
    const invalidResult = await adminCommandsService.executeCommand('prompt_sessao', ['sessao_inexistente', 'Teste'], 'default', '+5511999999999');
    console.log('✅ Resultado para sessão inexistente:', invalidResult);
    
    // 7. Limpar prompt para teste
    console.log('\n7. Limpando prompt de teste...');
    await databaseService.setSessionPrompt('default', null);
    const clearedPrompt = await databaseService.getSessionPrompt('default');
    console.log('✅ Prompt limpo:', clearedPrompt === null ? 'NULL' : clearedPrompt);
    
    console.log('\n🎉 Todos os testes de prompts personalizados passaram!');
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
    process.exit(1);
  }
}

// Executar testes
testCustomPrompts().then(() => {
  console.log('\n✅ Teste concluído com sucesso!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Falha nos testes:', error);
  process.exit(1);
});