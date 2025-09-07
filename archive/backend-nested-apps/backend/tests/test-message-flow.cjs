// Carregar variáveis de ambiente
require('dotenv').config();

const { databaseService } = require('./dist/services/database.service.cjs');
const { sessionManager } = require('./dist/services/session.manager.cjs');

/**
 * Teste para verificar o fluxo de salvamento de mensagens
 */
async function testMessageFlow() {
  console.log('🧪 Testando fluxo de salvamento de mensagens...');
  
  const testPhone = '+5511999999999';
  const testSessionName = 'sessionName';
  const testMessage = 'Olá, esta é uma mensagem de teste';
  
  try {
    // 1. Verificar se a sessão existe
    console.log('\n1️⃣ Verificando sessão...');
    let session = await databaseService.getSessionByName(testSessionName);
    
    if (!session) {
      console.log('❌ Sessão não encontrada. Criando sessão de teste...');
      session = await databaseService.createSession({
        session_name: testSessionName,
        phone_number: '+5511888888888',
        is_active: true,
        ai_config: {},
        timing_config: {}
      });
      
      if (session) {
        console.log('✅ Sessão criada:', session.session_name);
      } else {
        console.log('❌ Falha ao criar sessão');
        return;
      }
    } else {
      console.log('✅ Sessão encontrada:', session.session_name);
    }
    
    // 2. Verificar/criar usuário
    console.log('\n2️⃣ Verificando usuário...');
    let user = await databaseService.getUserByPhone(testPhone, testSessionName);
    
    if (!user) {
      console.log('❌ Usuário não encontrado. Criando usuário de teste...');
      user = await databaseService.upsertUser({
        phone_number: testPhone,
        name: 'Usuário Teste',
        profile_data: {},
        preferences: {}
      });
      
      if (user) {
        console.log('✅ Usuário criado:', user.phone_number);
      } else {
        console.log('❌ Falha ao criar usuário');
        return;
      }
    } else {
      console.log('✅ Usuário encontrado:', user.phone_number);
    }
    
    // 3. Testar salvamento de mensagem usando SessionManager
    console.log('\n3️⃣ Testando salvamento via SessionManager...');
    const savedMessage = await sessionManager.saveMessage(
      testPhone,
      testSessionName,
      testMessage,
      'user'
    );
    
    if (savedMessage) {
      console.log('✅ Mensagem salva via SessionManager:', savedMessage.id);
      
      // 4. Verificar se a mensagem foi salva corretamente
      console.log('\n4️⃣ Verificando mensagem salva...');
      const conversation = await databaseService.getActiveConversation(testPhone, testSessionName);
      
      if (conversation) {
        const messages = await databaseService.getConversationMessages(conversation.id, 10);
        console.log(`✅ Conversa encontrada com ${messages.length} mensagens`);
        
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.content === testMessage) {
          console.log('✅ Mensagem verificada no banco:', lastMessage.content);
        } else {
          console.log('❌ Mensagem não encontrada ou conteúdo diferente');
        }
      } else {
        console.log('❌ Conversa não encontrada');
      }
      
      // 5. Testar resposta da IA
      console.log('\n5️⃣ Testando salvamento de resposta da IA...');
      const aiResponse = await sessionManager.saveMessage(
        testPhone,
        testSessionName,
        'Esta é uma resposta de teste da IA',
        'assistant'
      );
      
      if (aiResponse) {
        console.log('✅ Resposta da IA salva:', aiResponse.id);
      } else {
        console.log('❌ Falha ao salvar resposta da IA');
      }
      
    } else {
      console.log('❌ Falha ao salvar mensagem via SessionManager');
    }
    
    // 6. Verificar histórico completo
    console.log('\n6️⃣ Verificando histórico completo...');
    const conversation = await databaseService.getActiveConversation(testPhone, testSessionName);
    if (conversation) {
      const allMessages = await databaseService.getConversationMessages(conversation.id);
      console.log(`📊 Total de mensagens na conversa: ${allMessages.length}`);
      
      allMessages.forEach((msg, index) => {
        console.log(`  ${index + 1}. [${msg.sender_type}] ${msg.content.substring(0, 50)}...`);
      });
    }
    
    console.log('\n🎉 Teste de fluxo de mensagens concluído!');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

// Executar o teste
testMessageFlow().then(() => {
  console.log('\n✅ Teste finalizado');
  process.exit(0);
}).catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});