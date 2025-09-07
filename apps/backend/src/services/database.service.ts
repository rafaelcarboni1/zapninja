import { query } from '../config/pg';

// Tipos mínimos (migráveis). Para manter compatibilidade com o restante do código:
export interface WhatsAppSession {
  id: string;
  session_name: string;
  phone_number?: string;
  is_active: boolean;
  ai_config: Record<string, any>;
  timing_config: Record<string, any>;
  max_messages?: number;
  custom_prompt?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppUser {
  id: string;
  phone_number: string;
  name?: string;
  display_name?: string;
  is_active?: boolean;
  profile_data?: Record<string, any>;
  preferences?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  session_id: string;
  user_id: string;
  conversation_data?: Record<string, any>;
  context_summary?: string;
  last_interaction?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'ai' | 'system';
  content: string;
  message_type: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface UserContext {
  id: string;
  user_id: string;
  session_id: string;
  context_type: string;
  context_data: Record<string, any>;
  relevance_score: number;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminCommand {
  id: string;
  session_id: string;
  session_name?: string;
  command_name: string;
  parameters: Record<string, any>;
  executed_by?: string;
  execution_result?: Record<string, any>;
  created_at: string;
}

export interface SystemMetric {
  id: string;
  session_id: string;
  metric_type: string;
  metric_value: Record<string, any>;
  recorded_at: string;
}

export interface LearningData {
  id: string;
  session_id: string;
  user_id?: string;
  interaction_type: string;
  input_data: Record<string, any>;
  output_data: Record<string, any>;
  feedback_score?: number;
  learning_tags?: string[];
  created_at: string;
}

/**
 * Serviço principal para operações de banco de dados
 * Centraliza todas as operações CRUD para o sistema de IA com memória persistente
 */
export class DatabaseService {

  // ==================== WHATSAPP SESSIONS ====================

  /**
   * Cria uma nova sessão WhatsApp
   */
  async createSession(sessionData: Omit<WhatsAppSession, 'id' | 'created_at' | 'updated_at'>): Promise<WhatsAppSession | null> {
    try {
      const fields = Object.keys(sessionData);
      const values = Object.values(sessionData);
      const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
      const { rows } = await query<WhatsAppSession>(
        `INSERT INTO whatsapp_sessions (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      const data = rows[0];
      if (data) console.log('✅ Sessão criada:', data.session_name);
      return data || null;
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
      const { rows } = await query<WhatsAppSession>(
        `SELECT * FROM whatsapp_sessions WHERE session_name = $1 LIMIT 1`,
        [sessionName]
      );
      return rows[0] || null;
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
      const { rows } = await query<WhatsAppSession>(
        `SELECT * FROM whatsapp_sessions WHERE is_active = true ORDER BY created_at DESC`
      );
      return rows;
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
      const { rows } = await query<WhatsAppSession>(
        `SELECT * FROM whatsapp_sessions ORDER BY created_at DESC`
      );
      return rows;
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
      const fields = Object.keys(updates);
      const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
      const values = Object.values(updates);
      values.push(sessionName);
      const { rows } = await query<WhatsAppSession>(
        `UPDATE whatsapp_sessions SET ${setClause} WHERE session_name = $${fields.length + 1} RETURNING *`,
        values
      );
      const data = rows[0];
      if (data) console.log('✅ Sessão atualizada:', sessionName);
      return data || null;
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
      await query(`UPDATE whatsapp_sessions SET is_active = false WHERE session_name = $1`, [sessionName]);
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
      await query(
        `UPDATE whatsapp_sessions SET custom_prompt = $1, updated_at = NOW() WHERE session_name = $2`,
        [customPrompt, sessionName]
      );
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
      const { rows } = await query<{ custom_prompt: string }>(
        `SELECT custom_prompt FROM whatsapp_sessions WHERE session_name = $1 LIMIT 1`,
        [sessionName]
      );
      return rows[0]?.custom_prompt || null;
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
      const fields = Object.keys(userData);
      const values = Object.values(userData);
      const setClause = fields.map((f, i) => `${f} = EXCLUDED.${f}`).join(', ');
      const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
      const { rows } = await query<WhatsAppUser>(
        `INSERT INTO whatsapp_users (${fields.join(', ')}) VALUES (${placeholders})
         ON CONFLICT (phone_number) DO UPDATE SET ${setClause}
         RETURNING *`,
        values
      );
      return rows[0] || null;
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
      const { rows } = await query<WhatsAppUser>(
        `SELECT * FROM whatsapp_users WHERE phone_number = $1 LIMIT 1`,
        [phoneNumber]
      );
      return rows[0] || null;
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
      const { rows } = await query<WhatsAppUser>(
        `SELECT wu.* FROM whatsapp_users wu
         JOIN conversations c ON c.user_id = wu.id
         JOIN whatsapp_sessions s ON s.id = c.session_id
         WHERE s.session_name = $1
         GROUP BY wu.id
         ORDER BY wu.updated_at DESC
         LIMIT $2`,
        [sessionName, limit]
      );
      return rows;
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
      const fields = Object.keys(conversationData);
      const values = Object.values(conversationData);
      const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
      const { rows } = await query<Conversation>(
        `INSERT INTO conversations (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      return rows[0] || null;
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
      const { rows } = await query<Conversation>(
        `SELECT c.* FROM conversations c
         JOIN whatsapp_users u ON u.id = c.user_id
         JOIN whatsapp_sessions s ON s.id = c.session_id
         WHERE u.phone_number = $1 AND s.session_name = $2
         ORDER BY c.created_at DESC
         LIMIT 1`,
        [phoneNumber, sessionName]
      );
      return rows[0] || null;
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
      await query(`UPDATE conversations SET last_interaction = NOW() WHERE id = $1`, [conversationId]);
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
      await query(`UPDATE conversations SET last_interaction = NOW() WHERE id = $1`, [conversationId]);
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
      const fields = Object.keys(messageData);
      const values = Object.values(messageData);
      const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
      const { rows } = await query<Message>(
        `INSERT INTO messages (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      return rows[0] || null;
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
      const { rows } = await query<Message>(
        `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT $2`,
        [conversationId, limit]
      );
      return rows;
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
      const { rows } = await query<Message>(
        `SELECT m.* FROM messages m
         JOIN conversations c ON c.id = m.conversation_id
         JOIN whatsapp_users u ON u.id = c.user_id
         JOIN whatsapp_sessions s ON s.id = c.session_id
         WHERE u.phone_number = $1 AND s.session_name = $2
         ORDER BY m.created_at DESC
         LIMIT $3`,
        [phoneNumber, sessionName, limit]
      );
      return rows;
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
      const { rows } = await query<Message>(
        `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [conversationId, limit]
      );
      return rows;
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
      const { rows } = await query<Conversation>(
        `SELECT c.* FROM conversations c
         JOIN whatsapp_users u ON u.id = c.user_id
         WHERE u.phone_number = $1
         ORDER BY c.created_at DESC
         LIMIT $2`,
        [phoneNumber, limit]
      );
      return rows;
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
      const { rows: existing } = await query<UserContext>(
        `SELECT * FROM user_context WHERE user_id = $1 AND session_id = $2 AND context_type = $3 LIMIT 1`,
        [contextData.user_id, contextData.session_id, contextData.context_type]
      );
      if (existing[0]) {
        const { rows } = await query<UserContext>(
          `UPDATE user_context SET context_data = $1, relevance_score = $2, expires_at = $3, updated_at = NOW() WHERE id = $4 RETURNING *`,
          [contextData.context_data, contextData.relevance_score, contextData.expires_at || null, existing[0].id]
        );
        return rows[0] || null;
      } else {
        const fields = Object.keys(contextData);
        const values = Object.values(contextData);
        const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
        const { rows } = await query<UserContext>(
          `INSERT INTO user_context (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`,
          values
        );
        return rows[0] || null;
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
      const { rows } = await query<UserContext>(
        `SELECT uc.* FROM user_context uc
         JOIN whatsapp_users u ON u.id = uc.user_id
         JOIN whatsapp_sessions s ON s.id = uc.session_id
         WHERE u.phone_number = $1 AND s.session_name = $2
         LIMIT 1`,
        [phoneNumber, sessionName]
      );
      return rows[0] || null;
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
      const fields = Object.keys(commandData);
      const values = Object.values(commandData);
      const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
      const { rows } = await query<AdminCommand>(
        `INSERT INTO admin_commands (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      return rows[0] || null;
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
      if (sessionName) {
        const { rows } = await query<AdminCommand>(
          `SELECT * FROM admin_commands WHERE session_name = $1 ORDER BY created_at DESC LIMIT $2`,
          [sessionName, limit]
        );
        return rows;
      }
      const { rows } = await query<AdminCommand>(
        `SELECT * FROM admin_commands ORDER BY created_at DESC LIMIT $1`,
        [limit]
      );
      return rows;
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
      const { rows } = await query<{ command_name: string; count: string }>(
        `SELECT command_name, COUNT(*)::text as count
         FROM admin_commands
         WHERE created_at >= NOW() - INTERVAL '${days} days'
         ${sessionName ? 'AND session_name = $1' : ''}
         GROUP BY command_name`,
        sessionName ? [sessionName] : []
      );
      const stats: Record<string, number> = {};
      rows.forEach(r => { stats[r.command_name] = parseInt(r.count, 10) || 0; });
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
      const fields = Object.keys(metricData);
      const values = Object.values(metricData);
      const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
      const { rows } = await query<SystemMetric>(
        `INSERT INTO system_metrics (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      return rows[0] || null;
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
      if (sessionName) {
        const { rows } = await query<SystemMetric>(
          `SELECT sm.* FROM system_metrics sm
           JOIN whatsapp_sessions s ON s.id = sm.session_id
           WHERE sm.metric_type = $1 AND sm.recorded_at >= NOW() - INTERVAL '${hours} hours' AND s.session_name = $2
           ORDER BY sm.recorded_at DESC`,
          [metricType, sessionName]
        );
        return rows;
      }
      const { rows } = await query<SystemMetric>(
        `SELECT * FROM system_metrics WHERE metric_type = $1 AND recorded_at >= NOW() - INTERVAL '${hours} hours' ORDER BY recorded_at DESC`,
        [metricType]
      );
      return rows;
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
      const fields = Object.keys(learningData);
      const values = Object.values(learningData);
      const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');
      const { rows } = await query<LearningData>(
        `INSERT INTO learning_data (${fields.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      return rows[0] || null;
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
      if (patternType) {
        const { rows } = await query<LearningData>(
          `SELECT * FROM learning_data WHERE session_name = $1 AND pattern_type = $2 ORDER BY created_at DESC`,
          [sessionName, patternType]
        );
        return rows;
      }
      const { rows } = await query<LearningData>(
        `SELECT * FROM learning_data WHERE session_name = $1 ORDER BY created_at DESC`,
        [sessionName]
      );
      return rows;
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
      const { rows } = await query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
      );
      return rows;
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
      await query(`DELETE FROM whatsapp_sessions WHERE session_name = $1`, [sessionName]);
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
      const fields = Object.keys(validFields);
      if (fields.length === 0) return await this.getUserContext(phoneNumber, sessionName);
      const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
      const values = Object.values(validFields);
      values.push(user.id, session.id);
      const { rows } = await query<UserContext>(
        `UPDATE user_context SET ${setClause} WHERE user_id = $${fields.length + 1} AND session_id = $${fields.length + 2} RETURNING *`,
        values
      );
      return rows[0] || null;
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
      await query('SELECT 1');
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
      const { rows: totalUsersRows } = await query<{ count: string }>(
        `SELECT COUNT(*)::text as count FROM whatsapp_users u
         JOIN conversations c ON c.user_id = u.id
         JOIN whatsapp_sessions s ON s.id = c.session_id
         WHERE s.session_name = $1`, [sessionName]
      );
      const { rows: activeUsersRows } = await query<{ count: string }>(
        `SELECT COUNT(DISTINCT u.id)::text as count FROM whatsapp_users u
         JOIN conversations c ON c.user_id = u.id
         JOIN whatsapp_sessions s ON s.id = c.session_id
         WHERE s.session_name = $1 AND u.updated_at >= NOW() - INTERVAL '24 hours'`, [sessionName]
      );
      const { rows: convRows } = await query<{ total: string; active: string }>(
        `SELECT COUNT(*)::text as total,
                COUNT(*) FILTER (WHERE is_active = true)::text as active
         FROM conversations c
         JOIN whatsapp_sessions s ON s.id = c.session_id
         WHERE s.session_name = $1`, [sessionName]
      );
      const { rows: msgRowsToday } = await query<{ count: string }>(
        `SELECT COUNT(*)::text as count FROM messages m
         JOIN conversations c ON c.id = m.conversation_id
         JOIN whatsapp_sessions s ON s.id = c.session_id
         WHERE s.session_name = $1 AND m.created_at >= date_trunc('day', NOW())`, [sessionName]
      );
      const { rows: msgRowsWeek } = await query<{ count: string }>(
        `SELECT COUNT(*)::text as count FROM messages m
         JOIN conversations c ON c.id = m.conversation_id
         JOIN whatsapp_sessions s ON s.id = c.session_id
         WHERE s.session_name = $1 AND m.created_at >= NOW() - INTERVAL '7 days'`, [sessionName]
      );

      return {
        totalUsers: parseInt(totalUsersRows[0]?.count || '0', 10),
        activeUsers: parseInt(activeUsersRows[0]?.count || '0', 10),
        totalConversations: parseInt(convRows[0]?.total || '0', 10),
        activeConversations: parseInt(convRows[0]?.active || '0', 10),
        totalMessages: 0,
        messagesToday: parseInt(msgRowsToday[0]?.count || '0', 10),
        messagesThisWeek: parseInt(msgRowsWeek[0]?.count || '0', 10),
        averageResponseTime: 0,
        topUsers: [],
        dailyActivity: []
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
      const { rows } = await query<{ message_type: string; count: string }>(
        `SELECT m.message_type, COUNT(*)::text as count FROM messages m
         JOIN conversations c ON c.id = m.conversation_id
         JOIN whatsapp_sessions s ON s.id = c.session_id
         WHERE s.session_name = $1 AND m.created_at >= NOW() - INTERVAL '${days} days'
         GROUP BY m.message_type`,
        [sessionName]
      );
      const totalMessages = rows.reduce((acc, r) => acc + parseInt(r.count, 10), 0);
      const userMessages = parseInt(rows.find(r => r.message_type === 'user')?.count || '0', 10);
      const botMessages = parseInt(rows.find(r => r.message_type === 'bot')?.count || '0', 10);
      const averagePerDay = Math.round((totalMessages / days) * 100) / 100;
      return { totalMessages, userMessages, botMessages, averagePerDay };
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
      const { rows } = await query<{ phone_number: string; display_name: string; message_count: string; last_interaction: string; total_conversations: string }>(
        `SELECT u.phone_number,
                COALESCE(u.display_name, u.name, '') as display_name,
                COUNT(m.id)::text as message_count,
                MAX(m.created_at)::text as last_interaction,
                COUNT(DISTINCT c.id)::text as total_conversations
         FROM whatsapp_users u
         JOIN conversations c ON c.user_id = u.id
         JOIN whatsapp_sessions s ON s.id = c.session_id
         LEFT JOIN messages m ON m.conversation_id = c.id
         WHERE s.session_name = $1
         GROUP BY u.id
         ORDER BY COUNT(m.id) DESC
         LIMIT $2`,
        [sessionName, limit]
      );
      return rows.map(r => ({
        phone_number: r.phone_number,
        display_name: r.display_name,
        message_count: parseInt(r.message_count || '0', 10),
        last_interaction: r.last_interaction,
        total_conversations: parseInt(r.total_conversations || '0', 10)
      }));
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
      await query(`DELETE FROM messages WHERE created_at < NOW() - INTERVAL '${daysOld} days'`);
      await query(`DELETE FROM system_metrics WHERE recorded_at < NOW() - INTERVAL '${daysOld} days'`);
      await query(`DELETE FROM admin_commands WHERE created_at < NOW() - INTERVAL '${daysOld} days'`);
      console.log(`✅ Limpeza de dados antigos concluída (${daysOld} dias)`);
    } catch (error) {
      console.error('❌ Erro na limpeza de dados:', error);
    }
  }
}

// Instância singleton do serviço
export const databaseService = new DatabaseService();