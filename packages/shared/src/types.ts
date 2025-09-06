// Core types for ZAPNINJA system

export interface WhatsAppSession {
  id: string
  sessionName: string
  phoneNumber?: string
  status: SessionStatus
  qrCode?: string
  connectedAt?: Date
  disconnectedAt?: Date
  lastActivity?: Date
  errorMessage?: string
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export type SessionStatus = 
  | 'initializing' 
  | 'waiting_qr' 
  | 'ready' 
  | 'disconnected' 
  | 'error' 
  | 'closing'

export interface WhatsAppUser {
  id: string
  phoneNumber: string
  name?: string
  profilePicUrl?: string
  isAdmin: boolean
  isBlocked: boolean
  language: string
  preferences?: Record<string, any>
  firstSeen: Date
  lastSeen: Date
  createdAt: Date
  updatedAt: Date
}

export interface Conversation {
  id: string
  sessionId: string
  userId: string
  isGroup: boolean
  groupId?: string
  status: ConversationStatus
  startedAt: Date
  endedAt?: Date
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export type ConversationStatus = 'active' | 'inactive' | 'archived' | 'blocked'

export interface Message {
  id: string
  conversationId: string
  messageId: string
  fromMe: boolean
  type: MessageType
  content?: string
  mediaUrl?: string
  quotedMessageId?: string
  status?: string
  timestamp: Date
  metadata?: Record<string, any>
  createdAt: Date
}

export type MessageType = 
  | 'text' 
  | 'image' 
  | 'audio' 
  | 'video' 
  | 'document' 
  | 'sticker' 
  | 'location' 
  | 'contact'

export interface UserContext {
  id: string
  userId: string
  contextKey: string
  contextValue: string
  contextType: ContextType
  expiresAt?: Date
  relevanceScore: number
  usageCount: number
  lastAccessed: Date
  createdAt: Date
  updatedAt: Date
}

export type ContextType = 'general' | 'preference' | 'memory' | 'command' | 'conversation'

export interface AdminCommand {
  id: string
  userId: string
  sessionId: string
  command: string
  parameters?: Record<string, any>
  result?: string
  status: CommandStatus
  errorMessage?: string
  executedAt: Date
  durationMs?: number
  createdAt: Date
}

export type CommandStatus = 'pending' | 'executing' | 'completed' | 'failed' | 'cancelled'

export interface SystemMetric {
  id: string
  metricName: string
  metricValue: number
  metricUnit?: string
  sessionId?: string
  tags?: Record<string, any>
  timestamp: Date
  createdAt: Date
}

export interface LearningData {
  id: string
  userId: string
  interactionType: string
  inputData: string
  outputData: string
  feedbackScore?: number
  feedbackText?: string
  modelUsed?: string
  tokensUsed?: number
  processingTimeMs?: number
  metadata?: Record<string, any>
  createdAt: Date
}

// AI Service Types
export interface AIResponse {
  content: string
  model: string
  tokensUsed?: number
  processingTime: number
  conversationId?: string
  error?: string
}

export interface AIPrompt {
  userId: string
  message: string
  context?: UserContext[]
  conversationHistory?: Message[]
  metadata?: Record<string, any>
}

// Dashboard Types
export interface DashboardStats {
  activeSessions: number
  totalUsers: number
  messagesLast24h: number
  adminCommands: number
  systemUptime: number
  aiInteractions: number
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  timestamp: Date
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}