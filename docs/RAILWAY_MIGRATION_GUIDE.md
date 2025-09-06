# ZAPNINJA - Migração Completa para Railway

## 🚄 Visão Geral da Migração

Migração completa do ZAPNINJA de Supabase para **Railway**, mantendo toda a infraestrutura em uma única plataforma integrada.

---

## 🔄 Mudanças na Arquitetura

### Antes (Supabase + Múltiplas Plataformas)
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vercel        │    │   Railway       │    │   Supabase      │
│   (Frontend)    │    │   (Backend)     │    │   (Database)    │
│                 │    │                 │    │                 │
│ • Next.js App   │────│ • Express API   │────│ • PostgreSQL    │
│ • Static Deploy │    │ • Bot Core      │    │ • Realtime      │
│ • Edge Functions│    │ • Workers       │    │ • Auth          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Depois (Railway Full Stack)
```
┌───────────────────────────────────────────────────────────────┐
│                     RAILWAY PLATFORM                          │
│                                                               │
│  ┌─────────────────┐    ┌─────────────────┐    ┌────────────┐ │
│  │   Frontend      │    │   Backend       │    │ PostgreSQL │ │
│  │   (Next.js)     │    │   (Express)     │    │ Database   │ │
│  │                 │    │                 │    │            │ │
│  │ • Dashboard UI  │────│ • API Routes    │────│ • Tables   │ │
│  │ • WebSocket     │    │ • Bot Core      │    │ • Indexes  │ │
│  │ • Real-time     │    │ • Workers       │    │ • Views    │ │
│  └─────────────────┘    └─────────────────┘    └────────────┘ │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Migration

### 1. Railway PostgreSQL Setup
```yaml
# railway.toml
[build]
  builder = "nixpacks"

[deploy]
  healthcheckPath = "/health"
  healthcheckTimeout = 300
  restartPolicyType = "never"

[env]
  DATABASE_URL = "${{Postgres.DATABASE_URL}}"
  REDIS_URL = "${{Redis.REDIS_URL}}"
  NODE_ENV = "production"
```

### 2. Database Schema Migration
```sql
/**
 * @file: railway-schema.sql
 * @responsibility: Schema completo para Railway PostgreSQL
 * @exports: Database schema
 * @imports: none
 */

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. WhatsApp Sessions
CREATE TABLE whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_name VARCHAR(100) UNIQUE NOT NULL,
  phone_number VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  ai_config JSONB DEFAULT '{}',
  timing_config JSONB DEFAULT '{}',
  custom_prompt TEXT,
  max_messages INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. WhatsApp Users  
CREATE TABLE whatsapp_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255),
  display_name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  profile_data JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Conversations
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES whatsapp_users(id) ON DELETE CASCADE,
  conversation_data JSONB DEFAULT '{}',
  context_summary TEXT,
  last_interaction TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

