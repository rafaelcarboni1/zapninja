// Carregar variáveis de ambiente ANTES de qualquer import
import dotenv from 'dotenv';
dotenv.config();

// Agora importar os serviços
import { databaseService } from '../src/services/database.service.js';
import { sessionManager } from '../src/services/session.manager.js';
import { adminCommandsService } from '../src/services/admin-commands.service.js';
import { timingService } from '../src/services/timing.service.js';
import { contextEngineService } from '../src/services/context-engine.service.js';
import { suggestionsService } from '../src/services/suggestions.service.js';

/**
 * Testes de integração do sistema de IA com memória persistente
 * Verifica se todos os serviços funcionam corretamente em conjunto
 */
class IntegrationTester {
  private testResults: Array<{ test: string; status: 'PASS' | 'FAIL'; error?: string; duration?: number }> = [];
  private testPhone = '+5511999999999';
  private testSessionName = 'integration_test_session';

  constructor() {
    console.log('🧪 Iniciando testes de integração do sistema...');
  }

  /**
   * Executa todos os testes de integração
   */
  async runAllTests(): Promise<void> {
    console.log('\n=== INICIANDO TESTES DE INTEGRAÇÃO ===\n');

    // Testes básicos de conectividade
    await this.testDatabaseConnection();
    await this.testSupabaseConnection();

    // Testes de serviços individuais
    await this.testDatabaseService();
    await this.testSessionManager();
    await this.testAdminCommands();
    await this.testTimingService();
    await this.testContextEngine();
    await this.testSuggestionsService();

    // Testes de integração entre serviços
    await this.testServiceIntegration();
    await this.testCompleteUserFlow();
    await this.testMemoryPersistence();
    await this.testPerformance();

    // Limpeza
    await this.cleanup();

    // Relatório final
    this.generateReport();
  }

  /**
   * Testa conexão com o banco de dados
   */
  private async testDatabaseConnection(): Promise<void> {
    await this.runTest('Database Connection', async () => {
      const isConnected = await databaseService.testConnection();
      if (!isConnected) {
        throw new Error('Falha na conexão com o banco de dados');
      }
    });
  }

  /**
   * Testa conexão com Supabase
   */
  private async testSupabaseConnection(): Promise<void> {
    await this.runTest('Supabase Connection', async () => {
      const tables = await databaseService.listTables();
      const expectedTables = [
        'whatsapp_sessions', 'whatsapp_users', 'conversations', 'messages',
        'user_context', 'admin_commands', 'system_metrics', 'learning_data'
      ];
      
      for (const table of expectedTables) {
        if (!tables.some(t => t.table_name === table)) {
          throw new Error(`Tabela ${table} não encontrada`);
        }
      }
    });
  }

  /**
   * Testa serviço de banco de dados
   */
  private async testDatabaseService(): Promise<void> {
    await this.runTest('Database Service CRUD', async () => {
      // Teste de criação de sessão
      const session = await databaseService.createSession({
        session_name: this.testSessionName,
        is_active: true,
        ai_config: { test: true },
        timing_config: { test_timing: true }
      });
      
      if (!session) {
        throw new Error('Falha ao criar sessão');
      }

      // Teste de busca de sessão
      const foundSession = await databaseService.getSession(this.testSessionName);
      if (!foundSession || foundSession.session_name !== this.testSessionName) {
        throw new Error('Falha ao buscar sessão');
      }

      // Teste de atualização de sessão
      const updatedSession = await databaseService.updateSession(this.testSessionName, {
        is_active: false,
        ai_config: { test: true, updated: true }
      });
      
      if (!updatedSession || updatedSession.is_active !== false) {
        throw new Error('Falha ao atualizar sessão');
      }
    });
  }

  /**
   * Testa gerenciador de sessões
   */
  private async testSessionManager(): Promise<void> {
    await this.runTest('Session Manager', async () => {
      // Teste de criação de usuário
      const user = await sessionManager.registerUser(this.testPhone, this.testSessionName, {
        name: 'Usuário Teste'
      });
      
      if (!user) {
        throw new Error('Falha ao registrar usuário');
      }

      // Teste de criação de conversa
      const conversation = await sessionManager.createConversation(this.testPhone, this.testSessionName, {
        title: 'Conversa de Teste',
        context: { test: true }
      });
      
      if (!conversation) {
        throw new Error('Falha ao criar conversa');
      }

      // Teste de salvamento de mensagem
      const message = await sessionManager.saveMessage(
        this.testPhone,
        this.testSessionName,
        'Mensagem de teste',
        'user',
        { timestamp: new Date().toISOString() }
      );
      
      if (!message) {
        throw new Error('Falha ao salvar mensagem');
      }

      // Teste de obtenção de estatísticas
      const stats = await sessionManager.getSessionStats(this.testSessionName);
      if (!stats) {
        throw new Error('Falha ao obter estatísticas da sessão');
      }
    });
  }

