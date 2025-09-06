// Zod schemas for validation

import { z } from 'zod'
import { 
  SessionStatus, 
  ConversationStatus, 
  MessageType, 
  ContextType, 
  CommandStatus 
} from './types'

// Base schemas
export const PhoneNumberSchema = z
  .string()
  .regex(/^\+?[1-9]\d{10,14}$/, 'Invalid phone number format')

export const SessionNameSchema = z
  .string()
  .min(1, 'Session name is required')
  .max(50, 'Session name too long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Session name can only contain letters, numbers, _ and -')

// WhatsApp Session schemas
export const WhatsAppSessionSchema = z.object({
  id: z.string().uuid(),
  sessionName: SessionNameSchema,
  phoneNumber: PhoneNumberSchema.optional(),
  status: z.enum(['initializing', 'waiting_qr', 'ready', 'disconnected', 'error', 'closing'] as const),
  qrCode: z.string().optional(),
  connectedAt: z.date().optional(),
  disconnectedAt: z.date().optional(),
  lastActivity: z.date().optional(),
  errorMessage: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateSessionSchema = z.object({
  sessionName: SessionNameSchema,
  autoConnect: z.boolean().optional().default(false)
})

// User schemas
export const WhatsAppUserSchema = z.object({
  id: z.string().uuid(),
  phoneNumber: PhoneNumberSchema,
  name: z.string().optional(),
  profilePicUrl: z.string().url().optional(),
  isAdmin: z.boolean().default(false),
  isBlocked: z.boolean().default(false),
  language: z.string().min(2).max(10).default('pt-BR'),
  preferences: z.record(z.any()).optional(),
  firstSeen: z.date(),
  lastSeen: z.date(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const UpdateUserSchema = z.object({
  name: z.string().optional(),
  isAdmin: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  language: z.string().min(2).max(10).optional(),
  preferences: z.record(z.any()).optional()
})

// Conversation schemas
export const ConversationSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  userId: z.string().uuid(),
  isGroup: z.boolean().default(false),
  groupId: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived', 'blocked'] as const),
  startedAt: z.date(),
  endedAt: z.date().optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

// Message schemas
export const MessageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  messageId: z.string(),
  fromMe: z.boolean(),
  type: z.enum(['text', 'image', 'audio', 'video', 'document', 'sticker', 'location', 'contact'] as const),
  content: z.string().optional(),
  mediaUrl: z.string().url().optional(),
  quotedMessageId: z.string().optional(),
  status: z.string().optional(),
  timestamp: z.date(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date()
})

export const SendMessageSchema = z.object({
  sessionId: z.string().uuid(),
  to: PhoneNumberSchema,
  content: z.string().min(1, 'Message content is required'),
  type: z.enum(['text', 'image', 'audio', 'video', 'document'] as const).default('text'),
  mediaUrl: z.string().url().optional()
})

// Context schemas
export const UserContextSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  contextKey: z.string().min(1, 'Context key is required'),
  contextValue: z.string().min(1, 'Context value is required'),
  contextType: z.enum(['general', 'preference', 'memory', 'command', 'conversation'] as const),
  expiresAt: z.date().optional(),
  relevanceScore: z.number().min(0).max(1).default(1),
  usageCount: z.number().min(0).default(0),
  lastAccessed: z.date(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export const CreateContextSchema = z.object({
  userId: z.string().uuid(),
  contextKey: z.string().min(1),
  contextValue: z.string().min(1),
  contextType: z.enum(['general', 'preference', 'memory', 'command', 'conversation'] as const).default('general'),
  expiresAt: z.date().optional(),
  relevanceScore: z.number().min(0).max(1).optional()
})

// Admin Command schemas
export const AdminCommandSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  sessionId: z.string().uuid(),
  command: z.string().min(1, 'Command is required'),
  parameters: z.record(z.any()).optional(),
  result: z.string().optional(),
  status: z.enum(['pending', 'executing', 'completed', 'failed', 'cancelled'] as const),
  errorMessage: z.string().optional(),
  executedAt: z.date(),
  durationMs: z.number().min(0).optional(),
  createdAt: z.date()
})

export const ExecuteCommandSchema = z.object({
  sessionId: z.string().uuid(),
  command: z.string().min(1, 'Command is required'),
  parameters: z.record(z.any()).optional()
})

// System Metrics schemas
export const SystemMetricSchema = z.object({
  id: z.string().uuid(),
  metricName: z.string().min(1, 'Metric name is required'),
  metricValue: z.number(),
  metricUnit: z.string().optional(),
  sessionId: z.string().uuid().optional(),
  tags: z.record(z.any()).optional(),
  timestamp: z.date(),
  createdAt: z.date()
})

export const CreateMetricSchema = z.object({
  metricName: z.string().min(1),
  metricValue: z.number(),
  metricUnit: z.string().optional(),
  sessionId: z.string().uuid().optional(),
  tags: z.record(z.any()).optional()
})

// Learning Data schemas
export const LearningDataSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  interactionType: z.string().min(1, 'Interaction type is required'),
  inputData: z.string().min(1, 'Input data is required'),
  outputData: z.string().min(1, 'Output data is required'),
  feedbackScore: z.number().min(0).max(1).optional(),
  feedbackText: z.string().optional(),
  modelUsed: z.string().optional(),
  tokensUsed: z.number().min(0).optional(),
  processingTimeMs: z.number().min(0).optional(),
  metadata: z.record(z.any()).optional(),
  createdAt: z.date()
})

// API schemas
export const PaginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  timestamp: z.date()
})

export const PaginatedResponseSchema = ApiResponseSchema.extend({
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number()
  }).optional()
})

// Dashboard schemas
export const DashboardFiltersSchema = z.object({
  sessionId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  status: z.string().optional(),
  messageType: z.enum(['text', 'image', 'audio', 'video', 'document', 'sticker', 'location', 'contact'] as const).optional()
})

// Environment schemas
export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url('Invalid database URL'),
  SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anonymous key is required'),
  OPENAI_KEY: z.string().optional(),
  OPENAI_ASSISTANT: z.string().optional(),
  GEMINI_KEY: z.string().optional(),
  AI_SELECTED: z.enum(['GPT', 'GEMINI']).default('GPT'),
  REDIS_URL: z.string().optional(),
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().default('0'),
  PORT: z.string().default('3000')
})

// Webhook schemas
export const WebhookEventSchema = z.object({
  type: z.string().min(1, 'Event type is required'),
  sessionId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  data: z.record(z.any()),
  timestamp: z.date(),
  metadata: z.record(z.any()).optional()
})