-- 4. Messages
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'ai', 'system')),
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'document', 'command')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. User Context
CREATE TABLE user_context (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES whatsapp_users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES whatsapp_sessions(id) ON DELETE CASCADE,
  context_type VARCHAR(50) NOT NULL,
  context_data JSONB NOT NULL,
  relevance_score DECIMAL(3,2) DEFAULT 1.0 CHECK (relevance_score >= 0 AND relevance_score <= 1),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX CONCURRENTLY idx_messages_conversation_created 
  ON messages(conversation_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_user_context_user_session 
  ON user_context(user_id, session_id);

CREATE INDEX CONCURRENTLY idx_conversations_session_user 
  ON conversations(session_id, user_id);

-- Functions for auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON whatsapp_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON whatsapp_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 🔧 Backend Configuration

### 1. Database Connection
```typescript
/**
 * @file: railway-database.ts
 * @responsibility: Conexão com Railway PostgreSQL
 * @exports: DatabaseService
 * @imports: pg, redis
 */

import { Pool } from 'pg'
import Redis from 'ioredis'

export class RailwayDatabaseService {
  private pool: Pool
  private redis: Redis
  
  constructor() {
    // PostgreSQL connection
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
    
    // Redis connection for caching
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    })
  }

  async query(text: string, params?: any[]): Promise<any> {
    const client = await this.pool.connect()
    try {
      const result = await client.query(text, params)
      return result.rows
    } finally {
      client.release()
    }
  }

  async getFromCache(key: string): Promise<any> {
    const cached = await this.redis.get(key)
    return cached ? JSON.parse(cached) : null
  }

  async setCache(key: string, value: any, ttl = 300): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(value))
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.pool.query('SELECT NOW()')
      await this.redis.ping()
      return true
    } catch (error) {
      console.error('Database connection failed:', error)
      return false
    }
  }
}

export const railwayDB = new RailwayDatabaseService()
```

### 2. Environment Configuration
```env
# Railway Environment Variables
DATABASE_URL="postgresql://postgres:password@railway-postgres:5432/zapninja"
REDIS_URL="redis://railway-redis:6379"

# Application
NODE_ENV=production
PORT=3000

# AI Services
OPENAI_API_KEY=sk-proj-...
GEMINI_API_KEY=AIza...
AGNO_API_KEY=agno_...

# WhatsApp
BOT_ACTIVE=true
ADMIN_NUMBERS=5511999999999

# Railway Specific
RAILWAY_STATIC_URL="https://zapninja-production.railway.app"
RAILWAY_PUBLIC_DOMAIN="zapninja.railway.app"
```

---

## 🚀 Deployment Configuration

### 1. Railway Services Setup
```json
{
  "services": {
    "web": {
      "name": "zapninja-web",
      "source": {
        "repo": "rafaelcarboni/zapninja-monorepo",
        "branch": "main"
      },
      "build": {
        "buildCommand": "npm run build",
        "startCommand": "npm run start"
      },
      "env": {
        "NODE_ENV": "production",
        "DATABASE_URL": "${{Postgres.DATABASE_URL}}",
        "REDIS_URL": "${{Redis.REDIS_URL}}"
      },
      "healthcheck": {
        "path": "/health",
        "timeout": 30
      }
    },
    
    "postgres": {
      "name": "zapninja-postgres", 
      "source": {
        "image": "postgres:15"
      },
      "env": {
        "POSTGRES_DB": "zapninja",
        "POSTGRES_USER": "postgres",
        "POSTGRES_PASSWORD": "${{secrets.DB_PASSWORD}}"
      },
      "volumes": [
        {
          "mountPath": "/var/lib/postgresql/data",
          "name": "postgres-data"
        }
      ]
    },
    
    "redis": {
      "name": "zapninja-redis",
      "source": {
        "image": "redis:7-alpine"
      },
      "volumes": [
        {
          "mountPath": "/data",
          "name": "redis-data"
        }
      ]
    }
  }
}
```

### 2. Build Configuration
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS runner

WORKDIR /app

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:$PORT/health || exit 1

EXPOSE 3000

CMD ["npm", "run", "start:production"]
```

---

## 🔄 Real-time System

### 1. WebSocket Server (Railway)
```typescript
/**
 * @file: websocket-server.ts
 * @responsibility: WebSocket server para real-time
 * @exports: WebSocketServer
 * @imports: socket.io, express
 */

import { Server } from 'socket.io'
import { createServer } from 'http'
import express from 'express'

export class RailwayWebSocketServer {
  private io: Server
  private app: express.Application
  
  constructor() {
    this.app = express()
    const server = createServer(this.app)
    
    this.io = new Server(server, {
      cors: {
        origin: process.env.RAILWAY_PUBLIC_DOMAIN || "*",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    })
    
    this.setupSocketHandlers()
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id)
      
      // Join session room
      socket.on('join-session', (sessionId: string) => {
        socket.join(`session-${sessionId}`)
      })
      
      // Join dashboard room
      socket.on('join-dashboard', () => {
        socket.join('dashboard')
      })
      
      // Handle disconnect
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id)
      })
    })
  }

  // Broadcast message to session
  broadcastToSession(sessionId: string, event: string, data: any) {
    this.io.to(`session-${sessionId}`).emit(event, data)
  }

  // Broadcast to dashboard
  broadcastToDashboard(event: string, data: any) {
    this.io.to('dashboard').emit(event, data)
  }

  // Global broadcast
  broadcast(event: string, data: any) {
    this.io.emit(event, data)
  }
}

