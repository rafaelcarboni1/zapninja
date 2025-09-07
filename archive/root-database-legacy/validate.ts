#!/usr/bin/env tsx

import { DataValidator } from './dataValidator'

async function main() {
  const validator = new DataValidator()
  const command = process.argv[2]
  
  try {
    switch (command) {
      case 'validate':
      case 'check':
        await validator.validate()
        break
        
      case 'report':
        await validator.generateReport()
        break
        
      case 'fix':
        await validator.fix()
        break
        
      default:
        console.log(`
Usage: tsx database/validate.ts <command>

Commands:
  validate   Run all validation rules (alias: check)
  report     Generate comprehensive validation report
  fix        Run automated data fixes

Examples:
  tsx database/validate.ts validate
  tsx database/validate.ts report
  tsx database/validate.ts fix
        `)
        process.exit(1)
    }
  } catch (error) {
    console.error('Validation error:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}