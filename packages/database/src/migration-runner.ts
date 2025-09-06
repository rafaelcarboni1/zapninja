/**
 * @file: migration-runner.ts
 * @responsibility: Database migration runner for Railway PostgreSQL
 * @exports: MigrationRunner, runMigrations
 * @imports: fs, path, railway-connection
 * @layer: database
 */

import fs from 'fs/promises'
import path from 'path'
import { railwayDB } from './railway-connection'
import { logger } from '../../shared/src/utils/logger'

interface Migration {
  id: string
  filename: string
  sql: string
  checksum: string
}

interface MigrationRecord {
  id: string
  filename: string
  checksum: string
  executed_at: Date
}

export class MigrationRunner {
  private migrationsPath: string

  constructor(migrationsPath?: string) {
    this.migrationsPath = migrationsPath || path.join(__dirname, 'migrations')
  }

  async initializeMigrationsTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        checksum VARCHAR(64) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_migrations_filename 
      ON schema_migrations(filename);
    `

    await railwayDB.query(sql)
    logger.info('Migrations table initialized')
  }

  async getMigrationFiles(): Promise<Migration[]> {
    try {
      const files = await fs.readdir(this.migrationsPath)
      const sqlFiles = files
        .filter(file => file.endsWith('.sql'))
        .sort()

      const migrations: Migration[] = []

      for (const filename of sqlFiles) {
        const filePath = path.join(this.migrationsPath, filename)
        const sql = await fs.readFile(filePath, 'utf-8')
        const checksum = this.generateChecksum(sql)
        const id = filename.replace('.sql', '')

        migrations.push({
          id,
          filename,
          sql,
          checksum
        })
      }

      return migrations
    } catch (error) {
      logger.error('Failed to read migration files:', error)
      throw new Error(`Cannot read migrations from ${this.migrationsPath}`)
    }
  }

  async getExecutedMigrations(): Promise<MigrationRecord[]> {
    const sql = `
      SELECT filename, checksum, executed_at 
      FROM schema_migrations 
      ORDER BY executed_at ASC
    `

    const rows = await railwayDB.query<{
      filename: string
      checksum: string
      executed_at: Date
    }>(sql)

    return rows.map(row => ({
      id: row.filename.replace('.sql', ''),
      filename: row.filename,
      checksum: row.checksum,
      executed_at: row.executed_at
    }))
  }

  async executeMigration(migration: Migration): Promise<void> {
    logger.info(`Executing migration: ${migration.filename}`)

    await railwayDB.transaction(async (client) => {
      // Execute migration SQL
      await client.query(migration.sql)

      // Record migration execution
      await client.query(
        'INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)',
        [migration.filename, migration.checksum]
      )
    })

    logger.info(`Migration completed: ${migration.filename}`)
  }

  async validateMigration(migration: Migration, executed: MigrationRecord): Promise<boolean> {
    if (migration.checksum !== executed.checksum) {
      logger.error(`Migration checksum mismatch for ${migration.filename}`, {
        expected: migration.checksum,
        actual: executed.checksum
      })
      return false
    }
    return true
  }

  async runPendingMigrations(): Promise<void> {
    try {
      // Ensure connection is established
      if (!(await railwayDB.healthCheck()).connected) {
        await railwayDB.connect()
      }

      // Initialize migrations tracking table
      await this.initializeMigrationsTable()

      // Get all migrations and executed migrations
      const [availableMigrations, executedMigrations] = await Promise.all([
        this.getMigrationFiles(),
        this.getExecutedMigrations()
      ])

      logger.info(`Found ${availableMigrations.length} migration files`)
      logger.info(`${executedMigrations.length} migrations already executed`)

      // Create lookup for executed migrations
      const executedLookup = new Map(
        executedMigrations.map(m => [m.filename, m])
      )

      // Validate executed migrations
      for (const migration of availableMigrations) {
        const executed = executedLookup.get(migration.filename)
        if (executed) {
          const isValid = await this.validateMigration(migration, executed)
          if (!isValid) {
            throw new Error(`Migration validation failed: ${migration.filename}`)
          }
        }
      }

      // Find pending migrations
      const pendingMigrations = availableMigrations.filter(
        migration => !executedLookup.has(migration.filename)
      )

      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations to execute')
        return
      }

      logger.info(`Executing ${pendingMigrations.length} pending migrations`)

      // Execute pending migrations in order
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration)
      }

      logger.info('All migrations executed successfully')

    } catch (error) {
      logger.error('Migration execution failed:', error)
      throw error
    }
  }

  async rollbackMigration(filename: string): Promise<void> {
    logger.warn(`Rolling back migration: ${filename}`)
    
    // Note: This is a simplified rollback - in production you'd want
    // proper down migrations
    await railwayDB.query(
      'DELETE FROM schema_migrations WHERE filename = $1',
      [filename]
    )

    logger.warn(`Migration ${filename} removed from tracking (manual cleanup may be required)`)
  }

  async getMigrationStatus(): Promise<{
    total: number
    executed: number
    pending: string[]
    lastExecuted?: string
  }> {
    const [available, executed] = await Promise.all([
      this.getMigrationFiles(),
      this.getExecutedMigrations()
    ])

    const executedFilenames = new Set(executed.map(m => m.filename))
    const pending = available
      .filter(m => !executedFilenames.has(m.filename))
      .map(m => m.filename)

    const lastExecuted = executed.length > 0 
      ? executed[executed.length - 1].filename 
      : undefined

    return {
      total: available.length,
      executed: executed.length,
      pending,
      lastExecuted
    }
  }

  private generateChecksum(content: string): string {
    const crypto = require('crypto')
    return crypto
      .createHash('sha256')
      .update(content, 'utf8')
      .digest('hex')
  }
}

// Singleton instance
export const migrationRunner = new MigrationRunner()

// Convenience function for running migrations
export async function runMigrations(): Promise<void> {
  await migrationRunner.runPendingMigrations()
}

// CLI support
if (require.main === module) {
  const command = process.argv[2]
  
  switch (command) {
    case 'run':
      runMigrations()
        .then(() => {
          console.log('✅ Migrations completed successfully')
          process.exit(0)
        })
        .catch((error) => {
          console.error('❌ Migration failed:', error)
          process.exit(1)
        })
      break
      
    case 'status':
      migrationRunner.getMigrationStatus()
        .then((status) => {
          console.log('📊 Migration Status:')
          console.log(`   Total: ${status.total}`)
          console.log(`   Executed: ${status.executed}`)
          console.log(`   Pending: ${status.pending.length}`)
          if (status.lastExecuted) {
            console.log(`   Last executed: ${status.lastExecuted}`)
          }
          if (status.pending.length > 0) {
            console.log('   Pending migrations:')
            status.pending.forEach(p => console.log(`     - ${p}`))
          }
          process.exit(0)
        })
        .catch((error) => {
          console.error('❌ Failed to get migration status:', error)
          process.exit(1)
        })
      break
      
    default:
      console.log('Usage: node migration-runner.js [run|status]')
      process.exit(1)
  }
}