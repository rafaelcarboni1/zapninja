/**
 * @file: environment.ts
 * @responsibility: Environment configuration management for Railway deployment
 * @exports: EnvironmentConfig, getConfig, validateEnvironment
 * @imports: dotenv
 * @layer: config
 */

import dotenv from 'dotenv'
import { logger } from '../utils/logger'

// Load environment variables
dotenv.config()

export interface DatabaseConfig {
  url: string
  ssl: boolean
  maxConnections: number
  idleTimeout: number
  connectionTimeout: number
}

export interface RedisConfig {
  url: string
  retryDelayOnFailover: number
  maxRetriesPerRequest: number
}

export interface AIConfig {
  selected: 'GPT' | 'GEMINI' | 'AGNO'
  openai: {
    apiKey: string
    assistantId?: string
    model: string
    temperature: number
    maxTokens: number
  }
  gemini: {
    apiKey: string
    model: string
    temperature: number
    maxTokens: number
  }
  agno: {
    apiKey: string
    baseUrl: string
    maxAgents: number
  }
}

export interface ServerConfig {
  nodeEnv: 'development' | 'production' | 'test'
  port: number
  wsPort: number
  sessionName: string
  forceConnect: boolean
}

export interface BotConfig {
  active: boolean
  adminNumbers: string[]
  defaultAI: 'GPT' | 'GEMINI' | 'AGNO'
  timing: {
    minReadingTime: number
    readingTimePerChar: number
    minThinkingTime: number
    maxThinkingTime: number
    longBreakChance: number
    longBreakMinTime: number
    longBreakMaxTime: number
  }
  commands: {
    pause: string
    resume: string
    status: string
    help: string
  }
}

export interface RailwayConfig {
  staticUrl: string
  publicDomain: string
  environment: string
  projectId?: string
  serviceId?: string
}

export interface EnvironmentConfig {
  server: ServerConfig
  database: DatabaseConfig
  redis: RedisConfig
  ai: AIConfig
  bot: BotConfig
  railway: RailwayConfig
}

class ConfigManager {
  private config: EnvironmentConfig
  private isValidated = false

  constructor() {
    this.config = this.loadConfiguration()
  }

  private loadConfiguration(): EnvironmentConfig {
    return {
      server: {
        nodeEnv: (process.env.NODE_ENV as any) || 'development',
        port: parseInt(process.env.PORT || '3000'),
        wsPort: parseInt(process.env.WS_PORT || '3001'),
        sessionName: process.env.SESSION_NAME || 'sessionName',
        forceConnect: process.env.FORCE_CONNECT === 'true'
      },

      database: {
        url: process.env.DATABASE_URL || '',
        ssl: process.env.NODE_ENV === 'production',
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
        idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
        connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000')
      },

      redis: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        retryDelayOnFailover: parseInt(process.env.REDIS_RETRY_DELAY || '100'),
        maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3')
      },

      ai: {
        selected: (process.env.AI_SELECTED as any) || 'GEMINI',
        openai: {
          apiKey: process.env.OPENAI_API_KEY || '',
          assistantId: process.env.OPENAI_ASSISTANT,
          model: process.env.OPENAI_MODEL || 'gpt-4',
          temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
          maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000')
        },
        gemini: {
          apiKey: process.env.GEMINI_API_KEY || '',
          model: process.env.GEMINI_MODEL || 'gemini-pro',
          temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
          maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '2000')
        },
        agno: {
          apiKey: process.env.AGNO_API_KEY || '',
          baseUrl: process.env.AGNO_BASE_URL || 'https://api.agno.ai',
          maxAgents: parseInt(process.env.AGNO_MAX_AGENTS || '5')
        }
      },

      bot: {
        active: process.env.BOT_ACTIVE === 'true',
        adminNumbers: (process.env.ADMIN_NUMBERS || '').split(',').filter(n => n.trim()),
        defaultAI: (process.env.AI_SELECTED as any) || 'GEMINI',
        timing: {
          minReadingTime: parseInt(process.env.MIN_READING_TIME || '2000'),
          readingTimePerChar: parseInt(process.env.READING_TIME_PER_CHAR || '50'),
          minThinkingTime: parseInt(process.env.MIN_THINKING_TIME || '1000'),
          maxThinkingTime: parseInt(process.env.MAX_THINKING_TIME || '5000'),
          longBreakChance: parseFloat(process.env.LONG_BREAK_CHANCE || '0.05'),
          longBreakMinTime: parseInt(process.env.LONG_BREAK_MIN_TIME || '5000'),
          longBreakMaxTime: parseInt(process.env.LONG_BREAK_MAX_TIME || '15000')
        },
        commands: {
          pause: process.env.PAUSE_COMMAND || '!pausar',
          resume: process.env.RESUME_COMMAND || '!retomar',
          status: process.env.STATUS_COMMAND || '!status',
          help: process.env.HELP_COMMAND || '!ajuda'
        }
      },