  /**
   * Testa comandos administrativos
   */
  private async testAdminCommands(): Promise<void> {
    await this.runTest('Admin Commands', async () => {
      // Teste de comando básico
      const statusResult = await adminCommandsService.executeCommand('status', [], this.testSessionName, this.testPhone);
      if (!statusResult.success) {
        throw new Error('Falha ao executar comando status');
      }

      // Teste de comando com parâmetros
      const configResult = await adminCommandsService.executeCommand('config', ['max_messages', '100'], this.testSessionName, this.testPhone);
      if (!configResult.success) {
        throw new Error('Falha ao executar comando config');
      }

      // Teste de sugestões de comandos
      const suggestions = await adminCommandsService.getSuggestions('como está o sistema?');
      if (!suggestions || suggestions.length === 0) {
        throw new Error('Falha ao gerar sugestões de comandos');
      }
    });
  }

  /**
   * Testa serviço de timing
   */
  private async testTimingService(): Promise<void> {
    await this.runTest('Timing Service', async () => {
      // Teste de verificação de horário de funcionamento
      const isWorkingHours = await timingService.isWithinWorkingHours(this.testSessionName);
      if (typeof isWorkingHours !== 'boolean') {
        throw new Error('Falha na verificação de horário de funcionamento');
      }

      // Teste de rate limiting
      const rateLimitResult = await timingService.checkRateLimit(this.testPhone, this.testSessionName);
      if (typeof rateLimitResult !== 'object' || typeof rateLimitResult.allowed !== 'boolean') {
        throw new Error('Falha na verificação de rate limit');
      }

      // Teste de cálculo de delay
      const delay = await timingService.calculateResponseDelay(this.testSessionName, 100);
      if (typeof delay !== 'number' || delay < 0) {
        throw new Error('Falha no cálculo de delay de resposta');
      }

      // Teste de aplicação de delay
      const startTime = Date.now();
      await timingService.applyResponseDelay(this.testSessionName, 100);
      const endTime = Date.now();
      const actualDelay = endTime - startTime;
      
      if (actualDelay < delay * 0.8) { // Tolerância de 20%
        throw new Error('Delay não foi aplicado corretamente');
      }
    });
  }

  /**
   * Testa motor de contexto
   */
  private async testContextEngine(): Promise<void> {
    await this.runTest('Context Engine', async () => {
      // Teste de análise de mensagem
      const analysis = await contextEngineService.analyzeMessage(
        'Olá, estou com um problema no sistema',
        this.testPhone,
        this.testSessionName
      );
      
      if (!analysis || !analysis.sentiment || !analysis.intent) {
        throw new Error('Falha na análise de contexto da mensagem');
      }

      // Teste de perfil do usuário
      const profile = await contextEngineService.getUserProfile(this.testPhone, this.testSessionName);
      if (!profile || profile.phone !== this.testPhone) {
        throw new Error('Falha ao obter perfil do usuário');
      }

      // Teste de contexto da conversa
      const conversationContext = await contextEngineService.getConversationContext(this.testPhone, this.testSessionName);
      if (!conversationContext) {
        throw new Error('Falha ao obter contexto da conversa');
      }

      // Teste de prompt personalizado
      const personalizedPrompt = await contextEngineService.generatePersonalizedPrompt(
        this.testPhone,
        this.testSessionName,
        'Prompt base de teste'
      );
      
      if (!personalizedPrompt || !personalizedPrompt.includes('CONTEXTO DO USUÁRIO')) {
        throw new Error('Falha ao gerar prompt personalizado');
      }
    });
  }

