import Queue from 'bull'
import Redis from 'redis'
import { config } from 'dotenv'

config()

interface QueueJob<T = any> {
  id?: string
  data: T
  opts?: {
    delay?: number
    attempts?: number
    backoff?: string | number
    removeOnComplete?: number
    removeOnFail?: number
  }
}

interface ProcessedMessage {
  id: string
  conversationId: string
  content: string
  fromMe: boolean
  timestamp: Date
  metadata?: any
}

interface AIRequest {
  userId: string
  message: string
  conversationId: string
  sessionId: string
  context?: any[]
  priority?: 'high' | 'medium' | 'low'
}

interface AdminCommandJob {
  userId: string
  sessionId: string
  command: string
  parameters: any
  timestamp: Date
}

export class QueueManager {
  private redis: Redis.RedisClientType
  private messageQueue: Queue.Queue<ProcessedMessage>
  private aiQueue: Queue.Queue<AIRequest>
  private commandQueue: Queue.Queue<AdminCommandJob>
  private webhookQueue: Queue.Queue<any>
  private cleanupQueue: Queue.Queue<any>

  constructor() {
    // Initialize Redis connection
    this.redis = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    })

    // Initialize queues with Redis connection
    const redisConfig = {
      redis: {
        port: parseInt(process.env.REDIS_PORT || '6379'),
        host: process.env.REDIS_HOST || 'localhost',
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0')
      }
    }

    // Message processing queue
    this.messageQueue = new Queue('message-processing', redisConfig)
    
    // AI request queue
    this.aiQueue = new Queue('ai-requests', redisConfig)
    
    // Admin command queue
    this.commandQueue = new Queue('admin-commands', redisConfig)
    
    // Webhook processing queue
    this.webhookQueue = new Queue('webhook-processing', redisConfig)
    
    // System cleanup queue
    this.cleanupQueue = new Queue('system-cleanup', redisConfig)

    this.setupProcessors()
    this.setupErrorHandling()
  }

  async initialize(): Promise<void> {
    try {
      await this.redis.connect()
      console.log('✅ Redis connected successfully')
      
      // Setup recurring cleanup jobs
      await this.scheduleCleanupJobs()
      
      console.log('✅ Queue Manager initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize Queue Manager:', error)
      throw error
    }
  }

  private setupProcessors(): void {
    // Message processing
    this.messageQueue.process('process-message', 5, async (job) => {
      const { messageProcessor } = await import('../services/messageHandler')
      return await messageProcessor.processMessage(job.data)
    })

    // AI requests with priority
    this.aiQueue.process('ai-request', 3, async (job) => {
      const { aiService } = await import('../services/aiService')
      return await aiService.processRequest(job.data)
    })

    // Admin commands
    this.commandQueue.process('admin-command', 2, async (job) => {
      const { adminCommands } = await import('../services/adminCommands')
      return await adminCommands.executeCommand(job.data)
    })

    // Webhook processing
    this.webhookQueue.process('webhook', 10, async (job) => {
      const { webhookProcessor } = await import('../services/webhookProcessor')
      return await webhookProcessor.processWebhook(job.data)
    })

    // System cleanup
    this.cleanupQueue.process('cleanup-expired-context', async (job) => {
      const { contextService } = await import('../services/contextService')
      return await contextService.cleanupExpiredContext()
    })

    this.cleanupQueue.process('cleanup-old-messages', async (job) => {
      const { databaseService } = await import('../services/databaseService')
      return await databaseService.cleanupOldMessages(job.data.daysToKeep)
    })

    this.cleanupQueue.process('cleanup-old-metrics', async (job) => {
      const { databaseService } = await import('../services/databaseService')
      return await databaseService.cleanupOldMetrics(job.data.daysToKeep)
    })
  }

  private setupErrorHandling(): void {
    const queues = [
      this.messageQueue,
      this.aiQueue,
      this.commandQueue,
      this.webhookQueue,
      this.cleanupQueue
    ]

    queues.forEach(queue => {
      queue.on('failed', (job, err) => {
        console.error(`❌ Job ${job.id} failed in queue ${queue.name}:`, err)
        // Could add notification service here
      })

      queue.on('stalled', (job) => {
        console.warn(`⚠️ Job ${job.id} stalled in queue ${queue.name}`)
      })

      queue.on('completed', (job, result) => {
        console.log(`✅ Job ${job.id} completed in queue ${queue.name}`)
      })
    })
  }

  // Message Queue Methods
  async addMessage(message: ProcessedMessage, options?: any): Promise<void> {
    await this.messageQueue.add('process-message', message, {
      attempts: 3,
      backoff: 'exponential',
      removeOnComplete: 100,
      removeOnFail: 50,
      ...options
    })
  }

  // AI Queue Methods
  async addAIRequest(request: AIRequest, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<void> {
    const priorityMap = { high: 1, medium: 5, low: 10 }
    
    await this.aiQueue.add('ai-request', request, {
      priority: priorityMap[priority],
      attempts: 2,
      backoff: 'fixed',
      removeOnComplete: 50,
      removeOnFail: 25
    })
  }

  // Admin Command Queue Methods
  async addAdminCommand(command: AdminCommandJob): Promise<void> {
    await this.commandQueue.add('admin-command', command, {
      attempts: 1, // Admin commands should not retry automatically
      removeOnComplete: 200,
      removeOnFail: 100
    })
  }

  // Webhook Queue Methods
  async addWebhook(webhookData: any): Promise<void> {
    await this.webhookQueue.add('webhook', webhookData, {
      attempts: 5,
      backoff: 'exponential',
      removeOnComplete: 50,
      removeOnFail: 25
    })
  }

  // Bulk operations
  async addBulkMessages(messages: ProcessedMessage[]): Promise<void> {
    const jobs = messages.map(message => ({
      name: 'process-message',
      data: message,
      opts: {
        attempts: 3,
        backoff: 'exponential',
        removeOnComplete: 100,
        removeOnFail: 50
      }
    }))

    await this.messageQueue.addBulk(jobs)
  }

  // Queue monitoring
  async getQueueStats(): Promise<any> {
    const stats = {}
    const queues = [
      { name: 'messages', queue: this.messageQueue },
      { name: 'ai', queue: this.aiQueue },
      { name: 'commands', queue: this.commandQueue },
      { name: 'webhooks', queue: this.webhookQueue },
      { name: 'cleanup', queue: this.cleanupQueue }
    ]

    for (const { name, queue } of queues) {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed(),
        queue.getDelayed()
      ])

      stats[name] = {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length
      }
    }

    return stats
  }

  // Cleanup methods
  private async scheduleCleanupJobs(): Promise<void> {
    // Cleanup expired context every hour
    await this.cleanupQueue.add('cleanup-expired-context', {}, {
      repeat: { cron: '0 * * * *' }, // Every hour
      removeOnComplete: 1,
      removeOnFail: 1
    })

    // Cleanup old messages every day at 2 AM
    await this.cleanupQueue.add('cleanup-old-messages', { daysToKeep: 30 }, {
      repeat: { cron: '0 2 * * *' }, // Every day at 2 AM
      removeOnComplete: 1,
      removeOnFail: 1
    })

    // Cleanup old metrics every week
    await this.cleanupQueue.add('cleanup-old-metrics', { daysToKeep: 30 }, {
      repeat: { cron: '0 3 * * 0' }, // Every Sunday at 3 AM
      removeOnComplete: 1,
      removeOnFail: 1
    })
  }

  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueueByName(queueName)
    if (queue) {
      await queue.pause()
      console.log(`⏸️ Queue ${queueName} paused`)
    }
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueueByName(queueName)
    if (queue) {
      await queue.resume()
      console.log(`▶️ Queue ${queueName} resumed`)
    }
  }

  async clearQueue(queueName: string): Promise<void> {
    const queue = this.getQueueByName(queueName)
    if (queue) {
      await queue.empty()
      console.log(`🗑️ Queue ${queueName} cleared`)
    }
  }

  private getQueueByName(name: string): Queue.Queue | null {
    const queueMap = {
      'messages': this.messageQueue,
      'ai': this.aiQueue,
      'commands': this.commandQueue,
      'webhooks': this.webhookQueue,
      'cleanup': this.cleanupQueue
    }
    
    return queueMap[name] || null
  }

  async shutdown(): Promise<void> {
    console.log('🔄 Shutting down Queue Manager...')
    
    const queues = [
      this.messageQueue,
      this.aiQueue,
      this.commandQueue,
      this.webhookQueue,
      this.cleanupQueue
    ]

    // Close all queues
    await Promise.all(queues.map(queue => queue.close()))
    
    // Close Redis connection
    await this.redis.quit()
    
    console.log('✅ Queue Manager shutdown complete')
  }
}

// Singleton instance
export const queueManager = new QueueManager()