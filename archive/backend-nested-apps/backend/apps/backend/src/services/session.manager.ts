import { databaseService } from './database.service';
import type { WhatsAppSession, WhatsAppUser, Conversation, Message, UserContext } from '../config/supabase';

/**
 * Gerenciador de sessões WhatsApp com memória persistente
 * Responsável por gerenciar o ciclo de vida das sessões e contexto dos usuários
 */
export class SessionManager {
  private activeSessions = new Map<string, WhatsAppSession>();
  private userContextCache = new Map<string, UserContext>();
  private conversationCache = new Map<string, Conversation>();

  constructor() {
    this.loadActiveSessions();
  }

  // ==================== SESSION MANAGEMENT ====================

  /**
   * Carrega sessões ativas do banco de dados
   */
  private async loadActiveSessions(): Promise<void> {
    try {
      const sessions = await databaseService.getActiveSessions();
      
      for (const session of sessions) {
        this.activeSessions.set(session.session_name, session);
      }

      console.log(`✅ ${sessions.length} sessões ativas carregadas`);
    } catch (error) {
      console.error('❌ Erro ao carregar sessões ativas:', error);
    }
  }

  /**
   * Cria uma nova sessão WhatsApp
   */
  async createSession(sessionName: string, config?: any): Promise<WhatsAppSession | undefined> {
    try {
      // Verificar se sessão já existe
      const existingSession = await databaseService.getSessionByName(sessionName);
      if (existingSession) {
        console.log(`⚠️  Sessão ${sessionName} já existe`);
        return existingSession;
      }

      // Criar nova sessão
      const sessionData = {
        session_name: sessionName,
        is_active: true,
        ai_config: config || {
          model: 'gpt-4',
          temperature: 0.7,
          max_tokens: 2000,
          system_prompt: 'Você é um assistente inteligente via WhatsApp.'
        },
        timing_config: {
          response_time: 2000,
          message_delay: 1000,
          rest_period: 0,
          working_hours: { start: '00:00', end: '23:59' },
          message_limit: 100,
          typing_simulation: true
        }
      };

      const newSession = await databaseService.createSession(sessionData);
      
      if (newSession) {
        this.activeSessions.set(sessionName, newSession);
        console.log(`✅ Sessão ${sessionName} criada com sucesso`);
        return newSession;
      }

      return undefined;
    } catch (error) {
      console.error(`❌ Erro ao criar sessão ${sessionName}:`, error);
      return undefined;
    }
  }

  /**
   * Obtém uma sessão ativa
   */
  async getSession(sessionName: string): Promise<WhatsAppSession | undefined> {
    try {
      // Verificar cache primeiro
      let session = this.activeSessions.get(sessionName);
      
      if (!session) {
        // Buscar no banco de dados
        const dbSession = await databaseService.getSessionByName(sessionName);
        session = dbSession || undefined;
        
        // Se não encontrou a sessão e é a sessão 'default', criar automaticamente
        if (!session && sessionName === 'default') {
          console.log('🔄 Sessão default não encontrada, criando automaticamente...');
          session = await this.createSession('default', {
            description: 'Sessão padrão criada automaticamente',
            is_active: true
          });
        }
        
        if (session && session.is_active) {
          this.activeSessions.set(sessionName, session);
        }
      }

      return session || undefined;
    } catch (error) {
      console.error(`❌ Erro ao obter sessão ${sessionName}:`, error);
      return undefined;
    }
  }

