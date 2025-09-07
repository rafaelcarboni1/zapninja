export interface AIConfig {
  model: 'GPT' | 'GEMINI';
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  customPrompt?: string;
}

export interface TimingConfig {
  responseDelay?: {
    min: number;
    max: number;
  };
  messageDelay?: number;
  restPeriod?: {
    start: string;
    end: string;
  };
  workingHours?: {
    start: string;
    end: string;
  };
  messageLimit?: {
    perHour: number;
    perDay: number;
  };
}

export interface SessionConfig {
  sessionName: string;
  port?: number;
  aiConfig?: AIConfig;
  timingConfig?: TimingConfig;
  isActive: boolean;
  autoStart?: boolean;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SessionStatus {
  sessionName: string;
  isRunning: boolean;
  processId?: number;
  port?: number;
  uptime?: number;
  lastActivity?: Date;
  messageCount?: {
    today: number;
    total: number;
  };
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'error';
  qrCode?: string;
  errors?: string[];
}

export interface SessionMetrics {
  sessionName: string;
  messagesReceived: number;
  messagesSent: number;
  averageResponseTime: number;
  uptime: number;
  restarts: number;
  lastRestart?: Date;
  memoryUsage?: number;
  cpuUsage?: number;
}

export interface MultiSessionConfig {
  maxSessions: number;
  portRange: {
    start: number;
    end: number;
  };
  defaultAIConfig: AIConfig;
  defaultTimingConfig: TimingConfig;
  healthCheckInterval: number;
  autoRestart: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface SessionCommand {
  action: 'start' | 'stop' | 'restart' | 'status' | 'logs' | 'config';
  sessionName: string;
  parameters?: Record<string, any>;
}

export interface SessionEvent {
  type: 'started' | 'stopped' | 'error' | 'message' | 'qr_code' | 'connected' | 'disconnected';
  sessionName: string;
  timestamp: Date;
  data?: any;
  error?: string;
}

export interface HealthCheck {
  sessionName: string;
  isHealthy: boolean;
  lastCheck: Date;
  issues?: string[];
  metrics?: {
    responseTime: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}