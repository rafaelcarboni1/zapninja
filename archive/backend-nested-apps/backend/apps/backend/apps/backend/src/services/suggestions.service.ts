import { contextEngineService } from './context-engine.service';
import { adminCommandsService } from './admin-commands.service';
import { databaseService } from './database.service';
import { sessionManager } from './session.manager';

/**
 * Interface para sugestão de comando
 */
interface CommandSuggestion {
  command: string;
  description: string;
  category: string;
  relevance_score: number;
  reason: string;
  example?: string;
  priority: 'low' | 'medium' | 'high';
}

/**
 * Interface para contexto de sugestão
 */
interface SuggestionContext {
  user_message: string;
  user_profile: any;
  conversation_context: any;
  recent_commands: string[];
  session_stats: any;
  time_of_day: string;
  day_of_week: string;
}

/**
 * Interface para padrões de uso
 */
interface UsagePattern {
  command: string;
  frequency: number;
  success_rate: number;
  avg_response_time: number;
  common_contexts: string[];
  time_patterns: Array<{ hour: number; usage_count: number }>;
}

/**
 * Serviço de sugestões inteligentes
 * Analisa contexto e sugere comandos relevantes
 */
export class SuggestionsService {
  private commandUsagePatterns = new Map<string, UsagePattern>();
  private contextualRules = new Map<string, Array<{ condition: (ctx: SuggestionContext) => boolean; suggestions: string[] }>>();
  private learningData = new Map<string, any>();

  constructor() {
    this.initializeContextualRules();
    this.loadUsagePatterns();
    console.log('💡 Sistema de Sugestões Inteligentes inicializado');
  }

  /**
   * Inicializa regras contextuais para sugestões
   */
  private initializeContextualRules(): void {
    // Regras baseadas em intenção do usuário
    this.contextualRules.set('intent_based', [
      {
        condition: (ctx) => ctx.user_message.toLowerCase().includes('problema') || ctx.user_message.toLowerCase().includes('erro'),
        suggestions: ['status', 'logs', 'diagnostico', 'reiniciar_sessao', 'limpar_cache']
      },
      {
        condition: (ctx) => ctx.user_message.toLowerCase().includes('lento') || ctx.user_message.toLowerCase().includes('demora'),
        suggestions: ['tempo_resposta', 'delay_mensagem', 'config_timing', 'otimizar']
      },
      {
        condition: (ctx) => ctx.user_message.toLowerCase().includes('usuário') || ctx.user_message.toLowerCase().includes('cliente'),
        suggestions: ['listar_usuarios', 'stats_usuario', 'buscar_usuario', 'contexto_usuario']
      },
      {
        condition: (ctx) => ctx.user_message.toLowerCase().includes('mensagem') || ctx.user_message.toLowerCase().includes('conversa'),
        suggestions: ['historico', 'buscar_mensagem', 'stats_conversa', 'exportar_conversa']
      },
      {
        condition: (ctx) => ctx.user_message.toLowerCase().includes('configurar') || ctx.user_message.toLowerCase().includes('config'),
        suggestions: ['config', 'config_timing', 'config_ia', 'horario_funcionamento']
      }
    ]);

    // Regras baseadas em horário
    this.contextualRules.set('time_based', [
      {
        condition: (ctx) => ctx.time_of_day === 'morning',
        suggestions: ['status', 'stats_diarias', 'backup', 'limpar_logs']
      },
      {
        condition: (ctx) => ctx.time_of_day === 'evening',
        suggestions: ['relatorio_diario', 'backup', 'stats_diarias', 'manutencao']
      },
      {
        condition: (ctx) => ctx.day_of_week === 'monday',
        suggestions: ['status', 'stats_semanais', 'limpar_cache', 'otimizar']
      }
    ]);

    // Regras baseadas em contexto da conversa
    this.contextualRules.set('conversation_based', [
      {
        condition: (ctx) => ctx.conversation_context?.conversation_stage === 'problem_solving',
        suggestions: ['diagnostico', 'logs', 'reiniciar_sessao', 'suporte']
      },
      {
        condition: (ctx) => ctx.conversation_context?.requires_followup,
        suggestions: ['historico', 'contexto_usuario', 'continuar_conversa']
      },
      {
        condition: (ctx) => ctx.conversation_context?.unresolved_questions?.length > 0,
        suggestions: ['buscar_mensagem', 'contexto_usuario', 'sugestoes_resposta']
      }
    ]);

    // Regras baseadas em performance
    this.contextualRules.set('performance_based', [
      {
        condition: (ctx) => ctx.session_stats?.avg_response_time > 5000,
        suggestions: ['otimizar', 'tempo_resposta', 'diagnostico', 'reiniciar_sessao']
      },
      {
        condition: (ctx) => ctx.session_stats?.error_rate > 0.1,
        suggestions: ['logs', 'diagnostico', 'reiniciar_sessao', 'status']
      },
      {
        condition: (ctx) => ctx.session_stats?.memory_usage > 0.8,
        suggestions: ['limpar_cache', 'otimizar', 'reiniciar_sessao', 'manutencao']
      }
    ]);

    console.log(`✅ ${this.contextualRules.size} categorias de regras contextuais carregadas`);
  }

