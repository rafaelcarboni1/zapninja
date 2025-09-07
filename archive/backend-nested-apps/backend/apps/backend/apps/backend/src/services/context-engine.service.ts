import { databaseService } from './database.service';
import { sessionManager } from './session.manager';
import type { UserContext, Message } from '../config/supabase';

/**
 * Interface para análise de contexto
 */
interface ContextAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  intent: string;
  entities: Array<{ type: string; value: string; confidence: number }>;
  topics: string[];
  urgency: 'low' | 'medium' | 'high';
  language: string;
}

/**
 * Interface para perfil do usuário
 */
interface UserProfile {
  phone: string;
  name?: string;
  preferences: Record<string, any>;
  interaction_style: 'formal' | 'casual' | 'technical';
  frequent_topics: string[];
  response_preference: 'short' | 'detailed' | 'mixed';
  timezone?: string;
  language: string;
  last_interaction: string;
  total_messages: number;
  satisfaction_score: number;
}

/**
 * Interface para contexto da conversa
 */
interface ConversationContext {
  current_topic: string;
  conversation_flow: string[];
  unresolved_questions: string[];
  mentioned_entities: Array<{ entity: string; type: string; mentions: number }>;
  conversation_stage: 'greeting' | 'information_gathering' | 'problem_solving' | 'closing';
  requires_followup: boolean;
}

/**
 * Motor de contexto inteligente
 * Gerencia reconhecimento de usuários, análise de contexto e personalização
 */
export class ContextEngineService {
  private userProfiles = new Map<string, UserProfile>();
  private conversationContexts = new Map<string, ConversationContext>();
  private entityPatterns = new Map<string, RegExp>();
  private intentPatterns = new Map<string, RegExp[]>();

  constructor() {
    this.initializePatterns();
    console.log('🧠 Motor de Contexto Inteligente inicializado');
  }

  /**
   * Inicializa padrões de reconhecimento
   */
  private initializePatterns(): void {
    // Padrões para entidades
    this.entityPatterns.set('email', /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);
    this.entityPatterns.set('phone', /\b(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\s?)?\d{4}[-\s]?\d{4}\b/g);
    this.entityPatterns.set('cpf', /\b\d{3}\.?\d{3}\.?\d{3}[-\.]?\d{2}\b/g);
    this.entityPatterns.set('cnpj', /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}[-\.]?\d{2}\b/g);
    this.entityPatterns.set('cep', /\b\d{5}[-\.]?\d{3}\b/g);
    this.entityPatterns.set('money', /R\$\s?\d+(?:[.,]\d{2})?/g);
    this.entityPatterns.set('date', /\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(?:\d{1,2}\s+de\s+\w+\s+de\s+\d{4})\b/g);
    this.entityPatterns.set('time', /\b\d{1,2}[:h]\d{2}(?:min)?\b/g);

    // Padrões para intenções
    this.intentPatterns.set('greeting', [
      /\b(?:oi|olá|ola|bom dia|boa tarde|boa noite|hey|e aí)\b/i,
      /\b(?:tudo bem|como vai|beleza)\b/i
    ]);
    
    this.intentPatterns.set('question', [
      /\b(?:como|quando|onde|por que|porque|qual|quais|quanto|quem)\b/i,
      /\?$/,
      /\b(?:pode|poderia|consegue|sabe)\b.*\?/i
    ]);
    
    this.intentPatterns.set('complaint', [
      /\b(?:problema|erro|bug|falha|não funciona|ruim|péssimo)\b/i,
      /\b(?:reclamar|reclamação|insatisfeito|chateado)\b/i
    ]);
    
    this.intentPatterns.set('compliment', [
      /\b(?:obrigado|obrigada|valeu|muito bom|excelente|perfeito|ótimo)\b/i,
      /\b(?:parabéns|gostei|adorei|fantástico|maravilhoso)\b/i
    ]);
    
    this.intentPatterns.set('request', [
      /\b(?:preciso|quero|gostaria|pode|poderia|me ajuda)\b/i,
      /\b(?:solicitar|pedir|fazer|criar|configurar)\b/i
    ]);
    
    this.intentPatterns.set('goodbye', [
      /\b(?:tchau|até logo|até mais|bye|falou|obrigado e tchau)\b/i,
      /\b(?:até|flw|vlw|até a próxima)\b/i
    ]);

