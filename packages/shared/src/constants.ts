// System constants and configuration

export const SESSION_STATUS = {
  INITIALIZING: 'initializing' as const,
  WAITING_QR: 'waiting_qr' as const,
  READY: 'ready' as const,
  DISCONNECTED: 'disconnected' as const,
  ERROR: 'error' as const,
  CLOSING: 'closing' as const
}

export const MESSAGE_TYPE = {
  TEXT: 'text' as const,
  IMAGE: 'image' as const,
  AUDIO: 'audio' as const,
  VIDEO: 'video' as const,
  DOCUMENT: 'document' as const,
  STICKER: 'sticker' as const,
  LOCATION: 'location' as const,
  CONTACT: 'contact' as const
}

export const COMMAND_STATUS = {
  PENDING: 'pending' as const,
  EXECUTING: 'executing' as const,
  COMPLETED: 'completed' as const,
  FAILED: 'failed' as const,
  CANCELLED: 'cancelled' as const
}

export const CONTEXT_TYPE = {
  GENERAL: 'general' as const,
  PREFERENCE: 'preference' as const,
  MEMORY: 'memory' as const,
  COMMAND: 'command' as const,
  CONVERSATION: 'conversation' as const
}

export const AI_MODELS = {
  GPT4: 'gpt-4' as const,
  GPT4_TURBO: 'gpt-4-turbo' as const,
  GEMINI_PRO: 'gemini-pro' as const,
  GEMINI_PRO_VISION: 'gemini-pro-vision' as const
}

export const ADMIN_COMMANDS = {
  STATUS: '/status',
  SESSIONS: '/sessions',
  USERS: '/users',
  METRICS: '/metrics',
  RESTART: '/restart',
  SHUTDOWN: '/shutdown',
  BACKUP: '/backup',
  LOGS: '/logs',
  AI_CONFIG: '/ai',
  PROMPTS: '/prompts',
  CONTEXT: '/context',
  BLOCK: '/block',
  UNBLOCK: '/unblock',
  BROADCAST: '/broadcast',
  EXPORT: '/export',
  IMPORT: '/import',
  HELP: '/help'
} as const

export const DEFAULT_SETTINGS = {
  // Timing settings
  MESSAGE_DELAY_MIN: 1000,
  MESSAGE_DELAY_MAX: 3000,
  TYPING_DELAY_MIN: 500,
  TYPING_DELAY_MAX: 2000,
  
  // Context settings
  CONTEXT_RELEVANCE_THRESHOLD: 0.5,
  MAX_CONTEXT_ITEMS: 50,
  CONTEXT_CLEANUP_DAYS: 30,
  
  // AI settings
  MAX_TOKENS: 4096,
  TEMPERATURE: 0.7,
  FALLBACK_ENABLED: true,
  
  // System settings
  MAX_SESSIONS: 10,
  HEALTH_CHECK_INTERVAL: 30000,
  METRICS_RETENTION_DAYS: 30,
  LOG_RETENTION_DAYS: 7,
  
  // Database settings
  CONNECTION_POOL_MIN: 5,
  CONNECTION_POOL_MAX: 20,
  QUERY_TIMEOUT: 30000,
  
  // API settings
  API_RATE_LIMIT: 100,
  API_TIMEOUT: 30000,
  MAX_PAYLOAD_SIZE: '10mb'
}

export const ERROR_CODES = {
  // System errors
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  CONFIG_ERROR: 'CONFIG_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  
  // Session errors
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  SESSION_ALREADY_EXISTS: 'SESSION_ALREADY_EXISTS',
  SESSION_INITIALIZATION_FAILED: 'SESSION_INITIALIZATION_FAILED',
  SESSION_CONNECTION_FAILED: 'SESSION_CONNECTION_FAILED',
  
  // User errors
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_BLOCKED: 'USER_BLOCKED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  
  // Message errors
  MESSAGE_SEND_FAILED: 'MESSAGE_SEND_FAILED',
  MESSAGE_PROCESSING_FAILED: 'MESSAGE_PROCESSING_FAILED',
  INVALID_MESSAGE_TYPE: 'INVALID_MESSAGE_TYPE',
  
  // AI errors
  AI_SERVICE_ERROR: 'AI_SERVICE_ERROR',
  AI_QUOTA_EXCEEDED: 'AI_QUOTA_EXCEEDED',
  AI_TIMEOUT: 'AI_TIMEOUT',
  
  // Command errors
  COMMAND_NOT_FOUND: 'COMMAND_NOT_FOUND',
  COMMAND_EXECUTION_FAILED: 'COMMAND_EXECUTION_FAILED',
  INVALID_PARAMETERS: 'INVALID_PARAMETERS'
} as const

export const LOG_LEVELS = {
  ERROR: 'error' as const,
  WARN: 'warn' as const,
  INFO: 'info' as const,
  DEBUG: 'debug' as const,
  TRACE: 'trace' as const
}

export const METRIC_NAMES = {
  MESSAGE_COUNT: 'message_count',
  USER_COUNT: 'user_count',
  SESSION_COUNT: 'session_count',
  ACTIVE_CONVERSATIONS: 'active_conversations',
  AI_INTERACTIONS: 'ai_interactions',
  COMMAND_EXECUTIONS: 'command_executions',
  ERROR_COUNT: 'error_count',
  RESPONSE_TIME: 'response_time',
  UPTIME_SECONDS: 'uptime_seconds',
  MEMORY_USAGE: 'memory_usage',
  CPU_USAGE: 'cpu_usage'
} as const

export const WEBHOOK_EVENTS = {
  SESSION_READY: 'session:ready',
  SESSION_DISCONNECTED: 'session:disconnected',
  MESSAGE_RECEIVED: 'message:received',
  MESSAGE_SENT: 'message:sent',
  USER_JOINED: 'user:joined',
  COMMAND_EXECUTED: 'command:executed',
  ERROR_OCCURRED: 'error:occurred'
} as const