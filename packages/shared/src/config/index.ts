/**
 * @file: config/index.ts
 * @responsibility: Configuration helpers and environment management
 * @exports: config loaders, validators, defaults
 * @imports: constants, types
 * @layer: config
 */

import type { AIConfig, TimingConfig } from '../types/index.js';
import { AI, TIMING, SYSTEM } from '../constants/index.js';

// Environment Configuration
export interface EnvConfig {
  // System
  NODE_ENV: string;
  PORT: number;
  SESSION_NAME: string;
  
  // Database
  DATABASE_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  REDIS_URL?: string;
  
  // AI Services
  AI_SELECTED: 'OPENAI' | 'GEMINI' | 'AGNO';
  OPENAI_KEY?: string;
  OPENAI_ASSISTANT?: string;
  GEMINI_KEY?: string;
  AGNO_API_KEY?: string;
  
  // Bot Control
  BOT_ACTIVE: boolean;
  ADMIN_NUMBERS: string[];
  FORCE_CONNECT: boolean;
  
  // Timing Defaults
  MIN_READING_TIME: number;
  READING_TIME_PER_CHAR: number;
  MIN_THINKING_TIME: number;
  MAX_THINKING_TIME: number;
  
  // WebSocket
  WS_PORT?: number;
  ENABLE_WEBSOCKETS: boolean;
  
  // Railway (if applicable)
  RAILWAY_STATIC_URL?: string;
}

// Configuration Manager
export class ConfigManager {
  private static instance: ConfigManager;
  private config: EnvConfig;

  private constructor() {
    this.config = this.loadEnvironmentConfig();
    this.validateConfig();
  }

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadEnvironmentConfig(): EnvConfig {
    return {
      // System
      NODE_ENV: process.env.NODE_ENV || 'development',
      PORT: parseInt(process.env.PORT || '3000', 10),
      SESSION_NAME: process.env.SESSION_NAME || 'default',
      
      // Database
      DATABASE_URL: process.env.DATABASE_URL,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      REDIS_URL: process.env.REDIS_URL,
      
      // AI Services
      AI_SELECTED: (process.env.AI_SELECTED as 'OPENAI' | 'GEMINI' | 'AGNO') || 'GEMINI',
      OPENAI_KEY: process.env.OPENAI_KEY,
      OPENAI_ASSISTANT: process.env.OPENAI_ASSISTANT,
      GEMINI_KEY: process.env.GEMINI_KEY,
      AGNO_API_KEY: process.env.AGNO_API_KEY,
      
      // Bot Control
      BOT_ACTIVE: process.env.BOT_ACTIVE !== 'false',
      ADMIN_NUMBERS: process.env.ADMIN_NUMBERS?.split(',').map(n => n.trim()) || [],
      FORCE_CONNECT: process.env.FORCE_CONNECT === 'true',
      
      // Timing Defaults
      MIN_READING_TIME: parseInt(process.env.MIN_READING_TIME || '2000', 10),
      READING_TIME_PER_CHAR: parseInt(process.env.READING_TIME_PER_CHAR || '50', 10),
      MIN_THINKING_TIME: parseInt(process.env.MIN_THINKING_TIME || '1000', 10),
      MAX_THINKING_TIME: parseInt(process.env.MAX_THINKING_TIME || '5000', 10),
      
      // WebSocket
      WS_PORT: process.env.WS_PORT ? parseInt(process.env.WS_PORT, 10) : undefined,
      ENABLE_WEBSOCKETS: process.env.ENABLE_WEBSOCKETS !== 'false',
      
      // Railway
      RAILWAY_STATIC_URL: process.env.RAILWAY_STATIC_URL,
    };
  }

  private validateConfig(): void {
    const required = [
      'NODE_ENV',
      'PORT',
      'SESSION_NAME',
    ];

    for (const key of required) {
      if (!this.config[key as keyof EnvConfig]) {
        throw new Error(`Required environment variable ${key} is not set`);
      }
    }

    // Validate AI configuration
    if (this.config.AI_SELECTED === 'OPENAI' && !this.config.OPENAI_KEY) {
      throw new Error('OPENAI_KEY is required when AI_SELECTED is OPENAI');
    }

    if (this.config.AI_SELECTED === 'GEMINI' && !this.config.GEMINI_KEY) {
      throw new Error('GEMINI_KEY is required when AI_SELECTED is GEMINI');
    }

    if (this.config.AI_SELECTED === 'AGNO' && !this.config.AGNO_API_KEY) {
      throw new Error('AGNO_API_KEY is required when AI_SELECTED is AGNO');
    }

    // Validate database configuration
    if (!this.config.DATABASE_URL && !this.config.SUPABASE_URL) {
      throw new Error('Either DATABASE_URL or SUPABASE_URL must be set');
    }
  }

  // Getters for configuration values
  get(key: keyof EnvConfig): any {
    return this.config[key];
  }

  getAll(): EnvConfig {
    return { ...this.config };
  }

  // Specialized getters
  isDevelopment(): boolean {
    return this.config.NODE_ENV === 'development';
  }

  isProduction(): boolean {
    return this.config.NODE_ENV === 'production';
  }

  isTest(): boolean {
    return this.config.NODE_ENV === 'test';
  }

  getPort(): number {
    return this.config.PORT;
  }