  /**
   * Testa serviço de sugestões
   */
  private async testSuggestionsService(): Promise<void> {
    await this.runTest('Suggestions Service', async () => {
      // Teste de geração de sugestões
      const suggestions = await suggestionsService.generateSuggestions(
        this.testPhone,
        this.testSessionName,
        'Estou com problema no sistema',
        5
      );
      
      if (!suggestions || suggestions.length === 0) {
        throw new Error('Falha ao gerar sugestões');
      }

      // Verificar estrutura das sugestões
      for (const suggestion of suggestions) {
        if (!suggestion.command || !suggestion.description || !suggestion.relevance_score) {
          throw new Error('Estrutura de sugestão inválida');
        }
      }

      // Teste de feedback de sugestão
      await suggestionsService.recordSuggestionFeedback(
        this.testPhone,
        this.testSessionName,
        suggestions[0].command,
        true
      );

      // Teste de sugestões de resposta
      const responseSuggestions = await suggestionsService.generateResponseSuggestions(
        this.testPhone,
        this.testSessionName,
        'Como posso resolver isso?'
      );
      
      if (!responseSuggestions || responseSuggestions.length === 0) {
        throw new Error('Falha ao gerar sugestões de resposta');
      }
    });
  }

  /**
   * Testa integração entre serviços
   */
  private async testServiceIntegration(): Promise<void> {
    await this.runTest('Service Integration', async () => {
      // Fluxo integrado: mensagem do usuário -> análise -> sugestões -> comando
      const userMessage = 'Preciso de ajuda com configurações do sistema';
      
      // 1. Analisar contexto
      const analysis = await contextEngineService.analyzeMessage(userMessage, this.testPhone, this.testSessionName);
      
      // 2. Gerar sugestões baseadas no contexto
      const suggestions = await suggestionsService.generateSuggestions(
        this.testPhone,
        this.testSessionName,
        userMessage,
        3
      );
      
      // 3. Executar comando sugerido
      if (suggestions.length > 0) {
        // Para o comando config, precisamos fornecer parâmetros válidos
        const args = suggestions[0].command === 'config' ? ['max_messages', '50'] : [];
        const commandResult = await adminCommandsService.executeCommand(
          suggestions[0].command,
          args,
          this.testSessionName,
          this.testPhone
        );
        
        if (!commandResult.success) {
          throw new Error(`Falha na integração: comando sugerido não executou - ${commandResult.message}`);
        }
      } else {
        throw new Error('Nenhuma sugestão foi gerada para executar');
      }
      
      // 4. Verificar se o contexto foi atualizado
      const updatedProfile = await contextEngineService.getUserProfile(this.testPhone, this.testSessionName);
      if (updatedProfile.total_messages === 0) {
        throw new Error('Falha na integração: contexto não foi atualizado');
      }
    });
  }

  /**
   * Testa fluxo completo do usuário
   */
  private async testCompleteUserFlow(): Promise<void> {
    await this.runTest('Complete User Flow', async () => {
      const testPhone2 = '+5511888888888';
      
      // 1. Usuário inicia conversa
      const user = await sessionManager.registerUser(testPhone2, this.testSessionName, {
        name: 'Usuário Fluxo Completo'
      });
      
      // 2. Cria conversa
      const conversation = await sessionManager.createConversation(testPhone2, this.testSessionName, {
        title: 'Conversa Completa'
      });
      
      // 3. Envia mensagens e analisa contexto
      const messages = [
        'Olá, preciso de ajuda',
        'Estou com problema no sistema',
        'Como posso configurar o timing?',
        'Obrigado pela ajuda!'
      ];
      
      for (const messageContent of messages) {
        // Salvar mensagem
        await sessionManager.saveMessage(
          testPhone2,
          this.testSessionName,
          messageContent,
          'user',
          { timestamp: new Date().toISOString() }
        );
        
        // Analisar contexto
        await contextEngineService.analyzeMessage(messageContent, testPhone2, this.testSessionName);
        
        // Aplicar timing
        await timingService.applyResponseDelay(testPhone2);
      }
      
      // 4. Verificar se o perfil foi construído corretamente
      const finalProfile = await contextEngineService.getUserProfile(testPhone2, this.testSessionName);
      if (finalProfile.total_messages !== messages.length) {
        throw new Error('Contagem de mensagens incorreta no perfil');
      }
      
      // 5. Verificar contexto da conversa
      const conversationContext = await contextEngineService.getConversationContext(testPhone2, this.testSessionName);
      if (!conversationContext.current_topic || conversationContext.conversation_flow.length === 0) {
        throw new Error('Contexto da conversa não foi construído corretamente');
      }
    });
  }

