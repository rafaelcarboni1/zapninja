/**
 * @file: constants/index.ts
 * @responsibility: System-wide constants and configuration values
 * @exports: API endpoints, limits, defaults, error codes
 * @imports: none
 * @layer: constants
 */

// System Constants
export const SYSTEM = {
  NAME: 'ZAPNINJA',
  VERSION: '2.0.0',
  MIN_NODE_VERSION: '18.0.0',
} as const;

// Database Constants
export const DATABASE = {
  MAX_CONNECTIONS: 10,
  CONNECTION_TIMEOUT: 30000,
  QUERY_TIMEOUT: 60000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

// Session Constants
export const SESSION = {
  DEFAULT_MAX_MESSAGES: 100,
  MAX_MAX_MESSAGES: 1000,
  MIN_MAX_MESSAGES: 10,
  DEFAULT_SESSION_NAME: 'default',
  MAX_SESSION_NAME_LENGTH: 100,
} as const;

// Message Constants
export const MESSAGE = {
  MAX_CONTENT_LENGTH: 4096,
  SUPPORTED_TYPES: ['text', 'image', 'audio', 'document', 'command'] as const,
  SENDER_TYPES: ['user', 'ai', 'system'] as const,
} as const;

// AI Configuration Constants
export const AI = {
  MODELS: {
    GPT_4: 'gpt-4',
    GPT_35_TURBO: 'gpt-3.5-turbo',
    GEMINI_PRO: 'gemini-pro',
  },
  DEFAULT_TEMPERATURE: 0.7,
  MIN_TEMPERATURE: 0.0,
  MAX_TEMPERATURE: 2.0,
  DEFAULT_MAX_TOKENS: 2000,
  MIN_MAX_TOKENS: 50,
  MAX_MAX_TOKENS: 4096,
} as const;

// Timing Configuration Constants
export const TIMING = {
  DEFAULT_RESPONSE_TIME: 2000,
  MIN_RESPONSE_TIME: 500,
  MAX_RESPONSE_TIME: 30000,
  DEFAULT_MESSAGE_DELAY: 1000,
  MIN_MESSAGE_DELAY: 0,
  MAX_MESSAGE_DELAY: 10000,
  DEFAULT_REST_PERIOD: 300000, // 5 minutes
  MIN_REST_PERIOD: 0,
  MAX_REST_PERIOD: 3600000, // 1 hour
  DEFAULT_MESSAGE_LIMIT: 100,
  MIN_MESSAGE_LIMIT: 1,
  MAX_MESSAGE_LIMIT: 1000,
} as const;

// Context Constants
export const CONTEXT = {
  TYPES: {
    PROFILE: 'profile',
    PREFERENCES: 'preferences',
    CONVERSATION_HISTORY: 'conversation_history',
    BEHAVIORAL_PATTERN: 'behavioral_pattern',
    TOPIC_INTEREST: 'topic_interest',
    INTERACTION_STYLE: 'interaction_style',
  },
  DEFAULT_RELEVANCE_SCORE: 1.0,
  MIN_RELEVANCE_SCORE: 0.0,
  MAX_RELEVANCE_SCORE: 1.0,
  DEFAULT_EXPIRATION_DAYS: 30,
} as const;

// Admin Commands Constants
export const ADMIN_COMMANDS = {
  SESSION_MANAGEMENT: {
    LIST_SESSIONS: '!listar_sessoes',
    CREATE_SESSION: '!criar_sessao',
    ACTIVATE_SESSION: '!ativar_sessao',
    DEACTIVATE_SESSION: '!desativar_sessao',
    DELETE_SESSION: '!deletar_sessao',
  },
  USER_MANAGEMENT: {
    LIST_USERS: '!listar_usuarios',
    USER_INFO: '!info_usuario',
    BLOCK_USER: '!bloquear_usuario',
    UNBLOCK_USER: '!desbloquear_usuario',
    CLEAR_CONTEXT: '!limpar_contexto',
  },
  AI_CONFIGURATION: {
    CONFIG_AI: '!config_ia',
    SET_MODEL: '!modelo_ia',
    SET_TEMPERATURE: '!temperatura',
    SET_SYSTEM_PROMPT: '!prompt_sistema',
    SET_SESSION_PROMPT: '!prompt_sessao',
    VIEW_PROMPT: '!ver_prompt',
  },
  TIMING_CONTROL: {
    CONFIG_TIMING: '!config_timing',
    SET_RESPONSE_TIME: '!tempo_resposta',
    SET_MESSAGE_DELAY: '!delay_mensagem',
    SET_REST_PERIOD: '!tempo_descanso',
    SET_WORKING_HOURS: '!horario_funcionamento',
    SET_MESSAGE_LIMIT: '!limite_mensagens',
  },
  MONITORING: {
    METRICS: '!metricas',
    PERFORMANCE: '!performance',
    LOGS: '!logs',
    HISTORY: '!historico',
    STATUS: '!status',
    HEALTH: '!saude',
  },
  MAINTENANCE: {
    BACKUP: '!backup',
    CLEANUP: '!limpeza',
    TEST_CONNECTION: '!teste_conexao',
    RESTART: '!reiniciar',
    SHUTDOWN: '!desligar',
  },
} as const;

// API Endpoints Constants
export const API = {
  VERSION: 'v1',
  BASE_PATH: '/api/v1',
  ENDPOINTS: {
    SESSIONS: '/sessions',
    USERS: '/users',
    CONVERSATIONS: '/conversations',
    MESSAGES: '/messages',
    CONTEXTS: '/contexts',
    METRICS: '/metrics',
    HEALTH: '/health',
    STATUS: '/status',
    ADMIN: '/admin',
  },
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Error Codes
export const ERROR_CODES = {
  // System Errors
  SYSTEM_INITIALIZATION_FAILED: 'SYSTEM_001',
  DATABASE_CONNECTION_FAILED: 'SYSTEM_002',
  CONFIGURATION_INVALID: 'SYSTEM_003',
  
  // Session Errors
  SESSION_NOT_FOUND: 'SESSION_001',
  SESSION_ALREADY_EXISTS: 'SESSION_002',
  SESSION_INACTIVE: 'SESSION_003',
  SESSION_LIMIT_EXCEEDED: 'SESSION_004',
  
  // User Errors
  USER_NOT_FOUND: 'USER_001',
  USER_ALREADY_EXISTS: 'USER_002',
  USER_BLOCKED: 'USER_003',
  INVALID_PHONE_NUMBER: 'USER_004',
  
  // Message Errors
  MESSAGE_TOO_LONG: 'MESSAGE_001',
  UNSUPPORTED_MESSAGE_TYPE: 'MESSAGE_002',
  MESSAGE_PROCESSING_FAILED: 'MESSAGE_003',
  RATE_LIMIT_EXCEEDED: 'MESSAGE_004',
  
  // AI Errors
  AI_SERVICE_UNAVAILABLE: 'AI_001',
  AI_QUOTA_EXCEEDED: 'AI_002',
  AI_RESPONSE_INVALID: 'AI_003',
  AI_MODEL_NOT_SUPPORTED: 'AI_004',
  
  // WhatsApp Errors
  WHATSAPP_CONNECTION_FAILED: 'WHATSAPP_001',
  WHATSAPP_DISCONNECTED: 'WHATSAPP_002',
  WHATSAPP_AUTH_FAILED: 'WHATSAPP_003',
  WHATSAPP_SEND_FAILED: 'WHATSAPP_004',
  
  // Admin Errors
  ADMIN_UNAUTHORIZED: 'ADMIN_001',
  ADMIN_COMMAND_INVALID: 'ADMIN_002',
  ADMIN_COMMAND_FAILED: 'ADMIN_003',
  
  // Validation Errors
  VALIDATION_FAILED: 'VALIDATION_001',
  REQUIRED_FIELD_MISSING: 'VALIDATION_002',
  INVALID_FORMAT: 'VALIDATION_003',
  VALUE_OUT_OF_RANGE: 'VALIDATION_004',
} as const;

// WebSocket Events
export const WS_EVENTS = {
  // Client to Server
  JOIN_SESSION: 'join_session',
  LEAVE_SESSION: 'leave_session',
  SEND_MESSAGE: 'send_message',
  
  // Server to Client
  SESSION_JOINED: 'session_joined',
  SESSION_LEFT: 'session_left',
  NEW_MESSAGE: 'new_message',
  SESSION_STATUS_CHANGED: 'session_status_changed',
  USER_JOINED: 'user_joined',
  USER_LEFT: 'user_left',
  METRICS_UPDATE: 'metrics_update',
  SYSTEM_ALERT: 'system_alert',
  
  // System Events
  CONNECTION_ESTABLISHED: 'connection_established',
  CONNECTION_LOST: 'connection_lost',
  ERROR: 'error',
} as const;

// File and Directory Paths
export const PATHS = {
  LOGS: './logs',
  DATA: './data',
  UPLOADS: './uploads',
  BACKUPS: './backups',
  TOKENS: './tokens',
  SCRIPTS: './scripts',
} as const;

// Cache Constants
export const CACHE = {
  DEFAULT_TTL: 3600, // 1 hour
  SESSION_TTL: 86400, // 24 hours
  USER_TTL: 43200, // 12 hours
  METRICS_TTL: 300, // 5 minutes
  MAX_ITEMS: 1000,
} as const;

// Rate Limiting
export const RATE_LIMIT = {
  MESSAGES_PER_MINUTE: 60,
  MESSAGES_PER_HOUR: 1000,
  API_REQUESTS_PER_MINUTE: 100,
  ADMIN_COMMANDS_PER_MINUTE: 10,
} as const;

// Logging Levels
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  VERBOSE: 'verbose',
} as const;

// Export all constants as a single object for convenience
export const ZAPNINJA_CONSTANTS = {
  SYSTEM,
  DATABASE,
  SESSION,
  MESSAGE,
  AI,
  TIMING,
  CONTEXT,
  ADMIN_COMMANDS,
  API,
  HTTP_STATUS,
  ERROR_CODES,
  WS_EVENTS,
  PATHS,
  CACHE,
  RATE_LIMIT,
  LOG_LEVELS,
} as const;