  getSessionName(): string {
    return this.config.SESSION_NAME;
  }

  getAdminNumbers(): string[] {
    return this.config.ADMIN_NUMBERS;
  }

  isAdmin(phoneNumber: string): boolean {
    const normalized = phoneNumber.replace(/\D/g, '');
    return this.config.ADMIN_NUMBERS.some(admin => 
      admin.replace(/\D/g, '') === normalized
    );
  }

  getAIConfig(): { selected: string; hasKey: boolean } {
    return {
      selected: this.config.AI_SELECTED,
      hasKey: this.hasAIKey(),
    };
  }

  private hasAIKey(): boolean {
    switch (this.config.AI_SELECTED) {
      case 'OPENAI':
        return !!this.config.OPENAI_KEY;
      case 'GEMINI':
        return !!this.config.GEMINI_KEY;
      case 'AGNO':
        return !!this.config.AGNO_API_KEY;
      default:
        return false;
    }
  }
}

// Default Configuration Presets
export class ConfigPresets {
  /**
   * Default AI configuration
   */
  static getDefaultAIConfig(): AIConfig {
    return {
      model: AI.MODELS.GEMINI_PRO as any,
      temperature: AI.DEFAULT_TEMPERATURE,
      max_tokens: AI.DEFAULT_MAX_TOKENS,
      system_prompt: 'Você é um assistente virtual inteligente e amigável.',
      enable_functions: true,
      enable_vision: false,
    };
  }

  /**
   * Default timing configuration
   */
  static getDefaultTimingConfig(): TimingConfig {
    return {
      response_time: TIMING.DEFAULT_RESPONSE_TIME,
      message_delay: TIMING.DEFAULT_MESSAGE_DELAY,
      rest_period: TIMING.DEFAULT_REST_PERIOD,
      working_hours: {
        start: '08:00',
        end: '22:00',
      },
      message_limit_per_hour: TIMING.DEFAULT_MESSAGE_LIMIT,
      typing_simulation: true,
      long_break_chance: 0.05,
      long_break_min_time: 5000,
      long_break_max_time: 15000,
    };
  }

  /**
   * Business hours timing configuration
   */
  static getBusinessTimingConfig(): TimingConfig {
    return {
      ...this.getDefaultTimingConfig(),
      response_time: 2000,
      message_delay: 1500,
      working_hours: {
        start: '08:00',
        end: '18:00',
      },
      message_limit_per_hour: 30,
      rest_period: 0,
    };
  }

  /**
   * Casual conversation timing configuration
   */
  static getCasualTimingConfig(): TimingConfig {
    return {
      ...this.getDefaultTimingConfig(),
      response_time: 4000,
      message_delay: 2000,
      working_hours: {
        start: '00:00',
        end: '23:59',
      },
      message_limit_per_hour: 60,
      rest_period: 10000,
      long_break_chance: 0.1,
    };
  }

  /**
   * Fast response timing configuration
   */
  static getFastTimingConfig(): TimingConfig {
    return {
      ...this.getDefaultTimingConfig(),
      response_time: 1000,
      message_delay: 500,
      working_hours: {
        start: '00:00',
        end: '23:59',
      },
      message_limit_per_hour: 100,
      rest_period: 0,
      typing_simulation: false,
      long_break_chance: 0,
    };
  }
}

// Configuration Validator
export class ConfigValidator {
  /**
   * Validates environment configuration
   */
  static validateEnvConfig(config: Partial<EnvConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Port validation
    if (config.PORT && (config.PORT < 1 || config.PORT > 65535)) {
      errors.push('PORT must be between 1 and 65535');
    }

    // Session name validation
    if (config.SESSION_NAME && config.SESSION_NAME.length === 0) {
      errors.push('SESSION_NAME cannot be empty');
    }

    // AI selection validation
    if (config.AI_SELECTED && !['OPENAI', 'GEMINI', 'AGNO'].includes(config.AI_SELECTED)) {
      errors.push('AI_SELECTED must be one of: OPENAI, GEMINI, AGNO');
    }

    // Timing validation
    if (config.MIN_READING_TIME && config.MIN_READING_TIME < 0) {
      errors.push('MIN_READING_TIME must be positive');
    }

    if (config.READING_TIME_PER_CHAR && config.READING_TIME_PER_CHAR < 0) {
      errors.push('READING_TIME_PER_CHAR must be positive');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates AI configuration
   */
  static validateAIConfig(config: Partial<AIConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.temperature !== undefined) {
      if (config.temperature < AI.MIN_TEMPERATURE || config.temperature > AI.MAX_TEMPERATURE) {
        errors.push(`Temperature must be between ${AI.MIN_TEMPERATURE} and ${AI.MAX_TEMPERATURE}`);
      }
    }

    if (config.max_tokens !== undefined) {
      if (config.max_tokens < AI.MIN_MAX_TOKENS || config.max_tokens > AI.MAX_MAX_TOKENS) {
        errors.push(`Max tokens must be between ${AI.MIN_MAX_TOKENS} and ${AI.MAX_MAX_TOKENS}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Singleton config instance
export const config = ConfigManager.getInstance();

// Export configuration helpers
export {
  ConfigManager,
  ConfigPresets,
  ConfigValidator,
};