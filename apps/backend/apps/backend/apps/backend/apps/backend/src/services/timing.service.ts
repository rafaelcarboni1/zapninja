import { databaseService } from './database.service';
import { sessionManager } from './session.manager';

/**
 * Interface para configurações de timing
 */
interface TimingConfig {
  response_time: number; // Tempo antes de responder (ms)
  message_delay: number; // Delay entre mensagens (ms)
  rest_period: number; // Período de descanso (ms)
  working_hours: {
    start: string; // HH:MM
    end: string; // HH:MM
  };
  message_limit: number; // Limite de mensagens por hora por usuário
  typing_simulation: boolean; // Simular digitação
  burst_protection: boolean; // Proteção contra rajadas
  adaptive_timing: boolean; // Timing adaptativo baseado no contexto
}

/**
 * Interface para controle de rate limiting
 */
interface UserRateLimit {
  phone: string;
  messageCount: number;
  windowStart: number;
  lastMessage: number;
}

/**
 * Serviço de controle de timing e delays
 * Gerencia todos os aspectos temporais do sistema de IA
 */
export class TimingService {
  private userRateLimits = new Map<string, UserRateLimit>();
  private activeDelays = new Map<string, NodeJS.Timeout>();
  private typingSimulations = new Map<string, NodeJS.Timeout>();
  private restPeriods = new Map<string, number>();

  constructor() {
    console.log('🕐 Serviço de Timing inicializado');
    this.startCleanupInterval();
  }

  /**
   * Verifica se está dentro do horário de funcionamento
   */
  async isWithinWorkingHours(sessionName: string): Promise<boolean> {
    try {
      const session = await sessionManager.getSession(sessionName);
      if (!session?.timing_config?.working_hours) {
        return true; // Se não configurado, funciona 24h
      }

      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      const { start, end } = session.timing_config.working_hours;
      
      // Converter para minutos para facilitar comparação
      const currentMinutes = this.timeToMinutes(currentTime);
      const startMinutes = this.timeToMinutes(start);
      const endMinutes = this.timeToMinutes(end);
      
      // Verificar se o horário cruza a meia-noite
      if (startMinutes <= endMinutes) {
        // Horário normal (ex: 08:00 - 18:00)
        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
      } else {
        // Horário que cruza meia-noite (ex: 22:00 - 06:00)
        return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
      }
    } catch (error) {
      console.error('❌ Erro ao verificar horário de funcionamento:', error);
      return true; // Em caso de erro, permite funcionamento
    }
  }

  /**
   * Verifica se usuário está dentro do limite de mensagens
   */
  async checkRateLimit(phone: string, sessionName: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    try {
      const session = await sessionManager.getSession(sessionName);
      const messageLimit = session?.timing_config?.message_limit || 100;
      
      if (messageLimit === 0) {
        return { allowed: true, remaining: Infinity, resetTime: 0 };
      }

      const now = Date.now();
      const windowDuration = 60 * 60 * 1000; // 1 hora em ms
      
      let userLimit = this.userRateLimits.get(phone);
      
      if (!userLimit || (now - userLimit.windowStart) > windowDuration) {
        // Nova janela de tempo
        userLimit = {
          phone,
          messageCount: 0,
          windowStart: now,
          lastMessage: now
        };
        this.userRateLimits.set(phone, userLimit);
      }
      
      const allowed = userLimit.messageCount < messageLimit;
      const remaining = Math.max(0, messageLimit - userLimit.messageCount);
      const resetTime = userLimit.windowStart + windowDuration;
      
      if (allowed) {
        userLimit.messageCount++;
        userLimit.lastMessage = now;
      }
      
      return { allowed, remaining, resetTime };
    } catch (error) {
      console.error('❌ Erro ao verificar rate limit:', error);
      return { allowed: true, remaining: 100, resetTime: 0 };
    }
  }

  /**
   * Calcula delay antes de responder
   */
  async calculateResponseDelay(sessionName: string, messageLength: number = 0): Promise<number> {
    try {
      const session = await sessionManager.getSession(sessionName);
      const config = session?.timing_config;
      
      if (!config) {
        return 2000; // Delay padrão
      }

      let baseDelay = config.response_time || 2000;
      
      // Timing adaptativo baseado no tamanho da mensagem
      if (config.adaptive_timing && messageLength > 0) {
        // Adicionar delay baseado no tamanho (simular tempo de leitura)
        const readingTime = Math.min(messageLength * 50, 3000); // Máximo 3s
        baseDelay += readingTime;
      }
      
      // Adicionar variação aleatória para parecer mais humano (±20%)
      const variation = baseDelay * 0.2;
      const randomDelay = baseDelay + (Math.random() - 0.5) * variation;
      
      return Math.max(500, Math.round(randomDelay)); // Mínimo 500ms
    } catch (error) {
      console.error('❌ Erro ao calcular delay de resposta:', error);
      return 2000;
    }
  }

