#!/usr/bin/env tsx

import { MigrationManager } from './migrationManager'

async function main() {
  const migrationManager = new MigrationManager()
  
  const command = process.argv[2]
  
  try {
    switch (command) {
      case 'status':
        await migrationManager.status()
        break
        
      case 'migrate':
      case 'up':
        await migrationManager.migrate()
        break
        
      case 'rollback':
      case 'down':
        await migrationManager.rollback()
        break
        
      case 'validate':
        await migrationManager.validate()
        break
        
      default:
        console.log(`
Usage: tsx database/migrate.ts <command>

Commands:
  status     Show migration status
  migrate    Run pending migrations (alias: up)
  rollback   Rollback last migration (alias: down)
  validate   Validate migration checksums

Examples:
  tsx database/migrate.ts status
  tsx database/migrate.ts migrate
  tsx database/migrate.ts rollback
        `)
        process.exit(1)
    }
  } catch (error) {
    console.error('Migration error:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}