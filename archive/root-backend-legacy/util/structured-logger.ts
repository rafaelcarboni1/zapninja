/**
 * Logger Estruturado para WhatsApp Multi-Session
 * Sistema de logging avançado com suporte a contexto e métricas
 */

import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { performance } from 'perf_hooks';

// Tipos para o sistema de logging
interface LogContext {
  sessionId?: string;
  userId?: string;
  requestId?: string;
  instanceId?: string;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  context?: LogContext;
  meta?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  performance?: {
    duration?: number;
    memoryUsage?: NodeJS.MemoryUsage;
    cpuUsage?: NodeJS.CpuUsage;
  };
}

type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

interface LoggerConfig {
  service: string;
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableJSON: boolean;
  enablePerformance: boolean;
}

/**
 * Classe principal do Logger Estruturado
 */
export class StructuredLogger {
  private config: LoggerConfig;
  private context: LogContext;
  private fileStreams: Map<string, NodeJS.WritableStream> = new Map();
  private performanceMarks: Map<string, number> = new Map();
  
  // Níveis de log em ordem de prioridade
  private static readonly LOG_LEVELS: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6
  };
  
  // Cores para console
  private static readonly COLORS = {
    error: '\x1b[31m',   // Vermelho
    warn: '\x1b[33m',    // Amarelo
    info: '\x1b[36m',    // Ciano
    http: '\x1b[35m',    // Magenta
    verbose: '\x1b[37m', // Branco
    debug: '\x1b[32m',   // Verde
    silly: '\x1b[90m',   // Cinza
    reset: '\x1b[0m'     // Reset
  };

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      service: 'app',
      level: (process.env.LOG_LEVEL as LogLevel) || 'info',
      enableConsole: process.env.NODE_ENV !== 'production',
      enableFile: true,
      enableJSON: true,
      enablePerformance: true,
      ...config
    };
    
    this.context = {
      instanceId: process.env.INSTANCE_ID || process.pid.toString()
    };
    
    this.initializeFileStreams();
  }

  /**
   * Inicializar streams de arquivo
   */
  private initializeFileStreams(): void {
    if (!this.config.enableFile) return;
    
    const logsDir = join(process.cwd(), 'logs');
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }
    
    // Stream para logs combinados
    const combinedPath = join(logsDir, `${this.config.service}-combined.log`);
    this.fileStreams.set('combined', createWriteStream(combinedPath, { flags: 'a' }));
    
    // Stream para erros
    const errorPath = join(logsDir, `${this.config.service}-error.log`);
    this.fileStreams.set('error', createWriteStream(errorPath, { flags: 'a' }));
    
    // Stream para performance
    if (this.config.enablePerformance) {
      const perfPath = join(logsDir, `${this.config.service}-performance.log`);
      this.fileStreams.set('performance', createWriteStream(perfPath, { flags: 'a' }));
    }
  }

  /**
   * Definir contexto global para o logger
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Criar um logger filho com contexto adicional
   */
  child(context: LogContext): StructuredLogger {
    const childLogger = new StructuredLogger(this.config);
    childLogger.context = { ...this.context, ...context };
    childLogger.fileStreams = this.fileStreams;
    return childLogger;
  }

  /**
   * Verificar se o nível de log deve ser processado
   */
  private shouldLog(level: LogLevel): boolean {
    return StructuredLogger.LOG_LEVELS[level] <= StructuredLogger.LOG_LEVELS[this.config.level];
  }

  /**
   * Formatar entrada de log
   */
  private formatLogEntry(level: LogLevel, message: string, meta?: Record<string, any>, error?: Error): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.config.service,
      message,
      context: this.context
    };

    if (meta) {
      entry.meta = meta;
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    // Adicionar métricas de performance se habilitado
    if (this.config.enablePerformance) {
      entry.performance = {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      };
    }

    return entry;
  }

  /**
   * Formatar para console com cores
   */
  private formatForConsole(entry: LogEntry): string {
    const color = StructuredLogger.COLORS[entry.level] || StructuredLogger.COLORS.info;
    const level = entry.level.toUpperCase().padEnd(7);
    const service = entry.service.padEnd(12);
    
    let output = `${color}[${entry.timestamp}] ${level} [${service}]${StructuredLogger.COLORS.reset} ${entry.message}`;
    
    if (entry.context?.sessionId) {
      output += ` [Session: ${entry.context.sessionId}]`;
    }
    
    if (entry.meta) {
      output += ` ${JSON.stringify(entry.meta)}`;
    }
    
    if (entry.error) {
      output += `\n${StructuredLogger.COLORS.error}Error: ${entry.error.message}${StructuredLogger.COLORS.reset}`;
      if (entry.error.stack) {
        output += `\n${entry.error.stack}`;
      }
    }
    
    return output;
  }

  /**
   * Escrever log
   */
  private writeLog(entry: LogEntry): void {
    // Console output
    if (this.config.enableConsole) {
      console.log(this.formatForConsole(entry));
    }
    
    // File output
    if (this.config.enableFile) {
      const jsonEntry = JSON.stringify(entry) + '\n';
      
      // Log combinado
      const combinedStream = this.fileStreams.get('combined');
      if (combinedStream) {
        combinedStream.write(jsonEntry);
      }
      
      // Log de erro
      if (entry.level === 'error') {
        const errorStream = this.fileStreams.get('error');
        if (errorStream) {
          errorStream.write(jsonEntry);
        }
      }
      
      // Log de performance
      if (entry.level === 'http' && this.config.enablePerformance) {
        const perfStream = this.fileStreams.get('performance');
        if (perfStream) {
          perfStream.write(jsonEntry);
        }
      }
    }
  }

  /**
   * Métodos de logging por nível
   */
  error(message: string, meta?: Record<string, any>, error?: Error): void {
    if (!this.shouldLog('error')) return;
    const entry = this.formatLogEntry('error', message, meta, error);
    this.writeLog(entry);
  }

  warn(message: string, meta?: Record<string, any>): void {
    if (!this.shouldLog('warn')) return;
    const entry = this.formatLogEntry('warn', message, meta);
    this.writeLog(entry);
  }

  info(message: string, meta?: Record<string, any>): void {
    if (!this.shouldLog('info')) return;
    const entry = this.formatLogEntry('info', message, meta);
    this.writeLog(entry);
  }

  http(message: string, meta?: Record<string, any>): void {
    if (!this.shouldLog('http')) return;
    const entry = this.formatLogEntry('http', message, meta);
    this.writeLog(entry);
  }

  verbose(message: string, meta?: Record<string, any>): void {
    if (!this.shouldLog('verbose')) return;
    const entry = this.formatLogEntry('verbose', message, meta);
    this.writeLog(entry);
  }

  debug(message: string, meta?: Record<string, any>): void {
    if (!this.shouldLog('debug')) return;
    const entry = this.formatLogEntry('debug', message, meta);
    this.writeLog(entry);
  }

  silly(message: string, meta?: Record<string, any>): void {
    if (!this.shouldLog('silly')) return;
    const entry = this.formatLogEntry('silly', message, meta);
    this.writeLog(entry);
  }

  /**
   * Métodos de performance
   */
  startTimer(label: string): void {
    this.performanceMarks.set(label, performance.now());
  }

  endTimer(label: string, message?: string): number {
    const start = this.performanceMarks.get(label);
    if (!start) {
      this.warn(`Timer '${label}' not found`);
      return 0;
    }
    
    const duration = performance.now() - start;
    this.performanceMarks.delete(label);
    
    if (message) {
      this.http(message || `Timer '${label}' completed`, { 
        timer: label, 
        duration: `${duration.toFixed(2)}ms` 
      });
    }
    
    return duration;
  }

  /**
   * Log de requisição HTTP
   */
  logRequest(method: string, url: string, statusCode: number, duration: number, meta?: Record<string, any>): void {
    const level = statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warn' : 'http';
    
    this[level](`${method} ${url} ${statusCode}`, {
      method,
      url,
      statusCode,
      duration: `${duration.toFixed(2)}ms`,
      ...meta
    });
  }

  /**
   * Log de métricas do sistema
   */
  logMetrics(): void {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    this.info('System metrics', {
      memory: {
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        external: `${(memUsage.external / 1024 / 1024).toFixed(2)}MB`
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: process.uptime()
    });
  }

  /**
   * Fechar streams de arquivo
   */
  close(): void {
    this.fileStreams.forEach(stream => {
      if (stream && typeof stream.end === 'function') {
        stream.end();
      }
    });
    this.fileStreams.clear();
  }
}