  /**
   * Aplica delay antes de responder
   */
  async applyResponseDelay(sessionName: string, messageLength: number = 0): Promise<void> {
    const delay = await this.calculateResponseDelay(sessionName, messageLength);
    
    console.log(`⏱️ Aplicando delay de resposta: ${delay}ms`);
    
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        this.activeDelays.delete(sessionName);
        resolve();
      }, delay);
      
      this.activeDelays.set(sessionName, timeoutId);
    });
  }

  /**
   * Simula digitação (indicador de "digitando...")
   */
  async simulateTyping(sessionName: string, responseLength: number = 0): Promise<void> {
    try {
      const session = await sessionManager.getSession(sessionName);
      const config = session?.timing_config;
      
      if (!config?.typing_simulation) {
        return; // Simulação desabilitada
      }

      // Calcular tempo de digitação baseado no tamanho da resposta
      // Assumindo ~60 WPM (palavras por minuto) = ~300 caracteres por minuto
      const typingSpeed = 300; // caracteres por minuto
      const typingTime = Math.min((responseLength / typingSpeed) * 60 * 1000, 10000); // Máximo 10s
      
      if (typingTime < 1000) {
        return; // Muito rápido para simular
      }

      console.log(`⌨️ Simulando digitação por ${typingTime}ms`);
      
      return new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
          this.typingSimulations.delete(sessionName);
          resolve();
        }, typingTime);
        
        this.typingSimulations.set(sessionName, timeoutId);
      });
    } catch (error) {
      console.error('❌ Erro ao simular digitação:', error);
    }
  }

  /**
   * Aplica delay entre mensagens consecutivas
   */
  async applyMessageDelay(sessionName: string): Promise<void> {
    try {
      const session = await sessionManager.getSession(sessionName);
      const delay = session?.timing_config?.message_delay || 1000;
      
      if (delay <= 0) {
        return;
      }

      console.log(`⏱️ Aplicando delay entre mensagens: ${delay}ms`);
      
      return new Promise((resolve) => {
        setTimeout(resolve, delay);
      });
    } catch (error) {
      console.error('❌ Erro ao aplicar delay entre mensagens:', error);
    }
  }

  /**
   * Verifica se deve aplicar período de descanso
   */
  async shouldApplyRestPeriod(sessionName: string): Promise<boolean> {
    try {
      const session = await sessionManager.getSession(sessionName);
      const restPeriod = session?.timing_config?.rest_period || 0;
      
      if (restPeriod <= 0) {
        return false;
      }

      const lastRest = this.restPeriods.get(sessionName) || 0;
      const now = Date.now();
      const timeSinceLastRest = now - lastRest;
      
      // Aplicar descanso a cada 10 mensagens ou 5 minutos (o que vier primeiro)
      const restInterval = Math.min(10 * 2000, 5 * 60 * 1000); // 10 mensagens * 2s ou 5 min
      
      return timeSinceLastRest >= restInterval;
    } catch (error) {
      console.error('❌ Erro ao verificar período de descanso:', error);
      return false;
    }
  }

  /**
   * Aplica período de descanso
   */
  async applyRestPeriod(sessionName: string): Promise<void> {
    try {
      const session = await sessionManager.getSession(sessionName);
      const restPeriod = session?.timing_config?.rest_period || 0;
      
      if (restPeriod <= 0) {
        return;
      }

      console.log(`😴 Aplicando período de descanso: ${restPeriod}ms`);
      
      this.restPeriods.set(sessionName, Date.now());
      
      return new Promise((resolve) => {
        setTimeout(resolve, restPeriod);
      });
    } catch (error) {
      console.error('❌ Erro ao aplicar período de descanso:', error);
    }
  }

  /**
   * Detecta e previne rajadas de mensagens (burst protection)
   */
  async checkBurstProtection(phone: string, sessionName: string): Promise<{ blocked: boolean; reason?: string }> {
    try {
      const session = await sessionManager.getSession(sessionName);
      const config = session?.timing_config;
      
      if (!config?.burst_protection) {
        return { blocked: false };
      }

      const userLimit = this.userRateLimits.get(phone);
      if (!userLimit) {
        return { blocked: false };
      }

      const now = Date.now();
      const timeSinceLastMessage = now - userLimit.lastMessage;
      
      // Bloquear se menos de 1 segundo desde a última mensagem
      if (timeSinceLastMessage < 1000) {
        return {
          blocked: true,
          reason: 'Muitas mensagens muito rápido. Aguarde um momento.'
        };
      }
      
      // Bloquear se mais de 5 mensagens em 30 segundos
      if (userLimit.messageCount > 5 && (now - userLimit.windowStart) < 30000) {
        return {
          blocked: true,
          reason: 'Limite de mensagens por minuto excedido. Tente novamente em alguns segundos.'
        };
      }
      
      return { blocked: false };
    } catch (error) {
      console.error('❌ Erro ao verificar proteção contra rajadas:', error);
      return { blocked: false };
    }
  }

  /**
   * Obtém estatísticas de timing
   */
  async getTimingStats(sessionName: string): Promise<any> {
    try {
      const session = await sessionManager.getSession(sessionName);
      const config = session?.timing_config;
      
      const stats = {
        session_name: sessionName,
        current_time: new Date().toISOString(),
        within_working_hours: await this.isWithinWorkingHours(sessionName),
        active_delays: this.activeDelays.size,
        active_typing_simulations: this.typingSimulations.size,
        tracked_users: this.userRateLimits.size,
        config: config || {},
        user_limits: Array.from(this.userRateLimits.entries()).map(([phone, limit]) => ({
          phone,
          messages_in_window: limit.messageCount,
          window_start: new Date(limit.windowStart).toISOString(),
          last_message: new Date(limit.lastMessage).toISOString()
        }))
      };
      
      return stats;
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas de timing:', error);
      return null;
    }
  }

  /**
   * Limpa delays ativos (para reinicialização)
   */
  clearActiveDelays(sessionName?: string): void {
    if (sessionName) {
      const timeoutId = this.activeDelays.get(sessionName);
      if (timeoutId) {
        clearTimeout(timeoutId);
        this.activeDelays.delete(sessionName);
      }
      
      const typingId = this.typingSimulations.get(sessionName);
      if (typingId) {
        clearTimeout(typingId);
        this.typingSimulations.delete(sessionName);
      }
    } else {
      // Limpar todos
      this.activeDelays.forEach(timeoutId => clearTimeout(timeoutId));
      this.typingSimulations.forEach(timeoutId => clearTimeout(timeoutId));
      this.activeDelays.clear();
      this.typingSimulations.clear();
    }
    
    console.log(`🧹 Delays ativos limpos${sessionName ? ` para ${sessionName}` : ''}`);
  }

  /**
   * Utilitários privados
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private startCleanupInterval(): void {
    // Limpar dados antigos a cada hora
    setInterval(() => {
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      
      // Limpar rate limits antigos
      for (const [phone, limit] of this.userRateLimits.entries()) {
        if ((now - limit.windowStart) > oneHour) {
          this.userRateLimits.delete(phone);
        }
      }
      
      // Limpar períodos de descanso antigos
      for (const [sessionName, lastRest] of this.restPeriods.entries()) {
        if ((now - lastRest) > oneHour) {
          this.restPeriods.delete(sessionName);
        }
      }
      
      console.log('🧹 Limpeza automática de dados de timing realizada');
    }, 60 * 60 * 1000); // A cada hora
  }

  /**
   * Configurações predefinidas para diferentes cenários
   */
  static getPresetConfigs(): Record<string, Partial<TimingConfig>> {
    return {
      empresarial: {
        response_time: 2000,
        message_delay: 1000,
        rest_period: 0,
        working_hours: { start: '08:00', end: '18:00' },
        message_limit: 30,
        typing_simulation: true,
        burst_protection: true,
        adaptive_timing: false
      },
      chatbot_rapido: {
        response_time: 1000,
        message_delay: 500,
        rest_period: 0,
        working_hours: { start: '00:00', end: '23:59' },
        message_limit: 100,
        typing_simulation: false,
        burst_protection: true,
        adaptive_timing: false
      },
      humano_realista: {
        response_time: 4000,
        message_delay: 2000,
        rest_period: 10000,
        working_hours: { start: '07:00', end: '22:00' },
        message_limit: 50,
        typing_simulation: true,
        burst_protection: true,
        adaptive_timing: true
      },
      suporte_24h: {
        response_time: 1500,
        message_delay: 800,
        rest_period: 5000,
        working_hours: { start: '00:00', end: '23:59' },
        message_limit: 80,
        typing_simulation: true,
        burst_protection: true,
        adaptive_timing: true
      }
    };
  }
}

// Instância singleton do serviço de timing
export const timingService = new TimingService();