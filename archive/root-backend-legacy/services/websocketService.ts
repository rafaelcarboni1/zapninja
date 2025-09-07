import { Server } from 'socket.io'
import { Server as HttpServer } from 'http'
import { queueManager } from '../queues/QueueManager'

interface SocketClient {
  id: string
  userId?: string
  sessionId?: string
  isAdmin: boolean
  connectedAt: Date
}

interface RealTimeEvent {
  event: string
  data: any
  room?: string
  userId?: string
  sessionId?: string
}

export class WebSocketService {
  private io: Server
  private clients: Map<string, SocketClient> = new Map()
  
  constructor(server: HttpServer) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.DASHBOARD_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    })

    this.setupEventHandlers()
    this.setupQueueListeners()
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`📡 WebSocket client connected: ${socket.id}`)
      
      // Handle authentication
      socket.on('authenticate', (data: { userId?: string, sessionId?: string, isAdmin?: boolean }) => {
        const client: SocketClient = {
          id: socket.id,
          userId: data.userId,
          sessionId: data.sessionId,
          isAdmin: data.isAdmin || false,
          connectedAt: new Date()
        }
        
        this.clients.set(socket.id, client)
        
        // Join appropriate rooms
        if (data.userId) {
          socket.join(`user:${data.userId}`)
        }
        
        if (data.sessionId) {
          socket.join(`session:${data.sessionId}`)
        }
        
        if (data.isAdmin) {
          socket.join('admin')
        }
        
        socket.join('dashboard')
        
        console.log(`✅ Client authenticated: ${socket.id}`, client)
        
        // Send initial data
        this.sendInitialData(socket)
      })

      // Handle dashboard subscriptions
      socket.on('subscribe', (data: { room: string }) => {
        socket.join(data.room)
        console.log(`📺 Client subscribed to room: ${data.room}`)
      })

      socket.on('unsubscribe', (data: { room: string }) => {
        socket.leave(data.room)
        console.log(`📺 Client unsubscribed from room: ${data.room}`)
      })

      // Handle admin commands via WebSocket
      socket.on('admin:command', async (data: { command: string, parameters?: any }) => {
        const client = this.clients.get(socket.id)
        if (!client?.isAdmin) {
          socket.emit('error', { message: 'Unauthorized' })
          return
        }

        try {
          await queueManager.addAdminCommand({
            userId: client.userId || 'websocket-admin',
            sessionId: client.sessionId || '',
            command: data.command,
            parameters: data.parameters || {},
            timestamp: new Date()
          })
          
          socket.emit('admin:command:queued', { command: data.command })
        } catch (error) {
          socket.emit('error', { message: 'Failed to queue command', error })
        }
      })

      // Handle queue management
      socket.on('queue:stats', async () => {
        const client = this.clients.get(socket.id)
        if (!client?.isAdmin) {
          socket.emit('error', { message: 'Unauthorized' })
          return
        }

        try {
          const stats = await queueManager.getQueueStats()
          socket.emit('queue:stats', stats)
        } catch (error) {
          socket.emit('error', { message: 'Failed to get queue stats', error })
        }
      })

      socket.on('queue:pause', async (data: { queueName: string }) => {
        const client = this.clients.get(socket.id)
        if (!client?.isAdmin) {
          socket.emit('error', { message: 'Unauthorized' })
          return
        }

        try {
          await queueManager.pauseQueue(data.queueName)
          socket.emit('queue:paused', { queueName: data.queueName })
          this.broadcast('admin', 'queue:paused', { queueName: data.queueName })
        } catch (error) {
          socket.emit('error', { message: 'Failed to pause queue', error })
        }
      })

      socket.on('queue:resume', async (data: { queueName: string }) => {
        const client = this.clients.get(socket.id)
        if (!client?.isAdmin) {
          socket.emit('error', { message: 'Unauthorized' })
          return
        }

        try {
          await queueManager.resumeQueue(data.queueName)
          socket.emit('queue:resumed', { queueName: data.queueName })
          this.broadcast('admin', 'queue:resumed', { queueName: data.queueName })
        } catch (error) {
          socket.emit('error', { message: 'Failed to resume queue', error })
        }
      })

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`📡 WebSocket client disconnected: ${socket.id}`)
        this.clients.delete(socket.id)
      })
    })
  }

  private async sendInitialData(socket: any): Promise<void> {
    try {
      // Send current system status
      const queueStats = await queueManager.getQueueStats()
      socket.emit('initial:queue_stats', queueStats)
      
      // Send session count and other basic stats
      socket.emit('initial:system_stats', {
        connectedClients: this.clients.size,
        timestamp: new Date()
      })
    } catch (error) {
      console.error('Failed to send initial data:', error)
    }
  }

  private setupQueueListeners(): void {
    // Listen to queue events and broadcast to dashboard
    // Note: This would require modifying the queue manager to emit events
    // For now, we'll use periodic updates
    setInterval(async () => {
      try {
        const stats = await queueManager.getQueueStats()
        this.broadcast('dashboard', 'queue:stats:update', stats)
      } catch (error) {
        console.error('Failed to broadcast queue stats:', error)
      }
    }, 5000) // Every 5 seconds
  }

  // Public methods for broadcasting events
  broadcast(room: string, event: string, data: any): void {
    this.io.to(room).emit(event, {
      ...data,
      timestamp: new Date()
    })
  }

  broadcastToUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, {
      ...data,
      timestamp: new Date()
    })
  }

  broadcastToSession(sessionId: string, event: string, data: any): void {
    this.io.to(`session:${sessionId}`).emit(event, {
      ...data,
      timestamp: new Date()
    })
  }

  broadcastToAdmin(event: string, data: any): void {
    this.io.to('admin').emit(event, {
      ...data,
      timestamp: new Date()
    })
  }

  // Specific event methods
  emitSessionStatus(sessionId: string, status: string, data: any = {}): void {
    this.broadcast('dashboard', 'session:status', {
      sessionId,
      status,
      ...data
    })
    
    this.broadcastToSession(sessionId, 'status_update', {
      status,
      ...data
    })
  }

  emitNewMessage(conversationId: string, message: any): void {
    this.broadcast('dashboard', 'message:new', {
      conversationId,
      message
    })
  }

  emitUserActivity(userId: string, activity: any): void {
    this.broadcastToUser(userId, 'activity:update', activity)
    this.broadcast('admin', 'user:activity', {
      userId,
      activity
    })
  }

  emitCommandExecuted(commandData: any): void {
    this.broadcastToAdmin('command:executed', commandData)
    this.broadcast('dashboard', 'command:update', commandData)
  }

  emitSystemError(error: any): void {
    this.broadcastToAdmin('system:error', error)
    console.error('System error broadcasted:', error)
  }

  emitMetricsUpdate(metrics: any): void {
    this.broadcast('dashboard', 'metrics:update', metrics)
  }

  emitQueueUpdate(queueName: string, stats: any): void {
    this.broadcast('dashboard', 'queue:update', {
      queueName,
      stats
    })
    
    this.broadcastToAdmin('queue:stats', {
      queueName,
      stats
    })
  }

  // Connection management
  getConnectedClients(): SocketClient[] {
    return Array.from(this.clients.values())
  }

  getClientCount(): number {
    return this.clients.size
  }

  getAdminCount(): number {
    return Array.from(this.clients.values()).filter(client => client.isAdmin).length
  }

  disconnectClient(socketId: string): void {
    const socket = this.io.sockets.sockets.get(socketId)
    if (socket) {
      socket.disconnect(true)
    }
    this.clients.delete(socketId)
  }

  shutdown(): void {
    console.log('🔄 Shutting down WebSocket service...')
    
    // Notify all clients of shutdown
    this.broadcast('dashboard', 'system:shutdown', {
      message: 'Server is shutting down'
    })
    
    // Close all connections
    this.io.close()
    
    console.log('✅ WebSocket service shutdown complete')
  }
}

export let websocketService: WebSocketService | null = null

export function initializeWebSocketService(server: HttpServer): WebSocketService {
  websocketService = new WebSocketService(server)
  return websocketService
}