export const wsServer = new RailwayWebSocketServer()
```

---

## 📱 Frontend Updates

### 1. API Client for Railway
```typescript
/**
 * @file: railway-api-client.ts
 * @responsibility: Cliente API para Railway backend
 * @exports: RailwayApiClient
 * @imports: axios, socket.io-client
 */

import axios from 'axios'
import { io, Socket } from 'socket.io-client'

export class RailwayApiClient {
  private api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json'
    }
  })

  private socket: Socket

  constructor() {
    // Initialize WebSocket connection
    this.socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000', {
      transports: ['websocket', 'polling']
    })
  }

  // Session Management
  async getSessions(): Promise<WhatsAppSession[]> {
    const response = await this.api.get('/sessions')
    return response.data
  }

  async createSession(sessionData: CreateSessionData): Promise<WhatsAppSession> {
    const response = await this.api.post('/sessions', sessionData)
    return response.data
  }

  async updateSession(sessionId: string, updates: Partial<WhatsAppSession>): Promise<WhatsAppSession> {
    const response = await this.api.put(`/sessions/${sessionId}`, updates)
    return response.data
  }

  // Real-time subscriptions
  onSessionUpdate(callback: (session: WhatsAppSession) => void) {
    this.socket.on('session-updated', callback)
  }

  onNewMessage(callback: (message: Message) => void) {
    this.socket.on('new-message', callback)
  }

  onMetricsUpdate(callback: (metrics: SystemMetrics) => void) {
    this.socket.on('metrics-updated', callback)
  }

  // Join rooms
  joinSession(sessionId: string) {
    this.socket.emit('join-session', sessionId)
  }

  joinDashboard() {
    this.socket.emit('join-dashboard')
  }
}

export const railwayApi = new RailwayApiClient()
```

---

## 🔧 Migration Strategy

### Phase 1: Database Migration (1 week)
```bash
# 1. Setup Railway PostgreSQL
railway add postgresql

# 2. Run migrations
railway run npm run migrate

# 3. Seed initial data
railway run npm run seed

# 4. Test connections
railway run npm run test:db
```

### Phase 2: Backend Migration (1 week)
```bash
# 1. Update database connections
# 2. Replace Supabase client with PostgreSQL
# 3. Implement WebSocket server
# 4. Update API routes
# 5. Deploy to Railway
```

### Phase 3: Frontend Migration (3 days)
```bash
# 1. Update API endpoints
# 2. Replace Supabase realtime with WebSocket
# 3. Update environment variables
# 4. Test real-time features
```

### Phase 4: Production Deploy (2 days)
```bash
# 1. Configure production environment
# 2. Setup monitoring
# 3. Performance testing
# 4. Go live
```

---

## 📊 Performance Benefits

### Railway Advantages:
- **🚄 Single Platform**: Tudo em um lugar
- **⚡ Better Performance**: Conexões internas mais rápidas
- **💰 Cost Effective**: Sem múltiplas plataformas
- **🔧 Easier Management**: Deploy unificado
- **📈 Auto Scaling**: Escala automático
- **🔄 Zero Downtime**: Deploy sem paradas

---

## 📋 Updated Environment Variables

```env
# Railway Database
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# Application
NODE_ENV=production
PORT=3000
RAILWAY_STATIC_URL=${{RAILWAY_STATIC_URL}}

# AI Services (unchanged)
OPENAI_API_KEY=sk-proj-...
GEMINI_API_KEY=AIza...
AGNO_API_KEY=agno_...

# Bot Configuration (unchanged)
BOT_ACTIVE=true
ADMIN_NUMBERS=5511999999999,5511888888888

# Real-time
WS_PORT=3001
ENABLE_WEBSOCKETS=true
```

---

*Guia completo de migração para Railway*  
*Versão: 1.0 | Data: 2025-01-05*