      railway: {
        staticUrl: process.env.RAILWAY_STATIC_URL || '',
        publicDomain: process.env.RAILWAY_PUBLIC_DOMAIN || '',
        environment: process.env.RAILWAY_ENVIRONMENT || 'production',
        projectId: process.env.RAILWAY_PROJECT_ID,
        serviceId: process.env.RAILWAY_SERVICE_ID
      }
    }
  }

  validateEnvironment(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Required environment variables
    const required = [
      { key: 'DATABASE_URL', value: this.config.database.url },
      { key: 'REDIS_URL', value: this.config.redis.url }
    ]

    // AI API keys validation (at least one required)
    const hasOpenAI = Boolean(this.config.ai.openai.apiKey)
    const hasGemini = Boolean(this.config.ai.gemini.apiKey)
    const hasAgno = Boolean(this.config.ai.agno.apiKey)

    if (!hasOpenAI && !hasGemini && !hasAgno) {
      errors.push('At least one AI API key is required (OPENAI_API_KEY, GEMINI_API_KEY, or AGNO_API_KEY)')
    }

    // Check required variables
    for (const { key, value } of required) {
      if (!value) {
        errors.push(`Missing required environment variable: ${key}`)
      }
    }

    // Validate port numbers
    if (this.config.server.port < 1 || this.config.server.port > 65535) {
      errors.push('PORT must be between 1 and 65535')
    }

    if (this.config.server.wsPort < 1 || this.config.server.wsPort > 65535) {
      errors.push('WS_PORT must be between 1 and 65535')
    }

    // Validate AI configuration based on selected AI
    switch (this.config.ai.selected) {
      case 'GPT':
        if (!hasOpenAI) {
          errors.push('OPENAI_API_KEY is required when AI_SELECTED is GPT')
        }
        break
      case 'GEMINI':
        if (!hasGemini) {
          errors.push('GEMINI_API_KEY is required when AI_SELECTED is GEMINI')
        }
        break
      case 'AGNO':
        if (!hasAgno) {
          errors.push('AGNO_API_KEY is required when AI_SELECTED is AGNO')
        }
        break
    }

    // Validate admin numbers format
    const phoneRegex = /^[0-9+\-\s\(\)]{10,20}$/
    for (const number of this.config.bot.adminNumbers) {
      if (number && !phoneRegex.test(number)) {
        errors.push(`Invalid admin phone number format: ${number}`)
      }
    }

    this.isValidated = errors.length === 0

    if (!this.isValidated) {
      logger.error('Environment validation failed', { errors })
    } else {
      logger.info('Environment validation passed')
    }

    return {
      isValid: this.isValidated,
      errors
    }
  }

  getConfig(): EnvironmentConfig {
    if (!this.isValidated) {
      const validation = this.validateEnvironment()
      if (!validation.isValid) {
        throw new Error(`Environment validation failed: ${validation.errors.join(', ')}`)
      }
    }
    return this.config
  }

  isDevelopment(): boolean {
    return this.config.server.nodeEnv === 'development'
  }

  isProduction(): boolean {
    return this.config.server.nodeEnv === 'production'
  }

  isTest(): boolean {
    return this.config.server.nodeEnv === 'test'
  }

  // Hot reload configuration (for development)
  reloadConfig(): void {
    dotenv.config({ override: true })
    this.config = this.loadConfiguration()
    this.isValidated = false
    logger.info('Configuration reloaded')
  }

  // Get specific config sections
  getDatabaseConfig(): DatabaseConfig {
    return this.getConfig().database
  }

  getRedisConfig(): RedisConfig {
    return this.getConfig().redis
  }

  getAIConfig(): AIConfig {
    return this.getConfig().ai
  }

  getBotConfig(): BotConfig {
    return this.getConfig().bot
  }

  getRailwayConfig(): RailwayConfig {
    return this.getConfig().railway
  }

  getServerConfig(): ServerConfig {
    return this.getConfig().server
  }
}

// Singleton instance
export const configManager = new ConfigManager()

// Convenience exports
export const getConfig = (): EnvironmentConfig => configManager.getConfig()
export const validateEnvironment = () => configManager.validateEnvironment()
export const isDevelopment = () => configManager.isDevelopment()
export const isProduction = () => configManager.isProduction()
export const isTest = () => configManager.isTest()

// Auto-validate on import
const validation = validateEnvironment()
if (!validation.isValid) {
  logger.warn('Environment validation issues detected:', validation.errors)
  
  if (isProduction()) {
    // In production, fail fast
    throw new Error(`Production environment validation failed: ${validation.errors.join(', ')}`)
  }
}