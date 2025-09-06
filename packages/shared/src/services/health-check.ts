/**
 * @file: health-check.ts
 * @responsibility: System health monitoring service for Railway deployment
 * @exports: HealthCheckService, SystemHealth, ComponentStatus
 * @imports: railway-connection, environment, logger
 * @layer: services
 */

import { railwayDB } from '../../../database/src/railway-connection'
import { getConfig, validateEnvironment } from '../config/environment'
import { logger } from '../utils/logger'

export interface ComponentStatus {
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  responseTime: number
  error?: string
  metadata?: Record<string, any>
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy'
  components: ComponentStatus[]
  timestamp: Date
  uptime: number
  version: string
  environment: string
}

export class HealthCheckService {
  private startTime: Date
  private lastHealthCheck?: SystemHealth

  constructor() {
    this.startTime = new Date()
  }

  async checkDatabase(): Promise<ComponentStatus> {
    const start = Date.now()
    
    try {
      const health = await railwayDB.healthCheck()
      const responseTime = Date.now() - start

      if (health.connected && health.database && health.redis) {
        logger.healthCheck('database', 'healthy', { responseTime })
        return {
          name: 'database',
          status: 'healthy',
          responseTime,
          metadata: {
            postgresql: health.database,
            redis: health.redis,
            pool: health.pool
          }
        }
      } else {
        const issues = []
        if (!health.database) issues.push('PostgreSQL connection failed')
        if (!health.redis) issues.push('Redis connection failed')
        if (!health.connected) issues.push('Service not connected')

        logger.healthCheck('database', 'unhealthy', { issues, responseTime })
        return {
          name: 'database',
          status: 'unhealthy',
          responseTime,
          error: `Database issues: ${issues.join(', ')}`,
          metadata: health
        }
      }
    } catch (error) {
      const responseTime = Date.now() - start
      logger.healthCheck('database', 'unhealthy', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime
      })

      return {
        name: 'database',
        status: 'unhealthy',
        responseTime,
        error: error instanceof Error ? error.message : 'Database connection failed'
      }
    }
  }

  async checkEnvironment(): Promise<ComponentStatus> {
    const start = Date.now()
    
    try {
      const validation = validateEnvironment()
      const responseTime = Date.now() - start

      if (validation.isValid) {
        logger.healthCheck('environment', 'healthy', { responseTime })
        return {
          name: 'environment',
          status: 'healthy',
          responseTime,
          metadata: {
            nodeEnv: process.env.NODE_ENV,
            hasRequiredVars: true
          }
        }
      } else {
        logger.healthCheck('environment', 'unhealthy', { 
          errors: validation.errors,
          responseTime
        })
        return {
          name: 'environment',
          status: 'unhealthy',
          responseTime,
          error: `Environment validation failed: ${validation.errors.join(', ')}`,
          metadata: {
            errors: validation.errors
          }
        }
      }
    } catch (error) {
      const responseTime = Date.now() - start
      logger.healthCheck('environment', 'unhealthy', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime
      })

      return {
        name: 'environment',
        status: 'unhealthy',
        responseTime,
        error: error instanceof Error ? error.message : 'Environment check failed'
      }
    }
  }

  async checkMemory(): Promise<ComponentStatus> {
    const start = Date.now()
    
    try {
      const memUsage = process.memoryUsage()
      const responseTime = Date.now() - start

      // Convert bytes to MB for readability
      const memUsageMB = {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        arrayBuffers: Math.round(memUsage.arrayBuffers / 1024 / 1024)
      }

      // Consider degraded if heap usage > 80% of total heap
      const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
      
      if (heapUsagePercent > 90) {
        status = 'unhealthy'
      } else if (heapUsagePercent > 80) {
        status = 'degraded'
      }

      logger.healthCheck('memory', status, { 
        responseTime,
        memUsageMB,
        heapUsagePercent: Math.round(heapUsagePercent)
      })

      return {
        name: 'memory',
        status,
        responseTime,
        metadata: {
          ...memUsageMB,
          heapUsagePercent: Math.round(heapUsagePercent)
        }
      }
    } catch (error) {
      const responseTime = Date.now() - start
      logger.healthCheck('memory', 'unhealthy', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime
      })

      return {
        name: 'memory',
        status: 'unhealthy',
        responseTime,
        error: error instanceof Error ? error.message : 'Memory check failed'
      }
    }
  }

  async checkFileSystem(): Promise<ComponentStatus> {
    const start = Date.now()
    
    try {
      const fs = require('fs/promises')
      
      // Test basic filesystem operations
      const tempPath = `/tmp/zapninja-health-${Date.now()}`
      await fs.writeFile(tempPath, 'health check')
      await fs.readFile(tempPath)
      await fs.unlink(tempPath)
      
      const responseTime = Date.now() - start

      logger.healthCheck('filesystem', 'healthy', { responseTime })
      return {
        name: 'filesystem',
        status: 'healthy',
        responseTime,
        metadata: {
          tempPath,
          writeable: true,
          readable: true
        }
      }
    } catch (error) {
      const responseTime = Date.now() - start
      logger.healthCheck('filesystem', 'unhealthy', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime
      })

      return {
        name: 'filesystem',
        status: 'unhealthy',
        responseTime,
        error: error instanceof Error ? error.message : 'Filesystem check failed'
      }
    }
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const checkStart = Date.now()
    
    // Run all health checks in parallel
    const [database, environment, memory, filesystem] = await Promise.all([
      this.checkDatabase(),
      this.checkEnvironment(),
      this.checkMemory(),
      this.checkFileSystem()
    ])

    const components = [database, environment, memory, filesystem]
    
    // Determine overall system health
    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    
    const unhealthyCount = components.filter(c => c.status === 'unhealthy').length
    const degradedCount = components.filter(c => c.status === 'degraded').length
    
    if (unhealthyCount > 0) {
      overall = 'unhealthy'
    } else if (degradedCount > 0) {
      overall = 'degraded'
    }

    const config = getConfig()
    const uptime = Date.now() - this.startTime.getTime()
    
    const systemHealth: SystemHealth = {
      overall,
      components,
      timestamp: new Date(),
      uptime: Math.round(uptime / 1000), // Convert to seconds
      version: process.env.npm_package_version || '1.1.0',
      environment: config.server.nodeEnv
    }

    this.lastHealthCheck = systemHealth
    
    const totalTime = Date.now() - checkStart
    logger.performanceMetric('health_check_duration', totalTime, 'ms')
    logger.healthCheck('system', overall, { 
      totalTime,
      componentsChecked: components.length,
      unhealthyCount,
      degradedCount
    })

    return systemHealth
  }

  getLastHealthCheck(): SystemHealth | undefined {
    return this.lastHealthCheck
  }

  async isHealthy(): Promise<boolean> {
    const health = await this.getSystemHealth()
    return health.overall === 'healthy'
  }

  async isDegraded(): Promise<boolean> {
    const health = await this.getSystemHealth()
    return health.overall === 'degraded'
  }

  async isUnhealthy(): Promise<boolean> {
    const health = await this.getSystemHealth()
    return health.overall === 'unhealthy'
  }

  // Get health status for specific component
  async getComponentHealth(componentName: string): Promise<ComponentStatus | undefined> {
    const health = await this.getSystemHealth()
    return health.components.find(c => c.name === componentName)
  }

  // Start periodic health checks
  startPeriodicHealthChecks(intervalMs: number = 60000): NodeJS.Timeout {
    logger.info('Starting periodic health checks', { intervalMs })
    
    return setInterval(async () => {
      try {
        await this.getSystemHealth()
      } catch (error) {
        logger.error('Periodic health check failed', error)
      }
    }, intervalMs)
  }

  // Express.js middleware for health endpoint
  getHealthMiddleware() {
    return async (req: any, res: any) => {
      try {
        const health = await this.getSystemHealth()
        
        // Set appropriate HTTP status code
        let statusCode = 200
        if (health.overall === 'degraded') {
          statusCode = 200 // Still operational
        } else if (health.overall === 'unhealthy') {
          statusCode = 503 // Service Unavailable
        }

        res.status(statusCode).json(health)
      } catch (error) {
        logger.error('Health check endpoint failed', error)
        res.status(500).json({
          overall: 'unhealthy',
          error: 'Health check failed',
          timestamp: new Date()
        })
      }
    }
  }

  // Simple liveness probe (for k8s/Railway)
  getLivenessMiddleware() {
    return (req: any, res: any) => {
      res.status(200).json({
        status: 'alive',
        timestamp: new Date(),
        uptime: Math.round((Date.now() - this.startTime.getTime()) / 1000)
      })
    }
  }

  // Readiness probe (for k8s/Railway)
  getReadinessMiddleware() {
    return async (req: any, res: any) => {
      try {
        const isReady = await this.isHealthy()
        
        if (isReady) {
          res.status(200).json({
            status: 'ready',
            timestamp: new Date()
          })
        } else {
          res.status(503).json({
            status: 'not ready',
            timestamp: new Date()
          })
        }
      } catch (error) {
        res.status(503).json({
          status: 'not ready',
          error: 'Readiness check failed',
          timestamp: new Date()
        })
      }
    }
  }
}

// Singleton instance
export const healthCheckService = new HealthCheckService()

// Convenience exports
export const getSystemHealth = () => healthCheckService.getSystemHealth()
export const isSystemHealthy = () => healthCheckService.isHealthy()
export const getComponentHealth = (name: string) => healthCheckService.getComponentHealth(name)