  /**
   * Carrega padrões de uso dos comandos do banco de dados
   */
  private async loadUsagePatterns(): Promise<void> {
    try {
      // Buscar dados de uso dos comandos no banco
      const usageData = await databaseService.getCommandUsageStats();
      
      // Iterar sobre as entradas do objeto (comando -> frequência)
      for (const [command, frequency] of Object.entries(usageData)) {
        this.commandUsagePatterns.set(command, {
          command: command,
          frequency: frequency || 0,
          success_rate: 1.0, // Valor padrão
          avg_response_time: 1000, // Valor padrão
          common_contexts: [], // Valor padrão
          time_patterns: [] // Valor padrão
        });
      }
      
      console.log(`📊 ${this.commandUsagePatterns.size} padrões de uso carregados`);
    } catch (error) {
      console.error('❌ Erro ao carregar padrões de uso:', error);
    }
  }

  /**
   * Gera sugestões inteligentes baseadas no contexto
   */
  async generateSuggestions(phone: string, sessionName: string, userMessage: string, limit: number = 5): Promise<CommandSuggestion[]> {
    try {
      // Construir contexto completo
      const context = await this.buildSuggestionContext(phone, sessionName, userMessage);
      
      // Gerar sugestões de diferentes fontes
      const suggestions: CommandSuggestion[] = [];
      
      // 1. Sugestões baseadas em regras contextuais
      const contextualSuggestions = this.getContextualSuggestions(context);
      suggestions.push(...contextualSuggestions);
      
      // 2. Sugestões baseadas em padrões de uso
      const patternSuggestions = this.getPatternBasedSuggestions(context);
      suggestions.push(...patternSuggestions);
      
      // 3. Sugestões baseadas em similaridade semântica
      const semanticSuggestions = this.getSemanticSuggestions(context);
      suggestions.push(...semanticSuggestions);
      
      // 4. Sugestões baseadas em comandos populares
      const popularSuggestions = this.getPopularSuggestions(context);
      suggestions.push(...popularSuggestions);
      
      // Remover duplicatas e ordenar por relevância
      const uniqueSuggestions = this.deduplicateAndRank(suggestions);
      
      // Aplicar aprendizado para melhorar sugestões futuras
      await this.recordSuggestionGeneration(phone, sessionName, userMessage, uniqueSuggestions);
      
      return uniqueSuggestions.slice(0, limit);
    } catch (error) {
      console.error('❌ Erro ao gerar sugestões:', error);
      return this.getFallbackSuggestions();
    }
  }

