require('dotenv').config();
const { sessionManager } = require('./dist/services/session.manager.cjs');
const { databaseService } = require('./dist/services/database.service.cjs');

async function testIntegration() {
  console.log('🚀 Iniciando teste de integração completo...\n');

  const testPhone = '+5511999999999';
  const testSession = 'default';
  const testUserMessage = 'Olá, como você está?';
  const testAiMessage = 'Olá! Estou bem, obrigado por perguntar. Como posso ajudá-lo hoje?';

  try {
    // 1. Verificar conexão com banco
    console.log('1. Verificando conexão com banco...');
    const sessions = await databaseService.getActiveSessions();
    console.log(`   ✅ Conexão OK - ${sessions.length} sessões ativas`);

    // 2. Criar sessão 'default' se não existir
    console.log('\n2. Verificando/criando sessão default...');
    let defaultSession = await sessionManager.getSession(testSession);
    
    if (!defaultSession) {
      console.log('   📝 Criando sessão default...');
      defaultSession = await sessionManager.createSession(testSession, {
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 2000,
        system_prompt: 'Você é um assistente inteligente via WhatsApp para testes.'
      });
    }
    
    if (defaultSession) {
      console.log(`   ✅ Sessão default disponível: ${defaultSession.session_name}`);
    } else {
      console.log('   ❌ Falha ao criar/obter sessão default');
      return;
    }

    // 3. Registrar usuário
    console.log('\n3. Registrando usuário...');
    const user = await sessionManager.registerUser(testPhone, testSession, {
      name: 'Usuário Teste',
      profile_data: { test: true }
    });
    
    if (user) {
      console.log(`   ✅ Usuário registrado: ${user.phone_number}`);
    } else {
      console.log('   ❌ Falha ao registrar usuário');
    }

    // 4. Obter ou criar conversa
    console.log('\n4. Obtendo/criando conversa...');
    const conversation = await sessionManager.getOrCreateConversation(testPhone, testSession);
    
    if (conversation) {
      console.log(`   ✅ Conversa obtida/criada: ID ${conversation.id}`);
    } else {
      console.log('   ❌ Falha ao obter/criar conversa');
    }

    // 5. Salvar mensagem do usuário
    console.log('\n5. Salvando mensagem do usuário...');
    const userMessage = await sessionManager.saveMessage(
      testPhone, 
      testSession, 
      testUserMessage, 
      'user'
    );
    
    if (userMessage) {
      console.log(`   ✅ Mensagem usuário: ${userMessage.content}`);
    } else {
      console.log('   ❌ Mensagem usuário: ERRO');
    }

    // 6. Salvar resposta da IA
    console.log('\n6. Salvando resposta da IA...');
    const aiMessage = await sessionManager.saveMessage(
      testPhone, 
      testSession, 
      testAiMessage, 
      'assistant'
    );
    
    if (aiMessage) {
      console.log(`   ✅ Mensagem IA: ${aiMessage.content}`);
    } else {
      console.log('   ❌ Mensagem IA: ERRO');
    }

    // 7. Verificar histórico
    console.log('\n7. Verificando histórico...');
    const history = await sessionManager.getConversationHistory(testPhone, testSession, 10);
    console.log(`   ✅ Histórico: ${history.length} mensagens`);
    
    // 8. Mostrar últimas mensagens
    console.log('\n8. Últimas mensagens:');
    history.slice(-3).forEach((msg, index) => {
      console.log(`   ${index + 1}. [${msg.message_type}] ${msg.content}`);
    });

    // 9. Verificar dados nas tabelas
    console.log('\n9. Verificando dados nas tabelas...');
    
    try {
      const activeSessions = await databaseService.getActiveSessions();
      const sessionUsers = activeSessions.length > 0 ? 
        await databaseService.getUsersBySession(activeSessions[0].session_name) : [];
      
      // Verificar se sessão default existe
      let defaultSessionExists = false;
      try {
        const defaultSession = await databaseService.getSessionByName('default');
        defaultSessionExists = !!defaultSession;
      } catch (error) {
        console.log(`❌ Erro ao buscar sessão: ${JSON.stringify(error, null, 2)}`);
      }
      
      console.log('   📊 Estatísticas finais:');
      console.log(`      - Sessões ativas: ${activeSessions.length}`);
      console.log(`      - Usuários na sessão: ${sessionUsers.length}`);
      console.log(`      - Sessão 'default' ativa: ${defaultSessionExists ? 'SIM' : 'NÃO'}`);
      console.log(`      - Mensagens no histórico: ${history.length}`);
      
    } catch (error) {
      console.log(`   ❌ Erro ao verificar dados: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Erro durante teste:', error);
  }

  console.log('\n🎉 Teste de integração concluído!');
}

testIntegration();