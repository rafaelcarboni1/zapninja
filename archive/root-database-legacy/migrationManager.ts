import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'

config()

interface Migration {
  id: string
  filename: string
  description: string
  applied_at?: Date
  checksum: string
}

interface MigrationFile {
  id: string
  filename: string
  upPath: string
  downPath: string
  description: string
  checksum: string
}

export class MigrationManager {
  private supabase
  private migrationsPath: string

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set')
    }

    this.supabase = createClient(supabaseUrl, supabaseKey)
    this.migrationsPath = join(__dirname, 'migrations')
  }

  // Ensure migration tracking table exists
  private async ensureMigrationsTable(): Promise<void> {
    const { error } = await this.supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id VARCHAR(255) PRIMARY KEY,
          filename VARCHAR(255) NOT NULL,
          description TEXT,
          checksum VARCHAR(64) NOT NULL,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
    })

    if (error) {
      console.error('Error creating migrations table:', error)
      throw error
    }
  }

  // Generate checksum for migration file
  private generateChecksum(content: string): string {
    const crypto = require('crypto')
    return crypto.createHash('sha256').update(content).digest('hex')
  }

  // Get all migration files from directory
  private getMigrationFiles(): MigrationFile[] {
    const files = readdirSync(this.migrationsPath)
    const upFiles = files.filter(f => f.endsWith('.sql') && !f.endsWith('_down.sql'))
    
    return upFiles.map(filename => {
      const id = filename.split('_')[0]
      const upPath = join(this.migrationsPath, filename)
      const downPath = join(this.migrationsPath, filename.replace('.sql', '_down.sql'))
      
      const upContent = readFileSync(upPath, 'utf8')
      const description = this.extractDescription(upContent)
      const checksum = this.generateChecksum(upContent)

      return {
        id,
        filename,
        upPath,
        downPath,
        description,
        checksum
      }
    }).sort((a, b) => a.id.localeCompare(b.id))
  }

  // Extract description from migration file
  private extractDescription(content: string): string {
    const match = content.match(/-- Description: (.+)/)
    return match ? match[1] : 'No description'
  }

  // Get applied migrations from database
  private async getAppliedMigrations(): Promise<Migration[]> {
    await this.ensureMigrationsTable()
    
    const { data, error } = await this.supabase
      .from('schema_migrations')
      .select('*')
      .order('id')

    if (error) {
      throw error
    }

    return data || []
  }

  // Check migration status
  async status(): Promise<void> {
    console.log('🔍 Checking migration status...\n')
    
    const migrationFiles = this.getMigrationFiles()
    const appliedMigrations = await this.getAppliedMigrations()
    
    console.log('Migration Status:')
    console.log('================')
    
    for (const file of migrationFiles) {
      const applied = appliedMigrations.find(m => m.id === file.id)
      const status = applied ? '✅ Applied' : '❌ Pending'
      const date = applied ? new Date(applied.applied_at!).toLocaleString() : 'N/A'
      
      console.log(`${file.id} | ${status} | ${date} | ${file.description}`)
    }
    
    console.log(`\nTotal: ${migrationFiles.length} migrations`)
    console.log(`Applied: ${appliedMigrations.length}`)
    console.log(`Pending: ${migrationFiles.length - appliedMigrations.length}`)
  }

  // Run pending migrations
  async migrate(): Promise<void> {
    console.log('🚀 Running migrations...\n')
    
    const migrationFiles = this.getMigrationFiles()
    const appliedMigrations = await this.getAppliedMigrations()
    
    const pendingMigrations = migrationFiles.filter(
      file => !appliedMigrations.find(m => m.id === file.id)
    )

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations')
      return
    }

    for (const migration of pendingMigrations) {
      try {
        console.log(`Applying migration ${migration.id}: ${migration.description}`)
        
        const sql = readFileSync(migration.upPath, 'utf8')
        
        // Execute migration SQL
        const { error: sqlError } = await this.supabase.rpc('exec_sql', { sql })
        
        if (sqlError) {
          throw sqlError
        }

        // Record migration as applied
        const { error: insertError } = await this.supabase
          .from('schema_migrations')
          .insert({
            id: migration.id,
            filename: migration.filename,
            description: migration.description,
            checksum: migration.checksum
          })

        if (insertError) {
          throw insertError
        }

        console.log(`✅ Applied ${migration.id}`)
        
      } catch (error) {
        console.error(`❌ Failed to apply migration ${migration.id}:`, error)
        throw error
      }
    }
    
    console.log('\n🎉 All migrations applied successfully!')
  }

  // Rollback last migration
  async rollback(): Promise<void> {
    console.log('⏪ Rolling back last migration...\n')
    
    const appliedMigrations = await this.getAppliedMigrations()
    
    if (appliedMigrations.length === 0) {
      console.log('❌ No migrations to rollback')
      return
    }

    const lastMigration = appliedMigrations[appliedMigrations.length - 1]
    const migrationFiles = this.getMigrationFiles()
    const migrationFile = migrationFiles.find(f => f.id === lastMigration.id)

    if (!migrationFile) {
      throw new Error(`Migration file not found for ${lastMigration.id}`)
    }

    try {
      console.log(`Rolling back ${lastMigration.id}: ${lastMigration.description}`)
      
      const downSql = readFileSync(migrationFile.downPath, 'utf8')
      
      // Execute rollback SQL
      const { error: sqlError } = await this.supabase.rpc('exec_sql', { sql: downSql })
      
      if (sqlError) {
        throw sqlError
      }

      // Remove migration record
      const { error: deleteError } = await this.supabase
        .from('schema_migrations')
        .delete()
        .eq('id', lastMigration.id)

      if (deleteError) {
        throw deleteError
      }

      console.log(`✅ Rolled back ${lastMigration.id}`)
      
    } catch (error) {
      console.error(`❌ Failed to rollback migration ${lastMigration.id}:`, error)
      throw error
    }
  }

  // Validate checksums
  async validate(): Promise<void> {
    console.log('🔍 Validating migration checksums...\n')
    
    const migrationFiles = this.getMigrationFiles()
    const appliedMigrations = await this.getAppliedMigrations()
    
    let hasErrors = false

    for (const applied of appliedMigrations) {
      const file = migrationFiles.find(f => f.id === applied.id)
      
      if (!file) {
        console.log(`❌ Migration file ${applied.id} not found`)
        hasErrors = true
        continue
      }

      if (file.checksum !== applied.checksum) {
        console.log(`❌ Checksum mismatch for ${applied.id}`)
        hasErrors = true
        continue
      }

      console.log(`✅ ${applied.id} - checksum valid`)
    }

    if (hasErrors) {
      throw new Error('Migration validation failed')
    }

    console.log('\n✅ All migration checksums are valid')
  }
}