  /**
   * Constrói contexto completo para geração de sugestões
   */
  private async buildSuggestionContext(phone: string, sessionName: string, userMessage: string): Promise<SuggestionContext> {
    try {
      const [userProfile, conversationContext, recentCommands, sessionStats] = await Promise.all([
        contextEngineService.getUserProfile(phone, sessionName),
        contextEngineService.getConversationContext(phone, sessionName),
        this.getRecentCommands(phone, sessionName),
        sessionManager.getSessionStats(sessionName)
      ]);
      
      const now = new Date();
      const timeOfDay = this.getTimeOfDay(now.getHours());
      const dayOfWeek = now.toLocaleDateString('pt-BR', { weekday: 'long' }).toLowerCase();
      
      return {
        user_message: userMessage,
        user_profile: userProfile,
        conversation_context: conversationContext,
        recent_commands: recentCommands,
        session_stats: sessionStats,
        time_of_day: timeOfDay,
        day_of_week: dayOfWeek
      };
    } catch (error) {
      console.error('❌ Erro ao construir contexto de sugestão:', error);
      return {
        user_message: userMessage,
        user_profile: {},
        conversation_context: {},
        recent_commands: [],
        session_stats: {},
        time_of_day: 'unknown',
        day_of_week: 'unknown'
      };
    }
  }

  /**
   * Obtém sugestões baseadas em regras contextuais
   */
  private getContextualSuggestions(context: SuggestionContext): CommandSuggestion[] {
    const suggestions: CommandSuggestion[] = [];
    
    for (const [category, rules] of this.contextualRules.entries()) {
      for (const rule of rules) {
        if (rule.condition(context)) {
          for (const command of rule.suggestions) {
            const commandInfo = adminCommandsService.getCommandInfo(command);
            if (commandInfo && commandInfo.exists) {
              suggestions.push({
                command,
                description: commandInfo.description || 'Comando disponível',
                category: category,
                relevance_score: 0.8,
                reason: `Sugerido baseado em ${category}`,
                priority: 'high'
              });
            } else {
              // Fallback para comandos não mapeados
              suggestions.push({
                command,
                description: this.getDefaultCommandDescription(command),
                category: category,
                relevance_score: 0.6,
                reason: `Sugerido baseado em ${category}`,
                priority: 'medium'
              });
            }
          }
        }
      }
    }
    
    return suggestions;
  }

  /**
   * Obtém sugestões baseadas em padrões de uso
   */
  private getPatternBasedSuggestions(context: SuggestionContext): CommandSuggestion[] {
    const suggestions: CommandSuggestion[] = [];
    
    // Analisar padrões de uso similares
    for (const [command, pattern] of this.commandUsagePatterns.entries()) {
      let relevanceScore = 0;
      
      // Verificar se o comando é usado em contextos similares
      const contextMatch = pattern.common_contexts.some(ctx => 
        context.user_message.toLowerCase().includes(ctx.toLowerCase())
      );
      if (contextMatch) relevanceScore += 0.3;
      
      // Verificar padrões de horário
      const currentHour = new Date().getHours();
      const timePattern = pattern.time_patterns.find(tp => tp.hour === currentHour);
      if (timePattern && timePattern.usage_count > 0) {
        relevanceScore += 0.2;
      }
      
      // Considerar frequência e taxa de sucesso
      relevanceScore += (pattern.frequency / 100) * 0.3;
      relevanceScore += pattern.success_rate * 0.2;
      
      if (relevanceScore > 0.4) {
        const commandInfo = adminCommandsService.getCommandInfo(command);
        if (commandInfo && commandInfo.exists) {
          suggestions.push({
            command,
            description: commandInfo.description || 'Comando disponível',
            category: 'padrões',
            relevance_score: relevanceScore,
            reason: `Baseado em padrões de uso (${(pattern.frequency || 0)} usos, ${(pattern.success_rate * 100).toFixed(0)}% sucesso)`,
            priority: relevanceScore > 0.7 ? 'high' : 'medium'
          });
        }
      }
    }
    
    return suggestions;
  }

