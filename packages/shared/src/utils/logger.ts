/**
 * @file: logger.ts
 * @responsibility: Centralized logging utility for ZAPNINJA
 * @exports: logger, LogLevel, LogEntry
 * @imports: winston
 * @layer: utils
 */

import winston, { format, transports } from 'winston'
import path from 'path'

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn', 
  INFO = 'info',
  DEBUG = 'debug'
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  metadata?: Record<string, any>
  sessionName?: string
  userId?: string
  module?: string
}

class Logger {
  private winston: winston.Logger
  private isProduction = process.env.NODE_ENV === 'production'

  constructor() {
    this.winston = winston.createLogger({
      level: this.isProduction ? 'info' : 'debug',
      format: format.combine(
        format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss.SSS'
        }),
        format.errors({ stack: true }),
        format.json()
      ),
      defaultMeta: {
        service: 'zapninja',
        version: process.env.npm_package_version || '1.0.0'
      },
      transports: this.createTransports()
    })
  }

  private createTransports(): winston.transport[] {
    const logTransports: winston.transport[] = []

    // Console transport with colors for development
    logTransports.push(
      new transports.Console({
        format: format.combine(
          format.colorize(),
          format.simple(),
          format.printf(({ timestamp, level, message, ...metadata }) => {
            let metaStr = ''
            if (Object.keys(metadata).length > 0) {
              metaStr = ` ${JSON.stringify(metadata)}`
            }
            return `${timestamp} [${level}]: ${message}${metaStr}`
          })
        )
      })
    )

    // File transports for production
    if (this.isProduction) {
      const logsDir = path.resolve(process.cwd(), 'logs')
      
      // Combined log file
      logTransports.push(
        new transports.File({
          filename: path.join(logsDir, 'combined.log'),
          format: format.combine(
            format.timestamp(),
            format.json()
          )
        })
      )

      // Error log file
      logTransports.push(
        new transports.File({
          filename: path.join(logsDir, 'error.log'),
          level: 'error',
          format: format.combine(
            format.timestamp(),
            format.json()
          )
        })
      )

      // Daily rotating file
      logTransports.push(
        new winston.transports.DailyRotateFile({
          filename: path.join(logsDir, 'zapninja-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d'
        })
      )
    }

    return logTransports
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.winston.info(message, metadata)
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.winston.warn(message, metadata)
  }

  error(message: string, error?: Error | Record<string, any>): void {
    if (error instanceof Error) {
      this.winston.error(message, {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      })
    } else {
      this.winston.error(message, error)
    }
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.winston.debug(message, metadata)
  }

  // Specific loggers for ZAPNINJA components
  messageReceived(userId: string, content: string, sessionName?: string): void {
    this.info('Message received', {
      userId: userId.substring(0, 8) + '...',
      contentLength: content.length,
      sessionName,
      type: 'message_received'
    })
  }

  messageSent(userId: string, content: string, sessionName?: string): void {
    this.info('Message sent', {
      userId: userId.substring(0, 8) + '...',
      contentLength: content.length,
      sessionName,
      type: 'message_sent'
    })
  }

  commandExecuted(command: string, userId: string, success: boolean, sessionName?: string): void {
    this.info('Admin command executed', {
      command,
      userId: userId.substring(0, 8) + '...',
      success,
      sessionName,
      type: 'admin_command'
    })
  }

  aiResponse(model: string, responseTime: number, tokenCount?: number): void {
    this.info('AI response generated', {
      model,
      responseTime,
      tokenCount,
      type: 'ai_response'
    })
  }

  connectionStatus(status: 'connected' | 'disconnected', sessionName?: string): void {
    this.info('Connection status changed', {
      status,
      sessionName,
      type: 'connection_status'
    })
  }

  databaseOperation(operation: string, duration: number, affected?: number): void {
    this.debug('Database operation', {
      operation,
      duration,
      affected,
      type: 'database_operation'
    })
  }

  securityEvent(event: string, userId?: string, details?: Record<string, any>): void {
    this.warn('Security event', {
      event,
      userId: userId ? userId.substring(0, 8) + '...' : undefined,
      ...details,
      type: 'security_event'
    })
  }

  performanceMetric(metric: string, value: number, unit: string): void {
    this.debug('Performance metric', {
      metric,
      value,
      unit,
      type: 'performance_metric'
    })
  }

  // System health logging
  healthCheck(component: string, status: 'healthy' | 'unhealthy', details?: Record<string, any>): void {
    const level = status === 'healthy' ? 'info' : 'error'
    this.winston.log(level, 'Health check', {
      component,
      status,
      ...details,
      type: 'health_check'
    })
  }

  // Create child logger with context
  child(context: Record<string, any>): winston.Logger {
    return this.winston.child(context)
  }
}

// Singleton instance
export const logger = new Logger()

// Helper function for structured logging
export function createLogEntry(
  level: LogLevel,
  message: string,
  metadata?: Record<string, any>
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    metadata
  }
}