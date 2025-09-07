import fs from 'fs';
import path from 'path';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

class Logger {
  private logLevel: LogLevel;
  private saveToFile: boolean;
  private logsDirectory: string;

  constructor() {
    this.logLevel = this.getLogLevelFromEnv();
    this.saveToFile = process.env.SAVE_LOGS_TO_FILE === 'true';
    this.logsDirectory = process.env.LOGS_DIRECTORY || './logs';
    
    if (this.saveToFile) {
      this.ensureLogsDirectory();
    }
  }

  private getLogLevelFromEnv(): LogLevel {
    const level = process.env.LOG_LEVEL?.toUpperCase();
    switch (level) {
      case 'DEBUG': return LogLevel.DEBUG;
      case 'INFO': return LogLevel.INFO;
      case 'WARN': return LogLevel.WARN;
      case 'ERROR': return LogLevel.ERROR;
      default: return LogLevel.INFO;
    }
  }

  private ensureLogsDirectory(): void {
    if (!fs.existsSync(this.logsDirectory)) {
      fs.mkdirSync(this.logsDirectory, { recursive: true });
    }
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` | Data: ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] ${message}${dataStr}`;
  }

  private writeToFile(logMessage: string): void {
    if (!this.saveToFile) return;
    
    const today = new Date().toISOString().split('T')[0];
    const logFile = path.join(this.logsDirectory, `bot-${today}.log`);
    
    fs.appendFileSync(logFile, logMessage + '\n');
  }

  private log(level: LogLevel, levelName: string, message: string, data?: any): void {
    if (level < this.logLevel) return;
    
    const formattedMessage = this.formatMessage(levelName, message, data);
    
    // Console output com cores
    switch (level) {
      case LogLevel.DEBUG:
        console.log(`\x1b[36m${formattedMessage}\x1b[0m`); // Cyan
        break;
      case LogLevel.INFO:
        console.log(`\x1b[32m${formattedMessage}\x1b[0m`); // Green
        break;
      case LogLevel.WARN:
        console.log(`\x1b[33m${formattedMessage}\x1b[0m`); // Yellow
        break;
      case LogLevel.ERROR:
        console.log(`\x1b[31m${formattedMessage}\x1b[0m`); // Red
        break;
    }
    
    this.writeToFile(formattedMessage);
  }

  debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, data);
  }

  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, 'INFO', message, data);
  }

  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, 'WARN', message, data);
  }

  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, 'ERROR', message, data);
  }

  // Métodos específicos para o bot
  messageReceived(from: string, message: string): void {
    this.info(`Mensagem recebida de ${from}`, { message });
  }

  messageSent(to: string, message: string): void {
    this.info(`Mensagem enviada para ${to}`, { message });
  }

  commandExecuted(command: string, from: string, success: boolean): void {
    const level = success ? 'info' : 'warn';
    this[level](`Comando ${command} executado por ${from}`, { success });
  }

  aiResponse(provider: string, responseTime: number, tokenCount?: number): void {
    this.info(`Resposta da IA (${provider})`, { responseTime, tokenCount });
  }

  connectionStatus(status: string): void {
    this.info(`Status da conexão: ${status}`);
  }
}

export const logger = new Logger();