  /**
   * Obtém sugestões baseadas em similaridade semântica
   */
  private getSemanticSuggestions(context: SuggestionContext): CommandSuggestion[] {
    const suggestions: CommandSuggestion[] = [];
    const userMessage = context.user_message.toLowerCase();
    
    // Mapeamento semântico simples
    const semanticMap = {
      'status': ['estado', 'situação', 'como está', 'funcionando'],
      'ajuda': ['help', 'socorro', 'não sei', 'como fazer'],
      'reiniciar': ['restart', 'resetar', 'recomeçar', 'parar'],
      'config': ['config', 'setup', 'definir', 'ajustar', 'configurar'],
      'listar': ['mostrar', 'ver', 'exibir', 'lista'],
      'buscar': ['procurar', 'encontrar', 'search', 'localizar'],
      'limpar': ['clean', 'apagar', 'remover', 'deletar'],
      'backup': ['salvar', 'cópia', 'backup', 'exportar'],
      'stats': ['estatísticas', 'números', 'dados', 'relatório'],
      'logs': ['log', 'histórico', 'registro', 'arquivo']
    };
    
    for (const [command, keywords] of Object.entries(semanticMap)) {
      const matchScore = keywords.reduce((score, keyword) => {
        if (userMessage.includes(keyword)) {
          return score + (1 / keywords.length);
        }
        return score;
      }, 0);
      
      if (matchScore > 0) {
        const commandInfo = adminCommandsService.getCommandInfo(command);
        if (commandInfo && commandInfo.exists) {
          suggestions.push({
            command,
            description: commandInfo.description || this.getDefaultCommandDescription(command),
            category: 'semântica',
            relevance_score: matchScore * 0.6,
            reason: `Similaridade semântica (${(matchScore * 100).toFixed(0)}% match)`,
            priority: matchScore > 0.7 ? 'high' : 'medium'
          });
        } else {
          suggestions.push({
            command,
            description: this.getDefaultCommandDescription(command),
            category: 'semântica',
            relevance_score: matchScore * 0.5,
            reason: `Similaridade semântica (${(matchScore * 100).toFixed(0)}% match)`,
            priority: 'medium'
          });
        }
      }
    }
    
    return suggestions;
  }

  /**
   * Obtém sugestões de comandos populares
   */
  private getPopularSuggestions(context: SuggestionContext): CommandSuggestion[] {
    const suggestions: CommandSuggestion[] = [];
    
    // Comandos mais populares por categoria
    const popularCommands = {
      'básicos': ['status', 'ajuda', 'info'],
      'sessões': ['listar_sessoes', 'stats_sessao'],
      'usuários': ['listar_usuarios', 'stats_usuario'],
      'sistema': ['diagnostico', 'logs']
    };
    
    // Evitar sugerir comandos usados recentemente
    const recentCommands = new Set(context.recent_commands);
    
    for (const [category, commands] of Object.entries(popularCommands)) {
      for (const command of commands) {
        if (!recentCommands.has(command)) {
          const commandInfo = adminCommandsService.getCommandInfo(command);
          if (commandInfo && commandInfo.exists) {
            suggestions.push({
              command,
              description: commandInfo.description || this.getDefaultCommandDescription(command),
              category: 'populares',
              relevance_score: 0.3,
              reason: `Comando popular da categoria ${category}`,
              priority: 'low'
            });
          } else {
            suggestions.push({
              command,
              description: this.getDefaultCommandDescription(command),
              category: 'populares',
              relevance_score: 0.2,
              reason: `Comando popular da categoria ${category}`,
              priority: 'low'
            });
          }
        }
      }
    }
    
    return suggestions;
  }

  /**
   * Remove duplicatas e ordena sugestões por relevância
   */
  private deduplicateAndRank(suggestions: CommandSuggestion[]): CommandSuggestion[] {
    // Remover duplicatas baseado no comando
    const uniqueMap = new Map<string, CommandSuggestion>();
    
    for (const suggestion of suggestions) {
      const existing = uniqueMap.get(suggestion.command);
      if (!existing || suggestion.relevance_score > existing.relevance_score) {
        uniqueMap.set(suggestion.command, suggestion);
      }
    }
    
    // Ordenar por relevância e prioridade
    return Array.from(uniqueMap.values()).sort((a, b) => {
      // Primeiro por prioridade
      const priorityOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Depois por score de relevância
      return b.relevance_score - a.relevance_score;
    });
  }

