/**
 * @file: types/index.ts
 * @responsibility: Core type definitions for ZAPNINJA system
 * @exports: Session, User, Message, Context, AI types
 * @imports: none
 * @layer: types
 */

// Session Types
export interface Session {
  id: string;
  session_name: string;
  phone_number?: string;
  is_active: boolean;
  ai_config: AIConfig;
  timing_config: TimingConfig;
  custom_prompt?: string;
  max_messages: number;
  created_at: string;
  updated_at: string;
}

export interface SessionCreateInput {
  session_name: string;
  phone_number?: string;
  ai_config?: Partial<AIConfig>;
  timing_config?: Partial<TimingConfig>;
  custom_prompt?: string;
  max_messages?: number;
}

export interface SessionUpdateInput extends Partial<Omit<SessionCreateInput, 'session_name'>> {
  is_active?: boolean;
}

// User Types
export interface User {
  id: string;
  phone_number: string;
  name?: string;
  display_name?: string;
  is_active: boolean;
  profile_data: Record<string, any>;
  preferences: UserPreferences;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  language?: string;
  notifications?: boolean;
  theme?: 'light' | 'dark';
  timezone?: string;
}

export interface UserCreateInput {
  phone_number: string;
  name?: string;
  display_name?: string;
  profile_data?: Record<string, any>;
  preferences?: UserPreferences;
}

// Conversation Types
export interface Conversation {
  id: string;
  session_id: string;
  user_id: string;
  conversation_data: Record<string, any>;
  context_summary?: string;
  last_interaction: string;
  created_at: string;
  updated_at: string;
}

// Message Types
export interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'ai' | 'system';
  content: string;
  message_type: 'text' | 'image' | 'audio' | 'document' | 'command';
  metadata: MessageMetadata;
  created_at: string;
}

export interface MessageMetadata {
  timestamp?: string;
  delivery_status?: 'sent' | 'delivered' | 'read';
  response_time?: number;
  ai_model?: string;
  confidence_score?: number;
  [key: string]: any;
}

export interface MessageCreateInput {
  conversation_id: string;
  sender_type: 'user' | 'ai' | 'system';
  content: string;
  message_type?: 'text' | 'image' | 'audio' | 'document' | 'command';
  metadata?: MessageMetadata;
}

// Context Types
export interface UserContext {
  id: string;
  user_id: string;
  session_id: string;
  context_type: string;
  context_data: Record<string, any>;
  relevance_score: number;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ContextCreateInput {
  user_id: string;
  session_id: string;
  context_type: string;
  context_data: Record<string, any>;
  relevance_score?: number;
  expires_at?: string;
}

// AI Configuration Types
export interface AIConfig {
  model: 'gpt-4' | 'gpt-3.5-turbo' | 'gemini-pro';
  temperature: number;
  max_tokens: number;
  system_prompt: string;
  fallback_model?: string;
  enable_functions?: boolean;
  enable_vision?: boolean;
}

// Timing Configuration Types
export interface TimingConfig {
  response_time: number;
  message_delay: number;
  rest_period: number;
  working_hours: {
    start: string;
    end: string;
  };
  message_limit_per_hour: number;
  typing_simulation: boolean;
  long_break_chance?: number;
  long_break_min_time?: number;
  long_break_max_time?: number;
}

// Admin Command Types
export interface AdminCommand {
  id: string;
  session_id: string;
  command_name: string;
  parameters: Record<string, any>;
  executed_by: string;
  execution_result: AdminCommandResult;
  created_at: string;
}

export interface AdminCommandResult {
  success: boolean;
  message: string;
  data?: any;
  execution_time?: number;
  error?: string;
}

// System Metrics Types
export interface SystemMetric {
  id: string;
  session_id: string;
  metric_type: string;
  metric_value: Record<string, any>;
  recorded_at: string;
}

export interface MetricValue {
  value: number;
  unit?: string;
  context?: Record<string, any>;
}

// Learning Data Types
export interface LearningData {
  id: string;
  session_id: string;
  user_id: string;
  interaction_type: string;
  input_data: Record<string, any>;
  output_data: Record<string, any>;
  feedback_score?: number;
  learning_tags: string[];
  created_at: string;
}

// Health Check Types
export interface HealthStatus {
  name: string;
  port: number;
  status: 'initializing' | 'running' | 'error';
  connected: boolean;
  lastActivity: string;
  messagesProcessed: number;
  errors: number;
  uptime: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error Types
export interface ZapNinjaError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  session_id?: string;
  user_id?: string;
}

// Event Types
export interface SystemEvent {
  type: string;
  payload: Record<string, any>;
  timestamp: string;
  session_id?: string;
  user_id?: string;
}

// WebSocket Types
export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: string;
  clientId?: string;
}

// Dashboard Types
export interface DashboardMetrics {
  totalSessions: number;
  activeSessions: number;
  totalUsers: number;
  totalMessages: number;
  avgResponseTime: number;
  systemHealth: number;
}

// Search and Filter Types
export interface SearchFilters {
  session_id?: string;
  user_id?: string;
  date_from?: string;
  date_to?: string;
  message_type?: string;
  sender_type?: string;
}

export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}

// Export utility types
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Partial<T> = { [P in keyof T]?: T[P] };
export type Required<T> = { [P in keyof T]-?: T[P] };
export type DeepPartial<T> = { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P] };

// Function types
export type AsyncHandler<T = any> = (...args: any[]) => Promise<T>;
export type EventHandler<T = any> = (event: T) => void | Promise<void>;
export type Validator<T> = (value: T) => boolean | string;
export type Transformer<T, U> = (value: T) => U;