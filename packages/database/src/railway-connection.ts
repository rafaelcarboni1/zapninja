/**
 * @file: railway-connection.ts
 * @responsibility: Connection service for Railway PostgreSQL database
 * @exports: RailwayConnection, railwayDB
 * @imports: pg, ioredis
 * @layer: services
 */

import { Pool, PoolClient, QueryResult } from 'pg'
import Redis from 'ioredis'
import { logger } from '../../shared/src/utils/logger'

interface DatabaseConfig {
  connectionString: string
  ssl?: boolean
  maxConnections?: number
  idleTimeout?: number
  connectionTimeout?: number
}

interface RedisConfig {
  url: string
  retryDelayOnFailover?: number
  maxRetriesPerRequest?: number
}

export class RailwayConnection {
  private pool: Pool
  private redis: Redis
  private isConnected = false

  constructor(
    dbConfig?: DatabaseConfig,
    redisConfig?: RedisConfig
  ) {
    // PostgreSQL connection setup
    const defaultDbConfig: DatabaseConfig = {
      connectionString: process.env.DATABASE_URL || '',
      ssl: process.env.NODE_ENV === 'production',
      maxConnections: 20,
      idleTimeout: 30000,
      connectionTimeout: 2000
    }

    const finalDbConfig = { ...defaultDbConfig, ...dbConfig }
    
    this.pool = new Pool({
      connectionString: finalDbConfig.connectionString,
      ssl: finalDbConfig.ssl ? { rejectUnauthorized: false } : false,
      max: finalDbConfig.maxConnections,
      idleTimeoutMillis: finalDbConfig.idleTimeout,
      connectionTimeoutMillis: finalDbConfig.connectionTimeout,
    })

    // Redis connection setup
    const defaultRedisConfig: RedisConfig = {
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    }

    const finalRedisConfig = { ...defaultRedisConfig, ...redisConfig }

    this.redis = new Redis(finalRedisConfig.url, {
      retryDelayOnFailover: finalRedisConfig.retryDelayOnFailover,
      maxRetriesPerRequest: finalRedisConfig.maxRetriesPerRequest,
      lazyConnect: true
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    // PostgreSQL event handlers
    this.pool.on('connect', () => {
      logger.info('New PostgreSQL client connected')
    })

    this.pool.on('error', (err) => {
      logger.error('PostgreSQL pool error:', err)
    })

    // Redis event handlers
    this.redis.on('connect', () => {
      logger.info('Redis connected')
    })

    this.redis.on('error', (err) => {
      logger.error('Redis connection error:', err)
    })

    this.redis.on('ready', () => {
      logger.info('Redis ready')
    })
  }

  async connect(): Promise<void> {
    try {
      // Test PostgreSQL connection
      const client = await this.pool.connect()
      await client.query('SELECT NOW()')
      client.release()

      // Test Redis connection
      await this.redis.connect()
      await this.redis.ping()

      this.isConnected = true
      logger.info('Railway database connections established successfully')
    } catch (error) {
      logger.error('Failed to connect to Railway databases:', error)
      throw new Error(`Database connection failed: ${error}`)
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.pool.end()
      await this.redis.quit()
      this.isConnected = false
      logger.info('Railway database connections closed')
    } catch (error) {
      logger.error('Error disconnecting from databases:', error)
    }
  }

  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.')
    }

    const client = await this.pool.connect()
    try {
      const result: QueryResult<T> = await client.query(text, params)
      return result.rows
    } catch (error) {
      logger.error('Database query error:', { query: text, params, error })
      throw error
    } finally {
      client.release()
    }
  }

  async queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    const results = await this.query<T>(text, params)
    return results.length > 0 ? results[0] : null
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.')
    }

    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')
      const result = await callback(client)
      await client.query('COMMIT')
      return result
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('Transaction error:', error)
      throw error
    } finally {
      client.release()
    }
  }

  async getFromCache<T = any>(key: string): Promise<T | null> {
    try {
      const cached = await this.redis.get(key)
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      logger.error('Cache get error:', { key, error })
      return null
    }
  }

  async setCache(key: string, value: any, ttlSeconds = 300): Promise<void> {
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value))
    } catch (error) {
      logger.error('Cache set error:', { key, error })
    }
  }

  async deleteCache(key: string): Promise<void> {
    try {
      await this.redis.del(key)
    } catch (error) {
      logger.error('Cache delete error:', { key, error })
    }
  }

  async flushCache(): Promise<void> {
    try {
      await this.redis.flushall()
      logger.info('Cache flushed')
    } catch (error) {
      logger.error('Cache flush error:', error)
    }
  }

  async healthCheck(): Promise<{
    database: boolean
    redis: boolean
    connected: boolean
  }> {
    let database = false
    let redis = false

    try {
      await this.pool.query('SELECT 1')
      database = true
    } catch (error) {
      logger.error('Database health check failed:', error)
    }

    try {
      await this.redis.ping()
      redis = true
    } catch (error) {
      logger.error('Redis health check failed:', error)
    }

    return {
      database,
      redis,
      connected: this.isConnected && database && redis
    }
  }

  getConnectionStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      isConnected: this.isConnected
    }
  }
}

// Singleton instance
export const railwayDB = new RailwayConnection()

// Auto-connect on import in production
if (process.env.NODE_ENV === 'production') {
  railwayDB.connect().catch((error) => {
    logger.error('Failed to auto-connect to Railway DB:', error)
    process.exit(1)
  })
}