  /**
   * Atualiza configurações de uma sessão
   */
  async updateSessionConfig(sessionName: string, config: Partial<WhatsAppSession>): Promise<boolean> {
    try {
      const updatedSession = await databaseService.updateSession(sessionName, config);
      
      if (updatedSession) {
        this.activeSessions.set(sessionName, updatedSession);
        console.log(`✅ Configurações da sessão ${sessionName} atualizadas`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`❌ Erro ao atualizar sessão ${sessionName}:`, error);
      return false;
    }
  }

  /**
   * Desativa uma sessão
   */
  async deactivateSession(sessionName: string): Promise<boolean> {
    try {
      const success = await databaseService.deactivateSession(sessionName);
      
      if (success) {
        this.activeSessions.delete(sessionName);
        console.log(`✅ Sessão ${sessionName} desativada`);
      }

      return success;
    } catch (error) {
      console.error(`❌ Erro ao desativar sessão ${sessionName}:`, error);
      return false;
    }
  }

  // ==================== USER MANAGEMENT ====================

  /**
   * Registra ou atualiza um usuário
   */
  async registerUser(phoneNumber: string, sessionName: string, userData?: Partial<WhatsAppUser>): Promise<WhatsAppUser | undefined> {
    try {
      const userInfo = {
        phone_number: phoneNumber,
        name: userData?.name,
        profile_data: userData?.profile_data || {},
        preferences: userData?.preferences || {}
      };

      const user = await databaseService.upsertUser(userInfo);
      
      if (user) {
        console.log(`✅ Usuário ${phoneNumber} registrado na sessão ${sessionName}`);
      }

      return user || undefined;
    } catch (error) {
      console.error(`❌ Erro ao registrar usuário ${phoneNumber}:`, error);
      return undefined;
    }
  }

  /**
   * Obtém informações de um usuário
   */
  async getUser(phoneNumber: string, sessionName: string): Promise<WhatsAppUser | undefined> {
    try {
      const user = await databaseService.getUserByPhone(phoneNumber, sessionName);
      return user || undefined;
    } catch (error) {
      console.error(`❌ Erro ao obter usuário ${phoneNumber}:`, error);
      return undefined;
    }
  }

  /**
   * Atualiza última interação do usuário
   */
  async updateUserInteraction(phoneNumber: string, sessionName: string): Promise<void> {
    try {
      const user = await this.getUser(phoneNumber, sessionName);
      
      if (user) {
        // Atualizar last_interaction na conversa, não no usuário
        const conversation = await this.getOrCreateConversation(phoneNumber, sessionName);
        if (conversation) {
          await databaseService.updateConversationInteraction(conversation.id);
        }
      }
    } catch (error) {
      console.error(`❌ Erro ao atualizar interação do usuário ${phoneNumber}:`, error);
    }
  }

  // ==================== CONVERSATION MANAGEMENT ====================

  /**
   * Cria uma nova conversa ou retorna a existente
   */
  async createConversation(phoneNumber: string, sessionName: string, metadata?: any): Promise<Conversation | undefined> {
    try {
      // Primeiro, verificar se já existe uma conversa ativa
      const existingConversation = await this.getOrCreateConversation(phoneNumber, sessionName);
      
      if (existingConversation) {
        console.log(`✅ Conversa existente encontrada: ${existingConversation.id}`);
        return existingConversation;
      }

      // Verificar se usuário e sessão existem
      const user = await this.getUser(phoneNumber, sessionName);
      const session = await this.getSession(sessionName);
      
      if (!user || !session) {
        console.error('❌ Usuário ou sessão não encontrados para criar conversa');
        return undefined;
      }

      // Criar nova conversa com campos corretos do schema
      const conversationData = {
        user_id: user.id,
        session_id: session.id,
        conversation_data: metadata || {},
        context_summary: '',
        last_interaction: new Date().toISOString()
      };

      const conversation = await databaseService.createConversation(conversationData);
      
      if (conversation) {
        // Adicionar ao cache
        const cacheKey = `${phoneNumber}:${sessionName}`;
        this.conversationCache.set(cacheKey, conversation);
        console.log(`✅ Nova conversa criada: ${conversation.id}`);
        return conversation || undefined;
      }

      return undefined;
    } catch (error) {
      console.error('❌ Erro ao criar conversa:', error);
      return undefined;
    }
  }

  /**
   * Inicia uma nova conversa ou obtém a ativa
   */
  async getOrCreateConversation(phoneNumber: string, sessionName: string): Promise<Conversation | undefined> {
    try {
      const cacheKey = `${phoneNumber}:${sessionName}`;
      
      // Verificar cache
      let conversation = this.conversationCache.get(cacheKey);
      
      if (!conversation) {
        // Buscar conversa ativa no banco
        const dbConversation = await databaseService.getActiveConversation(phoneNumber, sessionName);
        conversation = dbConversation || undefined;
        
        if (!conversation) {
          // Criar nova conversa
          const session = await this.getSession(sessionName);
        if (!session) {
          throw new Error(`Sessão ${sessionName} não encontrada`);
        }
        let user = await databaseService.getUserByPhone(phoneNumber, sessionName);
        if (!user) {
          // Criar usuário automaticamente se não existir
          console.log(`🔄 Usuário ${phoneNumber} não encontrado, criando automaticamente...`);
          const userData = {
             phone_number: phoneNumber,
             name: phoneNumber,
             is_active: true,
             profile_data: {},
             preferences: {}
           };
          user = await databaseService.upsertUser(userData);
          if (!user) {
            throw new Error(`Falha ao criar usuário ${phoneNumber}`);
          }
        }
          
          const conversationData = {
            session_id: session.id,
            user_id: user.id,
            conversation_data: {
              started_at: new Date().toISOString(),
              message_count: 0
            },
            context_summary: '',
            last_interaction: new Date().toISOString()
          };

          const newConversation = await databaseService.createConversation(conversationData);
          conversation = newConversation || undefined;
        }
        
        if (conversation) {
          this.conversationCache.set(cacheKey, conversation);
        }
      }

      return conversation || undefined;
    } catch (error) {
      console.error(`❌ Erro ao obter/criar conversa para ${phoneNumber}:`, error);
      return undefined;
    }
  }

  /**
   * Finaliza uma conversa
   */
  async endConversation(phoneNumber: string, sessionName: string): Promise<boolean> {
    try {
      const conversation = await this.getOrCreateConversation(phoneNumber, sessionName);
      
      if (conversation) {
        const success = await databaseService.endConversation(conversation.id);
        
        if (success) {
          const cacheKey = `${phoneNumber}:${sessionName}`;
          this.conversationCache.delete(cacheKey);
          console.log(`✅ Conversa finalizada para ${phoneNumber}`);
        }
        
        return success;
      }

      return false;
    } catch (error) {
      console.error(`❌ Erro ao finalizar conversa para ${phoneNumber}:`, error);
      return false;
    }
  }

  // ==================== MESSAGE MANAGEMENT ====================

  /**
   * Salva uma mensagem na conversa
   */
  async saveMessage(
    phoneNumber: string, 
    sessionName: string, 
    content: string, 
    messageType: 'user' | 'assistant' | 'system',
    metadata?: any
  ): Promise<Message | undefined> {
    try {
      const conversation = await this.getOrCreateConversation(phoneNumber, sessionName);
      
      if (!conversation) {
        console.error('❌ Não foi possível obter conversa para salvar mensagem');
        return undefined;
      }

      const messageData = {
        conversation_id: conversation.id,
        content,
        message_type: 'text' as const,
        sender_type: messageType === 'user' ? 'user' as const : messageType === 'assistant' ? 'ai' as const : 'system' as const,
        metadata: metadata || {}
      };

      const message = await databaseService.saveMessage(messageData);
      
      if (message) {
        // Atualizar interação do usuário
        await this.updateUserInteraction(phoneNumber, sessionName);
        
        console.log(`✅ Mensagem salva: ${messageType} - ${phoneNumber}`);
      }

      return message || undefined;
    } catch (error) {
      console.error(`❌ Erro ao salvar mensagem de ${phoneNumber}:`, error);
      return undefined;
    }
  }

  /**
   * Obtém histórico de mensagens de uma conversa
   */
  async getConversationHistory(phoneNumber: string, sessionName: string, limit: number = 20): Promise<Message[]> {
    try {
      const conversation = await this.getOrCreateConversation(phoneNumber, sessionName);
      
      if (!conversation) {
        return [];
      }

      return await databaseService.getConversationMessages(conversation.id, limit);
    } catch (error) {
      console.error(`❌ Erro ao obter histórico de ${phoneNumber}:`, error);
      return [];
    }
  }

  /**
   * Obtém histórico recente do usuário (todas as conversas)
   */
  async getUserHistory(phoneNumber: string, sessionName: string, limit: number = 50): Promise<Message[]> {
    try {
      return await databaseService.getRecentUserMessages(phoneNumber, sessionName, limit);
    } catch (error) {
      console.error(`❌ Erro ao obter histórico do usuário ${phoneNumber}:`, error);
      return [];
    }
  }

  // ==================== CONTEXT MANAGEMENT ====================

  /**
   * Obtém contexto do usuário
   */
  async getUserContext(phoneNumber: string, sessionName: string): Promise<UserContext | undefined> {
    try {
      const cacheKey = `${phoneNumber}:${sessionName}`;
      
      // Verificar cache
      let context = this.userContextCache.get(cacheKey);
      
      if (!context) {
        // Buscar no banco
        const user = await this.getUser(phoneNumber, sessionName);
        const session = await this.getSession(sessionName);
        
        if (user && session) {
          const dbContext = await databaseService.getUserContext(user.id, session.id);
          context = dbContext || undefined;
        }
        
        if (context) {
          this.userContextCache.set(cacheKey, context);
        }
      }

      return context || undefined;
    } catch (error) {
      console.error(`❌ Erro ao obter contexto de ${phoneNumber}:`, error);
      return undefined;
    }
  }

  /**
   * Atualiza contexto do usuário
   */
  async updateUserContext(
    phoneNumber: string, 
    sessionName: string, 
    contextData: Partial<UserContext>
  ): Promise<UserContext | undefined> {
    try {
      // Primeiro buscar user_id e session_id
      const user = await this.getUser(phoneNumber, sessionName);
      const session = await this.getSession(sessionName);
      
      if (!user || !session) {
        console.error('❌ Usuário ou sessão não encontrados para atualizar contexto');
        return undefined;
      }

      const existingContext = await this.getUserContext(phoneNumber, sessionName);
      
      const updatedContextData = {
        user_id: user.id,
        session_id: session.id,
        context_type: contextData.context_type || existingContext?.context_type || 'general',
        context_data: {
          ...existingContext?.context_data,
          ...contextData.context_data,
          preferences: {
            ...existingContext?.context_data?.preferences,
            ...contextData.context_data?.preferences
          },
          conversation_state: contextData.context_data?.conversation_state || existingContext?.context_data?.conversation_state || 'active',
          last_topic: contextData.context_data?.last_topic || existingContext?.context_data?.last_topic,
          user_intent: contextData.context_data?.user_intent || existingContext?.context_data?.user_intent,
          last_updated: new Date().toISOString()
        },
        relevance_score: contextData.relevance_score || existingContext?.relevance_score || 1.0,
        expires_at: contextData.expires_at || existingContext?.expires_at
      };

      const updatedContext = await databaseService.upsertUserContext(updatedContextData);
      
      if (updatedContext) {
        const cacheKey = `${phoneNumber}:${sessionName}`;
        this.userContextCache.set(cacheKey, updatedContext);
        console.log(`✅ Contexto atualizado para ${phoneNumber}`);
      }

      return updatedContext || undefined;
    } catch (error) {
      console.error(`❌ Erro ao atualizar contexto de ${phoneNumber}:`, error);
      return undefined;
    }
  }

  // ==================== ANALYTICS & METRICS ====================

  /**
   * Registra métrica de uso
   */
  async recordMetric(sessionName: string, metricType: string, value: number, metadata?: any): Promise<void> {
    try {
      const session = await this.getSession(sessionName);
      if (session) {
        await databaseService.recordMetric({
          session_id: session.id,
          metric_type: metricType,
          metric_value: { value },
          recorded_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(`❌ Erro ao registrar métrica ${metricType}:`, error);
    }
  }

  /**
   * Obtém estatísticas da sessão
   */
  async getSessionStats(sessionName: string): Promise<any> {
    try {
      const session = await this.getSession(sessionName);
      
      if (!session) {
        return undefined;
      }

      // Buscar métricas recentes
      const messageMetrics = await databaseService.getMetrics('messages_sent', sessionName, 24);
      const userMetrics = await databaseService.getMetrics('active_users', sessionName, 24);
      
      return {
        session_name: sessionName,
        is_active: session.is_active,
        total_stats: {},
        last_24h: {
          messages: messageMetrics.reduce((sum, m) => sum + (typeof m.metric_value === 'object' && m.metric_value.value ? m.metric_value.value : 0), 0),
          active_users: userMetrics.length
        },
        config: {
          ai_config: session.ai_config,
          timing_config: session.timing_config
        }
      };
    } catch (error) {
      console.error(`❌ Erro ao obter estatísticas de ${sessionName}:`, error);
      return undefined;
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Lista todas as sessões ativas
   */
  getActiveSessions(): string[] {
    return Array.from(this.activeSessions.keys());
  }

  /**
   * Verifica se uma sessão está ativa
   */
  isSessionActive(sessionName: string): boolean {
    const session = this.activeSessions.get(sessionName);
    return session?.is_active || false;
  }

  /**
   * Limpa caches (para manutenção)
   */
  clearCaches(): void {
    this.userContextCache.clear();
    this.conversationCache.clear();
    console.log('✅ Caches limpos');
  }

  /**
   * Recarrega sessões do banco de dados
   */
  async reloadSessions(): Promise<void> {
    this.activeSessions.clear();
    await this.loadActiveSessions();
    console.log('✅ Sessões recarregadas');
  }
}

// Instância singleton do gerenciador de sessões
export const sessionManager = new SessionManager();