  /**
   * Registra feedback sobre sugestão utilizada
   */
  async recordSuggestionFeedback(phone: string, sessionName: string, command: string, wasUseful: boolean): Promise<void> {
    try {
      // Atualizar padrões de uso
      const pattern = this.commandUsagePatterns.get(command);
      if (pattern) {
        if (wasUseful) {
          pattern.frequency++;
          pattern.success_rate = (pattern.success_rate * 0.9) + (1.0 * 0.1); // Média móvel
        } else {
          pattern.success_rate = (pattern.success_rate * 0.9) + (0.0 * 0.1);
        }
        
        this.commandUsagePatterns.set(command, pattern);
      }
      
      // Salvar feedback no banco para aprendizado
      const session = await databaseService.getSessionByName(sessionName);
      const user = await databaseService.getUserByPhone(phone, sessionName);
      
      if (session && user) {
        await databaseService.saveLearningData({
          session_id: session.id,
          user_id: user.id,
          interaction_type: 'suggestion_feedback',
          input_data: { command, user_message: 'feedback' },
          output_data: { feedback: wasUseful ? 'positive' : 'negative', command_used: command },
          feedback_score: wasUseful ? 5 : 1,
          learning_tags: ['suggestion', 'feedback', command]
        });
      }
      
      console.log(`📝 Feedback registrado: ${command} - ${wasUseful ? 'útil' : 'não útil'}`);
    } catch (error) {
      console.error('❌ Erro ao registrar feedback:', error);
    }
  }

  /**
   * Obtém comandos recentes do usuário
   */
  private async getRecentCommands(phone: string, sessionName: string, limit: number = 5): Promise<string[]> {
    try {
      // TODO: Implementar método getRecentAdminCommands no DatabaseService
      return [];
    } catch (error) {
      console.error('❌ Erro ao obter comandos recentes:', error);
      return [];
    }
  }

  /**
   * Registra geração de sugestões para aprendizado
   */
  private async recordSuggestionGeneration(phone: string, sessionName: string, userMessage: string, suggestions: CommandSuggestion[]): Promise<void> {
    try {
      const session = await databaseService.getSessionByName(sessionName);
      const user = await databaseService.getUserByPhone(phone, sessionName);
      
      if (session && user) {
        await databaseService.saveLearningData({
          session_id: session.id,
          user_id: user.id,
          interaction_type: 'suggestion_generation',
          input_data: { user_message: userMessage },
          output_data: { 
            suggestions: suggestions.map(s => ({ command: s.command, score: s.relevance_score })),
            suggestion_count: suggestions.length
          },
          learning_tags: ['suggestion', 'generation']
        });
      }
    } catch (error) {
      console.error('❌ Erro ao registrar geração de sugestões:', error);
    }
  }

  /**
   * Obtém sugestões de fallback em caso de erro
   */
  private getFallbackSuggestions(): CommandSuggestion[] {
    const fallbackCommands = ['status', 'ajuda', 'info', 'listar_sessoes', 'diagnostico'];
    
    return fallbackCommands.map(command => {
      const commandInfo = adminCommandsService.getCommandInfo(command);
      return {
        command,
        description: (commandInfo?.exists ? commandInfo.description : this.getDefaultCommandDescription(command)) || 'Comando básico',
        category: 'básicos',
        relevance_score: 0.2,
        reason: 'Sugestão padrão',
        priority: 'low' as const
      };
    });
  }

