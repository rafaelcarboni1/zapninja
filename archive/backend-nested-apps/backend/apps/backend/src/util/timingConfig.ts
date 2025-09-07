import { logger } from './logger';

class TimingConfigManager {
  private minReadingTime: number;
  private readingTimePerChar: number;
  private minThinkingTime: number;
  private maxThinkingTime: number;
  private longBreakChance: number;
  private longBreakMinTime: number;
  private longBreakMaxTime: number;

  constructor() {
    this.loadFromEnv();
  }

  private loadFromEnv(): void {
    this.minReadingTime = parseInt(process.env.MIN_READING_TIME || '2000');
    this.readingTimePerChar = parseInt(process.env.READING_TIME_PER_CHAR || '50');
    this.minThinkingTime = parseInt(process.env.MIN_THINKING_TIME || '1000');
    this.maxThinkingTime = parseInt(process.env.MAX_THINKING_TIME || '5000');
    this.longBreakChance = parseFloat(process.env.LONG_BREAK_CHANCE || '0.05');
    this.longBreakMinTime = parseInt(process.env.LONG_BREAK_MIN_TIME || '5000');
    this.longBreakMaxTime = parseInt(process.env.LONG_BREAK_MAX_TIME || '15000');

    logger.info('Configurações de tempo carregadas', {
      minReadingTime: this.minReadingTime,
      readingTimePerChar: this.readingTimePerChar,
      minThinkingTime: this.minThinkingTime,
      maxThinkingTime: this.maxThinkingTime,
      longBreakChance: this.longBreakChance,
      longBreakMinTime: this.longBreakMinTime,
      longBreakMaxTime: this.longBreakMaxTime
    });
  }

  public calculateResponseDelay(messageLength: number): {
    delay: number;
    isLongBreak: boolean;
    description: string;
  } {
    // Tempo de leitura baseado no tamanho da mensagem
    const readingTime = Math.max(this.minReadingTime, messageLength * this.readingTimePerChar);
    
    // Tempo de reflexão aleatório
    const thinkingTime = Math.random() * (this.maxThinkingTime - this.minThinkingTime) + this.minThinkingTime;
    
    // Tempo base
    const baseDelay = readingTime + thinkingTime;
    
    // Verifica se deve fazer uma pausa mais longa
    const shouldTakeLongerBreak = Math.random() < this.longBreakChance;
    
    if (shouldTakeLongerBreak) {
      const extraTime = Math.random() * (this.longBreakMaxTime - this.longBreakMinTime) + this.longBreakMinTime;
      const finalDelay = baseDelay + extraTime;
      
      return {
        delay: finalDelay,
        isLongBreak: true,
        description: `Simulando pausa mais longa por ${Math.round(finalDelay/1000)}s (como se estivesse ocupado)...`
      };
    }
    
    return {
      delay: baseDelay,
      isLongBreak: false,
      description: `Simulando leitura e reflexão por ${Math.round(baseDelay/1000)}s...`
    };
  }

  public updateConfig(config: Partial<{
    minReadingTime: number;
    readingTimePerChar: number;
    minThinkingTime: number;
    maxThinkingTime: number;
    longBreakChance: number;
    longBreakMinTime: number;
    longBreakMaxTime: number;
  }>): void {
    if (config.minReadingTime !== undefined) {
      this.minReadingTime = config.minReadingTime;
    }
    if (config.readingTimePerChar !== undefined) {
      this.readingTimePerChar = config.readingTimePerChar;
    }
    if (config.minThinkingTime !== undefined) {
      this.minThinkingTime = config.minThinkingTime;
    }
    if (config.maxThinkingTime !== undefined) {
      this.maxThinkingTime = config.maxThinkingTime;
    }
    if (config.longBreakChance !== undefined) {
      this.longBreakChance = config.longBreakChance;
    }
    if (config.longBreakMinTime !== undefined) {
      this.longBreakMinTime = config.longBreakMinTime;
    }
    if (config.longBreakMaxTime !== undefined) {
      this.longBreakMaxTime = config.longBreakMaxTime;
    }

    logger.info('Configurações de tempo atualizadas', {
      minReadingTime: this.minReadingTime,
      readingTimePerChar: this.readingTimePerChar,
      minThinkingTime: this.minThinkingTime,
      maxThinkingTime: this.maxThinkingTime,
      longBreakChance: this.longBreakChance,
      longBreakMinTime: this.longBreakMinTime,
      longBreakMaxTime: this.longBreakMaxTime
    });
  }

  public getCurrentConfig(): {
    minReadingTime: number;
    readingTimePerChar: number;
    minThinkingTime: number;
    maxThinkingTime: number;
    longBreakChance: number;
    longBreakMinTime: number;
    longBreakMaxTime: number;
  } {
    return {
      minReadingTime: this.minReadingTime,
      readingTimePerChar: this.readingTimePerChar,
      minThinkingTime: this.minThinkingTime,
      maxThinkingTime: this.maxThinkingTime,
      longBreakChance: this.longBreakChance,
      longBreakMinTime: this.longBreakMinTime,
      longBreakMaxTime: this.longBreakMaxTime
    };
  }

  public getConfigSummary(): string {
    const config = this.getCurrentConfig();
    return `📊 *Configurações de Tempo Atuais:*\n\n` +
           `⏱️ *Tempo mínimo de leitura:* ${config.minReadingTime}ms\n` +
           `📖 *Tempo por caractere:* ${config.readingTimePerChar}ms\n` +
           `🤔 *Tempo de reflexão:* ${config.minThinkingTime}ms - ${config.maxThinkingTime}ms\n` +
           `⏸️ *Chance de pausa longa:* ${(config.longBreakChance * 100).toFixed(1)}%\n` +
           `🕐 *Pausa longa:* ${config.longBreakMinTime}ms - ${config.longBreakMaxTime}ms`;
  }
}

export const timingConfigManager = new TimingConfigManager();