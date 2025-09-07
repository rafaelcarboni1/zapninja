import { supabaseAdmin } from '../config/supabase';
import type {
  WhatsAppSession,
  WhatsAppUser,
  Conversation,
  Message,
  UserContext,
  AdminCommand,
  SystemMetric,
  LearningData
} from '../config/supabase';

/**
 * Serviço principal para operações de banco de dados
 * Centraliza todas as operações CRUD para o sistema de IA com memória persistente
 */
export class DatabaseService {
  private supabase = supabaseAdmin;

  // ==================== WHATSAPP SESSIONS ====================

  /**
   * Cria uma nova sessão WhatsApp
   */
  async createSession(sessionData: Omit<WhatsAppSession, 'id' | 'created_at' | 'updated_at'>): Promise<WhatsAppSession | null> {
    try {
      const { data, error } = await this.supabase
        .from('whatsapp_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao criar sessão:', error);
        return null;
      }

      console.log('✅ Sessão criada:', data.session_name);
      return data;
    } catch (error) {
      console.error('❌ Erro inesperado ao criar sessão:', error);
      return null;
    }
  }

  /**
   * Busca uma sessão por nome
   */
  async getSessionByName(sessionName: string): Promise<WhatsAppSession | null> {
    try {
      const { data, error } = await this.supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('session_name', sessionName)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Erro ao buscar sessão:', error);
        return null;
      }

      return data || null;
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar sessão:', error);
      return null;
    }
  }

  /**
   * Lista todas as sessões ativas
   */
  async getActiveSessions(): Promise<WhatsAppSession[]> {
    try {
      const { data, error } = await this.supabase
        .from('whatsapp_sessions')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao listar sessões ativas:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Erro inesperado ao listar sessões:', error);
      return [];
    }
  }

  /**
   * Lista todas as sessões (ativas e inativas)
   */
  async getAllSessions(): Promise<WhatsAppSession[]> {
    try {
      const { data, error } = await this.supabase
        .from('whatsapp_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao listar todas as sessões:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Erro inesperado ao listar sessões:', error);
      return [];
    }
  }

  /**
   * Atualiza uma sessão
   */
  async updateSession(sessionName: string, updates: Partial<WhatsAppSession>): Promise<WhatsAppSession | null> {
    try {
      const { data, error } = await this.supabase
        .from('whatsapp_sessions')
        .update(updates)
        .eq('session_name', sessionName)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao atualizar sessão:', error);
        return null;
      }

      console.log('✅ Sessão atualizada:', sessionName);
      return data;
    } catch (error) {
      console.error('❌ Erro inesperado ao atualizar sessão:', error);
      return null;
    }
  }

  /**
   * Desativa uma sessão
   */
  async deactivateSession(sessionName: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('whatsapp_sessions')
        .update({ is_active: false })
        .eq('session_name', sessionName);

      if (error) {
        console.error('❌ Erro ao desativar sessão:', error);
        return false;
      }

      console.log('✅ Sessão desativada:', sessionName);
      return true;
    } catch (error) {
      console.error('❌ Erro inesperado ao desativar sessão:', error);
      return false;
    }
  }

  /**
   * Define prompt personalizado para uma sessão
   */
  async setSessionPrompt(sessionName: string, customPrompt: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('whatsapp_sessions')
        .update({ 
          custom_prompt: customPrompt,
          updated_at: new Date().toISOString() 
        })
        .eq('session_name', sessionName);

      if (error) {
        console.error('❌ Erro ao definir prompt da sessão:', error);
        return false;
      }

      console.log('✅ Prompt definido para sessão:', sessionName);
      return true;
    } catch (error) {
      console.error('❌ Erro inesperado ao definir prompt:', error);
      return false;
    }
  }

  /**
   * Obtém prompt personalizado de uma sessão
   */
  async getSessionPrompt(sessionName: string): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('whatsapp_sessions')
        .select('custom_prompt')
        .eq('session_name', sessionName)
        .single();

      if (error) {
        console.error('❌ Erro ao obter prompt da sessão:', error);
        return null;
      }

      return data?.custom_prompt || null;
    } catch (error) {
      console.error('❌ Erro inesperado ao obter prompt:', error);
      return null;
    }
  }

  // ==================== WHATSAPP USERS ====================

  /**
   * Cria ou atualiza um usuário WhatsApp
   */
  async upsertUser(userData: Omit<WhatsAppUser, 'id' | 'created_at' | 'updated_at'>): Promise<WhatsAppUser | null> {
    try {
      const { data, error } = await this.supabase
        .from('whatsapp_users')
        .upsert(userData, {
          onConflict: 'phone_number',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao criar/atualizar usuário:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Erro inesperado ao criar/atualizar usuário:', error);
      return null;
    }
  }

  /**
   * Busca um usuário por telefone e sessão
   */
  async getUserByPhone(phoneNumber: string, sessionName: string): Promise<WhatsAppUser | null> {
    try {
      const { data, error } = await this.supabase
        .from('whatsapp_users')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Erro ao buscar usuário:', error);
        return null;
      }

      return data || null;
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar usuário:', error);
      return null;
    }
  }

  /**
   * Lista usuários de uma sessão
   */
  async getUsersBySession(sessionName: string, limit: number = 50): Promise<WhatsAppUser[]> {
    try {
      // Primeiro buscar a sessão pelo nome
      const { data: session, error: sessionError } = await this.supabase
        .from('whatsapp_sessions')
        .select('id')
        .eq('session_name', sessionName)
        .single();

      if (sessionError || !session) {
        console.error('❌ Erro ao buscar sessão:', sessionError);
        return [];
      }

      // Buscar conversas da sessão para obter user_ids únicos
      const { data: conversations, error: convError } = await this.supabase
        .from('conversations')
        .select('user_id')
        .eq('session_id', session.id)
        .order('created_at', { ascending: false });

      if (convError) {
        console.error('❌ Erro ao buscar conversas da sessão:', convError);
        return [];
      }

      if (!conversations || conversations.length === 0) {
        return [];
      }

      // Buscar usuários únicos baseado nos user_ids das conversas
      const userIds = [...new Set(conversations.map(c => c.user_id))];
      
      const { data, error } = await this.supabase
        .from('whatsapp_users')
        .select('*')
        .in('id', userIds)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Erro ao listar usuários:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Erro inesperado ao listar usuários:', error);
      return [];
    }
  }

  // ==================== CONVERSATIONS ====================

  /**
   * Cria uma nova conversa
   */
  async createConversation(conversationData: Omit<Conversation, 'id' | 'created_at' | 'updated_at'>): Promise<Conversation | null> {
    try {
      const { data, error } = await this.supabase
        .from('conversations')
        .insert(conversationData)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao criar conversa:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Erro inesperado ao criar conversa:', error);
      return null;
    }
  }

  /**
   * Busca conversa ativa entre usuário e sessão
   */
  async getActiveConversation(phoneNumber: string, sessionName: string): Promise<Conversation | null> {
    try {
      // Primeiro, buscar o user_id
      const user = await this.getUserByPhone(phoneNumber, sessionName);
      if (!user) {
        return null;
      }

      // Buscar o session_id
      const session = await this.getSessionByName(sessionName);
      if (!session) {
        return null;
      }

      const { data, error } = await this.supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .eq('session_id', session.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('❌ Erro ao buscar conversa ativa:', error);
        return null;
      }

      return (data && data.length > 0) ? data[0] : null;
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar conversa:', error);
      return null;
    }
  }

  /**
   * Finaliza uma conversa
   */
  async endConversation(conversationId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('conversations')
        .update({ 
          last_interaction: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (error) {
        console.error('❌ Erro ao finalizar conversa:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Erro inesperado ao finalizar conversa:', error);
      return false;
    }
  }

  /**
   * Atualiza a última interação de uma conversa
   */
  async updateConversationInteraction(conversationId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('conversations')
        .update({ last_interaction: new Date().toISOString() })
        .eq('id', conversationId);

      if (error) {
        console.error('❌ Erro ao atualizar interação da conversa:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Erro inesperado ao atualizar interação:', error);
      return false;
    }
  }

  // ==================== MESSAGES ====================

  /**
   * Salva uma mensagem
   */
  async saveMessage(messageData: Omit<Message, 'id' | 'created_at'>): Promise<Message | null> {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao salvar mensagem:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Erro inesperado ao salvar mensagem:', error);
      return null;
    }
  }

  /**
   * Busca mensagens de uma conversa
   */
  async getConversationMessages(conversationId: string, limit: number = 50): Promise<Message[]> {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('❌ Erro ao buscar mensagens:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar mensagens:', error);
      return [];
    }
  }

  /**
   * Busca histórico recente de mensagens de um usuário
   */
  async getRecentUserMessages(phoneNumber: string, sessionName: string, limit: number = 20): Promise<Message[]> {
    try {
      // Primeiro, busca o usuário e a sessão
      const { data: user } = await this.supabase
        .from('whatsapp_users')
        .select('id')
        .eq('phone_number', phoneNumber)
        .single();

      const { data: session } = await this.supabase
        .from('whatsapp_sessions')
        .select('id')
        .eq('session_name', sessionName)
        .single();

      if (!user || !session) {
        return [];
      }

      // Busca as mensagens através da conversa
      const { data, error } = await this.supabase
        .from('messages')
        .select(`
          *,
          conversations!inner(
            id,
            user_id,
            session_id
          )
        `)
        .eq('conversations.user_id', user.id)
        .eq('conversations.session_id', session.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Erro ao buscar histórico de mensagens:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar histórico:', error);
      return [];
    }
  }

  // ==================== USER CONTEXT ====================

  /**
   * Busca mensagens recentes de uma conversa
   */
  async getRecentMessages(conversationId: string, limit: number = 20): Promise<Message[]> {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Erro ao buscar mensagens recentes:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar mensagens recentes:', error);
      return [];
    }
  }

  /**
   * Busca histórico de conversas de um usuário
   */
  async getConversationHistory(phoneNumber: string, sessionName: string, limit: number = 10): Promise<Conversation[]> {
    try {
      // Primeiro buscar o usuário
      const user = await this.getUserByPhone(phoneNumber, sessionName);
      if (!user) {
        console.error('❌ Usuário não encontrado para buscar histórico');
        return [];
      }

      const { data, error } = await this.supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Erro ao buscar histórico de conversas:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar histórico de conversas:', error);
      return [];
    }
  }

  /**
   * Busca contexto do usuário
   */
  async upsertUserContext(contextData: Omit<UserContext, 'id' | 'created_at' | 'updated_at'>): Promise<UserContext | null> {
    try {
      // Primeiro, tenta buscar um registro existente
      const { data: existing } = await this.supabase
        .from('user_context')
        .select('*')
        .eq('user_id', contextData.user_id)
        .eq('session_id', contextData.session_id)
        .eq('context_type', contextData.context_type)
        .single();

      if (existing) {
        // Atualiza o registro existente
        const { data, error } = await this.supabase
          .from('user_context')
          .update({
            context_data: contextData.context_data,
            relevance_score: contextData.relevance_score,
            expires_at: contextData.expires_at,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          console.error('❌ Erro ao atualizar contexto:', error);
          return null;
        }
        return data;
      } else {
        // Cria um novo registro
        const { data, error } = await this.supabase
          .from('user_context')
          .insert(contextData)
          .select()
          .single();

        if (error) {
          console.error('❌ Erro ao inserir contexto:', error);
          return null;
        }
        return data;
      }
    } catch (error) {
      console.error('❌ Erro inesperado ao salvar contexto:', error);
      return null;
    }
  }

  /**
   * Busca contexto do usuário
   */
  async getUserContext(phoneNumber: string, sessionName: string): Promise<UserContext | null> {
    try {
      // Primeiro buscar o user_id e session_id
      const user = await this.getUserByPhone(phoneNumber, sessionName);
      const session = await this.getSessionByName(sessionName);
      
      if (!user || !session) {
        return null;
      }

      const { data, error } = await this.supabase
        .from('user_context')
        .select('*')
        .eq('user_id', user.id)
        .eq('session_id', session.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Erro ao buscar contexto:', error);
        return null;
      }

      return data || null;
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar contexto:', error);
      return null;
    }
  }

  // ==================== ADMIN COMMANDS ====================

  /**
   * Registra execução de comando administrativo
   */
  async logAdminCommand(commandData: Omit<AdminCommand, 'id' | 'created_at'>): Promise<AdminCommand | null> {
    try {
      const { data, error } = await this.supabase
        .from('admin_commands')
        .insert(commandData)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao registrar comando:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Erro inesperado ao registrar comando:', error);
      return null;
    }
  }

  /**
   * Busca histórico de comandos administrativos
   */
  async getAdminCommandHistory(sessionName?: string, limit: number = 100): Promise<AdminCommand[]> {
    try {
      let query = this.supabase
        .from('admin_commands')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (sessionName) {
        query = query.eq('session_name', sessionName);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erro ao buscar histórico de comandos:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar histórico:', error);
      return [];
    }
  }

  /**
   * Busca estatísticas de uso dos comandos
   */
  async getCommandUsageStats(sessionName?: string, days: number = 30): Promise<Record<string, number>> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      let query = this.supabase
        .from('admin_commands')
        .select('command_name')
        .gte('created_at', cutoffDate.toISOString());

      if (sessionName) {
        query = query.eq('session_name', sessionName);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erro ao buscar estatísticas:', error);
        return {};
      }

      // Contar ocorrências de cada comando
      const stats: Record<string, number> = {};
      data?.forEach(record => {
        const command = record.command_name;
        stats[command] = (stats[command] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar estatísticas:', error);
      return {};
    }
  }

  // ==================== SYSTEM METRICS ====================

  /**
   * Registra métrica do sistema
   */
  async recordMetric(metricData: Omit<SystemMetric, 'id' | 'created_at'>): Promise<SystemMetric | null> {
    try {
      const { data, error } = await this.supabase
        .from('system_metrics')
        .insert(metricData)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao registrar métrica:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Erro inesperado ao registrar métrica:', error);
      return null;
    }
  }

  /**
   * Busca métricas por tipo e período
   */
  async getMetrics(metricType: string, sessionName?: string, hours: number = 24): Promise<SystemMetric[]> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      
      let query = this.supabase
        .from('system_metrics')
        .select('*')
        .eq('metric_type', metricType)
        .gte('recorded_at', since)
        .order('recorded_at', { ascending: false });

      if (sessionName) {
        // Buscar session_id pelo session_name
        const session = await this.getSessionByName(sessionName);
        if (session) {
          query = query.eq('session_id', session.id);
        } else {
          // Se sessão não encontrada, retornar array vazio
          return [];
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erro ao buscar métricas:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar métricas:', error);
      return [];
    }
  }

  // ==================== LEARNING DATA ====================

  /**
   * Salva dados de aprendizado
   */
  async saveLearningData(learningData: Omit<LearningData, 'id' | 'created_at'>): Promise<LearningData | null> {
    try {
      const { data, error } = await this.supabase
        .from('learning_data')
        .insert(learningData)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao salvar dados de aprendizado:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Erro inesperado ao salvar aprendizado:', error);
      return null;
    }
  }

  /**
   * Busca padrões de aprendizado
   */
  async getLearningPatterns(sessionName: string, patternType?: string): Promise<LearningData[]> {
    try {
      let query = this.supabase
        .from('learning_data')
        .select('*')
        .eq('session_name', sessionName)
        .order('created_at', { ascending: false });

      if (patternType) {
        query = query.eq('pattern_type', patternType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Erro ao buscar padrões:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar padrões:', error);
      return [];
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Lista todas as tabelas do banco de dados
   */
  async listTables(): Promise<Array<{ table_name: string }>> {
    try {
      // Lista das tabelas conhecidas do projeto
      const knownTables = [
        'whatsapp_sessions',
        'whatsapp_users', 
        'conversations',
        'messages',
        'user_context',
        'admin_commands',
        'system_metrics',
        'learning_data'
      ];

      // Verifica quais tabelas existem testando uma query simples
      const existingTables: Array<{ table_name: string }> = [];
      
      for (const tableName of knownTables) {
        try {
          const { error } = await this.supabase
            .from(tableName)
            .select('*')
            .limit(1);
          
          if (!error) {
            existingTables.push({ table_name: tableName });
          }
        } catch {
          // Tabela não existe, continua
        }
      }

      return existingTables;
    } catch (error) {
      console.error('❌ Erro inesperado ao listar tabelas:', error);
      return [];
    }
  }

  /**
   * Busca uma sessão por nome (alias para getSessionByName)
   */
  async getSession(sessionName: string): Promise<WhatsAppSession | null> {
    return this.getSessionByName(sessionName);
  }

  /**
   * Deleta uma sessão
   */
  async deleteSession(sessionName: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('whatsapp_sessions')
        .delete()
        .eq('session_name', sessionName);

      if (error) {
        console.error('❌ Erro ao deletar sessão:', error);
        return false;
      }

      console.log('✅ Sessão deletada:', sessionName);
      return true;
    } catch (error) {
      console.error('❌ Erro inesperado ao deletar sessão:', error);
      return false;
    }
  }

  /**
   * Atualiza contexto do usuário
   */
  async updateUserContext(phoneNumber: string, sessionName: string, contextData: Partial<UserContext>): Promise<UserContext | null> {
    try {
      // Primeiro, buscar o usuário e a sessão
      const user = await this.getUserByPhone(phoneNumber, sessionName);
      const session = await this.getSessionByName(sessionName);
      
      if (!user || !session) {
        console.error('❌ Usuário ou sessão não encontrados');
        return null;
      }

      // Filtrar apenas campos válidos da tabela user_context
      const validFields: Partial<UserContext> = {};
      if (contextData.context_type !== undefined) validFields.context_type = contextData.context_type;
      if (contextData.context_data !== undefined) validFields.context_data = contextData.context_data;
      if (contextData.relevance_score !== undefined) validFields.relevance_score = contextData.relevance_score;
      if (contextData.expires_at !== undefined) validFields.expires_at = contextData.expires_at;

      const { data, error } = await this.supabase
        .from('user_context')
        .update(validFields)
        .eq('user_id', user.id)
        .eq('session_id', session.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao atualizar contexto do usuário:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ Erro inesperado ao atualizar contexto:', error);
      return null;
    }
  }

  /**
   * Testa conexão com o banco de dados
   */
  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('whatsapp_sessions')
        .select('count')
        .limit(1);

      if (error) {
        console.error('❌ Erro na conexão:', error);
        return false;
      }

      console.log('✅ Conexão com banco de dados OK');
      return true;
    } catch (error) {
      console.error('❌ Erro inesperado na conexão:', error);
      return false;
    }
  }

  // ==================== SESSION STATISTICS ====================

  /**
   * Busca estatísticas completas de uma sessão
   */
  async getSessionStatistics(sessionName: string): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalConversations: number;
    activeConversations: number;
    totalMessages: number;
    messagesToday: number;
    messagesThisWeek: number;
    averageResponseTime: number;
    topUsers: Array<{ phone_number: string; message_count: number; last_interaction: string }>;
    dailyActivity: Array<{ date: string; message_count: number; user_count: number }>;
  } | null> {
    try {
      // Buscar total de usuários
      const { data: usersData, error: usersError } = await this.supabase
        .from('whatsapp_users')
        .select('id')
        .eq('session_name', sessionName);

      if (usersError) throw usersError;

      // Buscar usuários ativos (últimas 24h)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { data: activeUsersData, error: activeUsersError } = await this.supabase
        .from('whatsapp_users')
        .select('id')
        .eq('session_name', sessionName)
        .gte('last_interaction', yesterday.toISOString());

      if (activeUsersError) throw activeUsersError;

      // Buscar total de conversas
      const { data: conversationsData, error: conversationsError } = await this.supabase
        .from('conversations')
        .select('id, is_active')
        .eq('session_name', sessionName);

      if (conversationsError) throw conversationsError;

      // Buscar total de mensagens
      const { data: messagesData, error: messagesError } = await this.supabase
        .from('messages')
        .select('id, created_at')
        .eq('session_name', sessionName);

      if (messagesError) throw messagesError;

      // Calcular mensagens de hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const messagesToday = messagesData?.filter(msg => 
        new Date(msg.created_at) >= today
      ).length || 0;

      // Calcular mensagens desta semana
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const messagesThisWeek = messagesData?.filter(msg => 
        new Date(msg.created_at) >= weekAgo
      ).length || 0;

      // Buscar top usuários (mais ativos)
      const { data: topUsersData, error: topUsersError } = await this.supabase
        .rpc('get_top_users_by_session', {
          p_session_name: sessionName,
          p_limit: 5
        });

      // Buscar atividade diária (últimos 7 dias)
      const { data: dailyActivityData, error: dailyActivityError } = await this.supabase
        .rpc('get_daily_activity_by_session', {
          p_session_name: sessionName,
          p_days: 7
        });

      return {
        totalUsers: usersData?.length || 0,
        activeUsers: activeUsersData?.length || 0,
        totalConversations: conversationsData?.length || 0,
        activeConversations: conversationsData?.filter(c => c.is_active).length || 0,
        totalMessages: messagesData?.length || 0,
        messagesToday,
        messagesThisWeek,
        averageResponseTime: 0, // Implementar cálculo se necessário
        topUsers: topUsersData || [],
        dailyActivity: dailyActivityData || []
      };
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas da sessão:', error);
      return null;
    }
  }

  /**
   * Busca estatísticas de mensagens por período
   */
  async getMessageStatsByPeriod(sessionName: string, days: number = 30): Promise<{
    totalMessages: number;
    userMessages: number;
    botMessages: number;
    averagePerDay: number;
  } | null> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await this.supabase
        .from('messages')
        .select('message_type')
        .eq('session_name', sessionName)
        .gte('created_at', startDate.toISOString());

      if (error) throw error;

      const totalMessages = data?.length || 0;
      const userMessages = data?.filter(m => m.message_type === 'user').length || 0;
      const botMessages = data?.filter(m => m.message_type === 'bot').length || 0;
      const averagePerDay = totalMessages / days;

      return {
        totalMessages,
        userMessages,
        botMessages,
        averagePerDay: Math.round(averagePerDay * 100) / 100
      };
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas de mensagens:', error);
      return null;
    }
  }

  /**
   * Busca usuários mais ativos da sessão
   */
  async getTopActiveUsers(sessionName: string, limit: number = 10): Promise<Array<{
    phone_number: string;
    display_name: string;
    message_count: number;
    last_interaction: string;
    total_conversations: number;
  }> | null> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_detailed_top_users', {
          p_session_name: sessionName,
          p_limit: limit
        });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Erro ao buscar usuários mais ativos:', error);
      return null;
    }
  }

  /**
   * Limpa dados antigos (manutenção)
   */
  async cleanupOldData(daysOld: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
      
      // Limpar mensagens antigas
      await this.supabase
        .from('messages')
        .delete()
        .lt('created_at', cutoffDate);

      // Limpar métricas antigas
      await this.supabase
        .from('system_metrics')
        .delete()
        .lt('created_at', cutoffDate);

      // Limpar comandos antigos
      await this.supabase
        .from('admin_commands')
        .delete()
        .lt('created_at', cutoffDate);

      console.log(`✅ Limpeza de dados antigos concluída (${daysOld} dias)`);
    } catch (error) {
      console.error('❌ Erro na limpeza de dados:', error);
    }
  }
}

// Instância singleton do serviço
export const databaseService = new DatabaseService();