  /**
   * Retorna descrição padrão para comandos não mapeados
   */
  private getDefaultCommandDescription(command: string): string {
    const defaultDescriptions: Record<string, string> = {
      'diagnostico': 'Executa diagnóstico do sistema',
      'reiniciar_sessao': 'Reinicia a sessão atual',
      'limpar_cache': 'Limpa o cache do sistema',
      'tempo_resposta': 'Configura tempo de resposta',
      'delay_mensagem': 'Configura delay entre mensagens',
      'config_timing': 'Abre wizard de configuração de timing',
      'otimizar': 'Otimiza performance do sistema',
      'listar_usuarios': 'Lista usuários da sessão',
      'stats_usuario': 'Mostra estatísticas do usuário',
      'buscar_usuario': 'Busca usuário específico',
      'contexto_usuario': 'Mostra contexto do usuário',
      'historico': 'Mostra histórico de conversas',
      'buscar_mensagem': 'Busca mensagem específica',
      'stats_conversa': 'Estatísticas da conversa',
      'exportar_conversa': 'Exporta conversa',
      'config': 'Configurações gerais',
      'config_ia': 'Configurações da IA',
      'horario_funcionamento': 'Define horário de funcionamento',
      'logs': 'Mostra logs do sistema'
    };
    
    return defaultDescriptions[command] || `Comando ${command}`;
  }

  /**
   * Determina período do dia
   */
  private getTimeOfDay(hour: number): string {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  /**
   * Gera sugestões contextuais para resposta
   */
  async generateResponseSuggestions(phone: string, sessionName: string, userMessage: string): Promise<string[]> {
    try {
      const context = await this.buildSuggestionContext(phone, sessionName, userMessage);
      const suggestions: string[] = [];
      
      // Sugestões baseadas no contexto da conversa
      if (context.conversation_context?.current_topic) {
        const topic = context.conversation_context.current_topic;
        suggestions.push(`Vejo que estamos falando sobre ${topic}. Posso ajudar com mais detalhes?`);
      }
      
      // Sugestões baseadas no perfil do usuário
      if (context.user_profile?.frequent_topics?.length > 0) {
        const topics = context.user_profile.frequent_topics.slice(0, 2).join(' e ');
        suggestions.push(`Baseado no seu histórico, você costuma perguntar sobre ${topics}. Isso está relacionado?`);
      }
      
      // Sugestões baseadas em questões não resolvidas
      if (context.conversation_context?.unresolved_questions?.length > 0) {
        suggestions.push('Vejo que você tinha algumas questões anteriores. Gostaria que eu retome alguma delas?');
      }
      
      return suggestions.slice(0, 3);
    } catch (error) {
      console.error('❌ Erro ao gerar sugestões de resposta:', error);
      return ['Como posso ajudar você hoje?', 'Precisa de alguma informação específica?'];
    }
  }

  /**
   * Obtém estatísticas do sistema de sugestões
   */
  async getSuggestionStats(): Promise<any> {
    try {
      const stats = {
        total_patterns: this.commandUsagePatterns.size,
        total_rules: Array.from(this.contextualRules.values()).reduce((sum, rules) => sum + rules.length, 0),
        most_suggested_commands: this.getMostSuggestedCommands(),
        suggestion_accuracy: await this.calculateSuggestionAccuracy(),
        learning_data_points: 0 // TODO: Implementar getLearningDataCount no DatabaseService
      };
      
      return stats;
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas de sugestões:', error);
      return {};
    }
  }

  /**
   * Obtém comandos mais sugeridos
   */
  private getMostSuggestedCommands(): Array<{ command: string; frequency: number }> {
    return Array.from(this.commandUsagePatterns.entries())
      .map(([command, pattern]) => ({ command, frequency: pattern.frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
  }

  /**
   * Calcula precisão das sugestões
   */
  private async calculateSuggestionAccuracy(): Promise<number> {
    try {
      // TODO: Implementar método getLearningData no DatabaseService
      return 0;
    } catch (error) {
      console.error('❌ Erro ao calcular precisão:', error);
      return 0;
    }
  }
}

// Instância singleton do serviço de sugestões
export const suggestionsService = new SuggestionsService();