    console.log(`✅ ${this.entityPatterns.size} padrões de entidades e ${this.intentPatterns.size} padrões de intenção carregados`);
  }

  /**
   * Analisa o contexto de uma mensagem
   */
  async analyzeMessage(message: string, phone: string, sessionName: string): Promise<ContextAnalysis> {
    try {
      const analysis: ContextAnalysis = {
        sentiment: this.analyzeSentiment(message),
        intent: this.detectIntent(message),
        entities: this.extractEntities(message),
        topics: this.extractTopics(message),
        urgency: this.assessUrgency(message),
        language: this.detectLanguage(message)
      };

      // Salvar análise no contexto do usuário
      await this.updateUserContext(phone, sessionName, analysis, message);

      return analysis;
    } catch (error) {
      console.error('❌ Erro ao analisar contexto da mensagem:', error);
      return {
        sentiment: 'neutral',
        intent: 'unknown',
        entities: [],
        topics: [],
        urgency: 'low',
        language: 'pt-BR'
      };
    }
  }

  /**
   * Obtém ou cria perfil do usuário
   */
  async getUserProfile(phone: string, sessionName: string): Promise<UserProfile> {
    try {
      // Verificar cache primeiro
      let profile = this.userProfiles.get(phone);
      
      if (!profile) {
        // Buscar no banco de dados
        const userContext = await databaseService.getUserContext(phone, sessionName);
        const user = await sessionManager.getUser(phone, sessionName);
        
        if (userContext && user) {
          profile = {
            phone,
            name: user.name,
            preferences: userContext.context_data?.preferences || {},
            interaction_style: userContext.context_data?.interaction_style as any || 'casual',
            frequent_topics: userContext.context_data?.frequent_topics || [],
            response_preference: userContext.context_data?.response_preference as any || 'mixed',
            timezone: userContext.context_data?.timezone,
            language: userContext.context_data?.language || 'pt-BR',
            last_interaction: userContext.updated_at,
            total_messages: userContext.context_data?.total_messages || 0,
            satisfaction_score: userContext.context_data?.satisfaction_score || 0.5
          };
        } else {
          // Criar novo perfil
          profile = {
            phone,
            preferences: {},
            interaction_style: 'casual',
            frequent_topics: [],
            response_preference: 'mixed',
            language: 'pt-BR',
            last_interaction: new Date().toISOString(),
            total_messages: 0,
            satisfaction_score: 0.5
          };
          
          // Salvar novo perfil no banco usando context_data
           const user = await sessionManager.getUser(phone, sessionName);
           const session = await databaseService.getSessionByName(sessionName);
           
           if (user && session) {
             await databaseService.upsertUserContext({
               user_id: user.id,
               session_id: session.id,
               context_type: 'user_profile',
               context_data: {
                 user_profile: {
                   preferences: profile.preferences,
                   interaction_style: profile.interaction_style,
                   frequent_topics: profile.frequent_topics,
                   response_preference: profile.response_preference,
                   timezone: profile.timezone,
                   language: profile.language,
                   total_messages: profile.total_messages,
                   satisfaction_score: profile.satisfaction_score
                 }
               },
               relevance_score: 1.0
             });
           }
        }
        
        this.userProfiles.set(phone, profile);
      }
      
      return profile;
    } catch (error) {
      console.error('❌ Erro ao obter perfil do usuário:', error);
      return {
        phone,
        preferences: {},
        interaction_style: 'casual',
        frequent_topics: [],
        response_preference: 'mixed',
        language: 'pt-BR',
        last_interaction: new Date().toISOString(),
        total_messages: 0,
        satisfaction_score: 0.5
      };
    }
  }

  /**
   * Obtém contexto da conversa atual
   */
  async getConversationContext(phone: string, sessionName: string): Promise<ConversationContext> {
    try {
      const contextKey = `${sessionName}:${phone}`;
      let context = this.conversationContexts.get(contextKey);
      
      if (!context) {
        // Obter conversa ativa primeiro
        const conversation = await databaseService.getActiveConversation(phone, sessionName);
        let recentMessages: any[] = [];
        
        if (conversation) {
          // Analisar mensagens recentes para reconstruir contexto
          recentMessages = await databaseService.getRecentMessages(conversation.id, 10);
        }
        
        context = {
          current_topic: this.inferCurrentTopic(recentMessages),
          conversation_flow: this.buildConversationFlow(recentMessages),
          unresolved_questions: this.findUnresolvedQuestions(recentMessages),
          mentioned_entities: this.aggregateEntities(recentMessages),
          conversation_stage: this.determineConversationStage(recentMessages),
          requires_followup: this.checkFollowupNeeded(recentMessages)
        };
        
        this.conversationContexts.set(contextKey, context);
      }
      
      return context;
    } catch (error) {
      console.error('❌ Erro ao obter contexto da conversa:', error);
      return {
        current_topic: 'general',
        conversation_flow: [],
        unresolved_questions: [],
        mentioned_entities: [],
        conversation_stage: 'greeting',
        requires_followup: false
      };
    }
  }

  /**
   * Gera prompt personalizado baseado no contexto
   */
  async generatePersonalizedPrompt(phone: string, sessionName: string, basePrompt: string): Promise<string> {
    try {
      const profile = await this.getUserProfile(phone, sessionName);
      const conversationContext = await this.getConversationContext(phone, sessionName);
      
      let personalizedPrompt = basePrompt;
      
      // Adicionar informações do perfil
      personalizedPrompt += `\n\nCONTEXTO DO USUÁRIO:\n`;
      personalizedPrompt += `- Nome: ${profile.name || 'Não informado'}\n`;
      personalizedPrompt += `- Estilo de interação: ${profile.interaction_style}\n`;
      personalizedPrompt += `- Preferência de resposta: ${profile.response_preference}\n`;
      personalizedPrompt += `- Idioma: ${profile.language}\n`;
      personalizedPrompt += `- Tópicos frequentes: ${profile.frequent_topics.join(', ') || 'Nenhum'}\n`;
      personalizedPrompt += `- Total de mensagens: ${profile.total_messages}\n`;
      personalizedPrompt += `- Score de satisfação: ${(profile.satisfaction_score * 100).toFixed(0)}%\n`;
      
      // Adicionar contexto da conversa
      personalizedPrompt += `\nCONTEXTO DA CONVERSA:\n`;
      personalizedPrompt += `- Tópico atual: ${conversationContext.current_topic}\n`;
      personalizedPrompt += `- Estágio: ${conversationContext.conversation_stage}\n`;
      personalizedPrompt += `- Questões não resolvidas: ${conversationContext.unresolved_questions.join(', ') || 'Nenhuma'}\n`;
      personalizedPrompt += `- Entidades mencionadas: ${conversationContext.mentioned_entities.map(e => e.entity).join(', ') || 'Nenhuma'}\n`;
      personalizedPrompt += `- Requer follow-up: ${conversationContext.requires_followup ? 'Sim' : 'Não'}\n`;
      
      // Adicionar instruções específicas baseadas no perfil
      if (profile.interaction_style === 'formal') {
        personalizedPrompt += `\nUSE LINGUAGEM FORMAL e tratamento respeitoso.\n`;
      } else if (profile.interaction_style === 'casual') {
        personalizedPrompt += `\nUSE LINGUAGEM CASUAL e amigável.\n`;
      } else if (profile.interaction_style === 'technical') {
        personalizedPrompt += `\nUSE LINGUAGEM TÉCNICA com detalhes específicos.\n`;
      }
      
      if (profile.response_preference === 'short') {
        personalizedPrompt += `MANTENHA RESPOSTAS CONCISAS e diretas.\n`;
      } else if (profile.response_preference === 'detailed') {
        personalizedPrompt += `FORNEÇA RESPOSTAS DETALHADAS com explicações completas.\n`;
      }
      
      return personalizedPrompt;
    } catch (error) {
      console.error('❌ Erro ao gerar prompt personalizado:', error);
      return basePrompt;
    }
  }

  /**
   * Atualiza contexto do usuário com nova interação
   */
  private async updateUserContext(phone: string, sessionName: string, analysis: ContextAnalysis, message: string): Promise<void> {
    try {
      const profile = await this.getUserProfile(phone, sessionName);
      
      // Atualizar tópicos frequentes
      for (const topic of analysis.topics) {
        if (!profile.frequent_topics.includes(topic)) {
          profile.frequent_topics.push(topic);
          if (profile.frequent_topics.length > 10) {
            profile.frequent_topics.shift(); // Manter apenas os 10 mais recentes
          }
        }
      }
      
      // Atualizar score de satisfação baseado no sentimento
      if (analysis.sentiment === 'positive') {
        profile.satisfaction_score = Math.min(1.0, profile.satisfaction_score + 0.1);
      } else if (analysis.sentiment === 'negative') {
        profile.satisfaction_score = Math.max(0.0, profile.satisfaction_score - 0.1);
      }
      
      // Incrementar total de mensagens
      profile.total_messages++;
      profile.last_interaction = new Date().toISOString();
      
      // Detectar estilo de interação baseado na mensagem
      if (this.isFormalMessage(message)) {
        profile.interaction_style = 'formal';
      } else if (this.isTechnicalMessage(message)) {
        profile.interaction_style = 'technical';
      }
      
      // Salvar no cache e banco
      this.userProfiles.set(phone, profile);
      
      // Buscar usuário e sessão para obter IDs
      const user = await databaseService.getUserByPhone(phone, sessionName);
      const session = await databaseService.getSessionByName(sessionName);
      
      if (user && session) {
        await databaseService.upsertUserContext({
          user_id: user.id,
          session_id: session.id,
          context_type: 'user_profile',
          context_data: {
            user_profile: {
              preferences: profile.preferences,
              interaction_style: profile.interaction_style,
              frequent_topics: profile.frequent_topics,
              response_preference: profile.response_preference,
              timezone: profile.timezone,
              language: profile.language,
              total_messages: profile.total_messages,
              satisfaction_score: profile.satisfaction_score
            },
            last_analysis: analysis
          },
          relevance_score: 1.0
        });
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar contexto do usuário:', error);
    }
  }

  /**
   * Métodos de análise privados
   */
  private analyzeSentiment(message: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['bom', 'ótimo', 'excelente', 'perfeito', 'obrigado', 'valeu', 'legal', 'bacana', 'gostei', 'adorei'];
    const negativeWords = ['ruim', 'péssimo', 'problema', 'erro', 'falha', 'chateado', 'irritado', 'insatisfeito', 'reclamação'];
    
    const messageLower = message.toLowerCase();
    
    const positiveCount = positiveWords.filter(word => messageLower.includes(word)).length;
    const negativeCount = negativeWords.filter(word => messageLower.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private detectIntent(message: string): string {
    for (const [intent, patterns] of this.intentPatterns.entries()) {
      for (const pattern of patterns) {
        if (pattern.test(message)) {
          return intent;
        }
      }
    }
    return 'unknown';
  }

  private extractEntities(message: string): Array<{ type: string; value: string; confidence: number }> {
    const entities: Array<{ type: string; value: string; confidence: number }> = [];
    
    for (const [type, pattern] of this.entityPatterns.entries()) {
      const matches = message.match(pattern);
      if (matches) {
        for (const match of matches) {
          entities.push({
            type,
            value: match,
            confidence: 0.8 // Confiança baseada em regex
          });
        }
      }
    }
    
    return entities;
  }

  private extractTopics(message: string): string[] {
    const topics: string[] = [];
    const messageLower = message.toLowerCase();
    
    // Tópicos baseados em palavras-chave
    const topicKeywords = {
      'suporte': ['ajuda', 'suporte', 'problema', 'dúvida', 'questão'],
      'vendas': ['comprar', 'preço', 'valor', 'custo', 'orçamento', 'venda'],
      'produto': ['produto', 'serviço', 'funcionalidade', 'recurso'],
      'pagamento': ['pagamento', 'pagar', 'cobrança', 'fatura', 'boleto'],
      'entrega': ['entrega', 'envio', 'prazo', 'correios', 'transportadora'],
      'cancelamento': ['cancelar', 'cancelamento', 'desistir', 'devolver'],
      'informação': ['informação', 'dados', 'detalhes', 'especificação']
    };
    
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => messageLower.includes(keyword))) {
        topics.push(topic);
      }
    }
    
    return topics.length > 0 ? topics : ['general'];
  }

  private assessUrgency(message: string): 'low' | 'medium' | 'high' {
    const urgentWords = ['urgente', 'emergência', 'imediato', 'agora', 'rápido', 'já'];
    const messageLower = message.toLowerCase();
    
    if (urgentWords.some(word => messageLower.includes(word))) {
      return 'high';
    }
    
    if (message.includes('!') || message.includes('???')) {
      return 'medium';
    }
    
    return 'low';
  }

  private detectLanguage(message: string): string {
    // Detecção simples baseada em palavras comuns
    const ptWords = ['que', 'não', 'com', 'para', 'uma', 'por', 'mais', 'como', 'mas', 'foi'];
    const enWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had'];
    
    const messageLower = message.toLowerCase();
    
    const ptCount = ptWords.filter(word => messageLower.includes(word)).length;
    const enCount = enWords.filter(word => messageLower.includes(word)).length;
    
    return ptCount > enCount ? 'pt-BR' : 'en-US';
  }

  private isFormalMessage(message: string): boolean {
    const formalWords = ['senhor', 'senhora', 'vossa', 'cordialmente', 'atenciosamente', 'prezado'];
    return formalWords.some(word => message.toLowerCase().includes(word));
  }

  private isTechnicalMessage(message: string): boolean {
    const technicalWords = ['api', 'database', 'servidor', 'código', 'bug', 'feature', 'deploy', 'config'];
    return technicalWords.some(word => message.toLowerCase().includes(word));
  }

  // Métodos auxiliares para contexto de conversa
  private inferCurrentTopic(messages: any[]): string {
    if (!messages.length) return 'general';
    
    const recentMessage = messages[0];
    const topics = this.extractTopics(recentMessage.content || '');
    return topics[0] || 'general';
  }

  private buildConversationFlow(messages: any[]): string[] {
    return messages.map(msg => this.detectIntent(msg.content || '')).reverse();
  }

  private findUnresolvedQuestions(messages: any[]): string[] {
    const questions: string[] = [];
    
    for (const msg of messages) {
      if (msg.sender_type === 'user' && (msg.content?.includes('?') || this.detectIntent(msg.content) === 'question')) {
        questions.push(msg.content);
      }
    }
    
    return questions.slice(0, 3); // Máximo 3 questões não resolvidas
  }

  private aggregateEntities(messages: any[]): Array<{ entity: string; type: string; mentions: number }> {
    const entityMap = new Map<string, { type: string; mentions: number }>();
    
    for (const msg of messages) {
      const entities = this.extractEntities(msg.content || '');
      for (const entity of entities) {
        const key = entity.value;
        if (entityMap.has(key)) {
          entityMap.get(key)!.mentions++;
        } else {
          entityMap.set(key, { type: entity.type, mentions: 1 });
        }
      }
    }
    
    return Array.from(entityMap.entries()).map(([entity, data]) => ({
      entity,
      type: data.type,
      mentions: data.mentions
    }));
  }

  private determineConversationStage(messages: any[]): 'greeting' | 'information_gathering' | 'problem_solving' | 'closing' {
    if (!messages.length) return 'greeting';
    
    const recentIntents = messages.slice(0, 3).map(msg => this.detectIntent(msg.content || ''));
    
    if (recentIntents.includes('goodbye')) return 'closing';
    if (recentIntents.includes('complaint') || recentIntents.includes('request')) return 'problem_solving';
    if (recentIntents.includes('question')) return 'information_gathering';
    if (recentIntents.includes('greeting')) return 'greeting';
    
    return 'information_gathering';
  }

  private checkFollowupNeeded(messages: any[]): boolean {
    if (!messages.length) return false;
    
    const lastMessage = messages[0];
    const intent = this.detectIntent(lastMessage.content || '');
    
    return ['question', 'complaint', 'request'].includes(intent) && lastMessage.sender_type === 'user';
  }

  /**
   * Limpa cache de contextos (para otimização de memória)
   */
  clearContextCache(phone?: string): void {
    if (phone) {
      this.userProfiles.delete(phone);
      // Limpar contextos de conversa relacionados
      for (const [key] of this.conversationContexts.entries()) {
        if (key.includes(phone)) {
          this.conversationContexts.delete(key);
        }
      }
    } else {
      this.userProfiles.clear();
      this.conversationContexts.clear();
    }
    
    console.log(`🧹 Cache de contexto limpo${phone ? ` para ${phone}` : ''}`);
  }
}

// Instância singleton do motor de contexto
export const contextEngineService = new ContextEngineService();