/**
 * Factory para criar loggers específicos por serviço
 */
export class LoggerFactory {
  private static loggers: Map<string, StructuredLogger> = new Map();

  static getLogger(service: string, config?: Partial<LoggerConfig>): StructuredLogger {
    if (!this.loggers.has(service)) {
      this.loggers.set(service, new StructuredLogger({ service, ...config }));
    }
    return this.loggers.get(service)!;
  }

  static closeAll(): void {
    this.loggers.forEach(logger => logger.close());
    this.loggers.clear();
  }
}

// Exportar instâncias padrão
export const masterLogger = LoggerFactory.getLogger('master');
export const orchestratorLogger = LoggerFactory.getLogger('orchestrator', { enableConsole: false });
export const sessionLogger = LoggerFactory.getLogger('session', { enableConsole: false });
export const whatsappLogger = LoggerFactory.getLogger('whatsapp', { level: 'warn', enableConsole: false });
export const aiLogger = LoggerFactory.getLogger('ai', { enableConsole: false });
export const databaseLogger = LoggerFactory.getLogger('database', { level: 'warn', enableConsole: false });

// Middleware para Express
export function createLoggerMiddleware(logger: StructuredLogger) {
  return (req: any, res: any, next: any) => {
    const start = performance.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Adicionar logger ao request
    req.logger = logger.child({ requestId });
    
    // Log da requisição
    req.logger.http(`Incoming request`, {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    // Interceptar resposta
    const originalSend = res.send;
    res.send = function(data: any) {
      const duration = performance.now() - start;
      req.logger.logRequest(req.method, req.url, res.statusCode, duration);
      return originalSend.call(this, data);
    };
    
    next();
  };
}

export default StructuredLogger;