  /**
   * Testa persistência da memória
   */
  private async testMemoryPersistence(): Promise<void> {
    await this.runTest('Memory Persistence', async () => {
      const testPhone3 = '+5511777777777';
      
      // 1. Criar dados de teste
      await sessionManager.registerUser(testPhone3, this.testSessionName, {
        name: 'Usuário Persistência'
      });
      
      // 2. Salvar contexto
      const user = await databaseService.getUserByPhone(testPhone3, this.testSessionName);
      const session = await databaseService.getSessionByName(this.testSessionName);
      
      if (!user || !session) {
        throw new Error('Usuário ou sessão não encontrados');
      }
      
      await databaseService.upsertUserContext({
        user_id: user.id,
        session_id: session.id,
        context_type: 'user_profile',
        context_data: {
          total_messages: 10,
          test_data: 'memory_test'
        },
        relevance_score: 1.0
      });
      
      // 3. Limpar cache
      contextEngineService.clearContextCache(testPhone3);
      
      // 4. Recuperar dados do banco
      const recoveredContext = await databaseService.getUserContext(testPhone3, this.testSessionName);
      
      // 5. Verificar se os dados foram persistidos corretamente
      if (!recoveredContext || 
          !recoveredContext.context_data || 
          recoveredContext.context_data.total_messages !== 10 ||
          recoveredContext.context_data.test_data !== 'memory_test') {
        throw new Error('Dados não foram persistidos corretamente');
      }
      
      console.log('✅ Dados persistidos corretamente no banco de dados');
    });
  }

  /**
   * Testa performance do sistema
   */
  private async testPerformance(): Promise<void> {
    await this.runTest('Performance Test', async () => {
      const iterations = 10;
      const maxResponseTime = 2000; // 2 segundos
      
      // Teste de performance de análise de contexto
      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        await contextEngineService.analyzeMessage(
          `Mensagem de teste ${i}`,
          this.testPhone,
          this.testSessionName
        );
      }
      
      const endTime = Date.now();
      const avgResponseTime = (endTime - startTime) / iterations;
      
      if (avgResponseTime > maxResponseTime) {
        throw new Error(`Performance inadequada: ${avgResponseTime}ms > ${maxResponseTime}ms`);
      }
      
      console.log(`✅ Performance OK: ${avgResponseTime.toFixed(0)}ms por análise`);
    });
  }

  /**
   * Limpeza após os testes
   */
  private async cleanup(): Promise<void> {
    await this.runTest('Cleanup', async () => {
      // Limpar dados de teste
      await databaseService.deleteSession(this.testSessionName);
      
      // Limpar cache
      contextEngineService.clearContextCache();
      
      console.log('🧹 Limpeza concluída');
    });
  }

  /**
   * Executa um teste individual
   */
  private async runTest(testName: string, testFunction: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`🧪 Executando: ${testName}...`);
      await testFunction();
      
      const duration = Date.now() - startTime;
      this.testResults.push({ test: testName, status: 'PASS', duration });
      console.log(`✅ ${testName} - PASSOU (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      this.testResults.push({ 
        test: testName, 
        status: 'FAIL', 
        error: error instanceof Error ? error.message : String(error),
        duration 
      });
      console.log(`❌ ${testName} - FALHOU (${duration}ms): ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Gera relatório final dos testes
   */
  private generateReport(): void {
    console.log('\n=== RELATÓRIO DE TESTES DE INTEGRAÇÃO ===\n');
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'PASS').length;
    const failedTests = this.testResults.filter(r => r.status === 'FAIL').length;
    const totalDuration = this.testResults.reduce((sum, r) => sum + (r.duration || 0), 0);
    
    console.log(`📊 RESUMO:`);
    console.log(`   Total de testes: ${totalTests}`);
    console.log(`   ✅ Passou: ${passedTests}`);
    console.log(`   ❌ Falhou: ${failedTests}`);
    console.log(`   ⏱️  Tempo total: ${totalDuration}ms`);
    console.log(`   📈 Taxa de sucesso: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests > 0) {
      console.log('\n❌ TESTES QUE FALHARAM:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`   • ${r.test}: ${r.error}`);
        });
    }
    
    console.log('\n📋 DETALHES DOS TESTES:');
    this.testResults.forEach(r => {
      const status = r.status === 'PASS' ? '✅' : '❌';
      console.log(`   ${status} ${r.test} (${r.duration}ms)`);
    });
    
    console.log('\n=== FIM DO RELATÓRIO ===\n');
    
    // Determinar se os testes passaram no geral
    if (failedTests === 0) {
      console.log('🎉 TODOS OS TESTES PASSARAM! Sistema pronto para uso.');
    } else {
      console.log('⚠️  ALGUNS TESTES FALHARAM. Verifique os erros acima.');
    }
  }
}

// Executar testes se este arquivo for executado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new IntegrationTester();
  tester.runAllTests().catch(error => {
    console.error('❌ Erro fatal nos testes:', error);
    process.exit(1);
  });
}

export { IntegrationTester };