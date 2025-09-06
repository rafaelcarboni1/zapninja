import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

interface ValidationRule {
  name: string
  description: string
  query: string
  expectedCount?: number
  maxCount?: number
  minCount?: number
}

interface ValidationResult {
  rule: string
  status: 'PASS' | 'FAIL' | 'WARNING'
  message: string
  actualCount?: number
  expectedCount?: number
  details?: any
}

export class DataValidator {
  private supabase

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set')
    }

    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  private getValidationRules(): ValidationRule[] {
    return [
      // Data Integrity Rules
      {
        name: 'orphaned_conversations',
        description: 'Check for conversations without valid session or user',
        query: `
          SELECT COUNT(*) as count
          FROM conversations c
          LEFT JOIN whatsapp_sessions s ON c.session_id = s.id
          LEFT JOIN whatsapp_users u ON c.user_id = u.id
          WHERE s.id IS NULL OR u.id IS NULL
        `,
        expectedCount: 0
      },
      
      {
        name: 'orphaned_messages',
        description: 'Check for messages without valid conversation',
        query: `
          SELECT COUNT(*) as count
          FROM messages m
          LEFT JOIN conversations c ON m.conversation_id = c.id
          WHERE c.id IS NULL
        `,
        expectedCount: 0
      },
      
      {
        name: 'orphaned_user_context',
        description: 'Check for user context without valid user',
        query: `
          SELECT COUNT(*) as count
          FROM user_context uc
          LEFT JOIN whatsapp_users u ON uc.user_id = u.id
          WHERE u.id IS NULL
        `,
        expectedCount: 0
      },
      
      {
        name: 'orphaned_admin_commands',
        description: 'Check for admin commands without valid user or session',
        query: `
          SELECT COUNT(*) as count
          FROM admin_commands ac
          LEFT JOIN whatsapp_users u ON ac.user_id = u.id
          LEFT JOIN whatsapp_sessions s ON ac.session_id = s.id
          WHERE u.id IS NULL OR s.id IS NULL
        `,
        expectedCount: 0
      },

      // Business Logic Rules
      {
        name: 'duplicate_phone_numbers',
        description: 'Check for duplicate phone numbers in users',
        query: `
          SELECT COUNT(*) as count
          FROM (
            SELECT phone_number, COUNT(*) as cnt
            FROM whatsapp_users
            GROUP BY phone_number
            HAVING COUNT(*) > 1
          ) duplicates
        `,
        expectedCount: 0
      },
      
      {
        name: 'duplicate_session_names',
        description: 'Check for duplicate session names',
        query: `
          SELECT COUNT(*) as count
          FROM (
            SELECT session_name, COUNT(*) as cnt
            FROM whatsapp_sessions
            GROUP BY session_name
            HAVING COUNT(*) > 1
          ) duplicates
        `,
        expectedCount: 0
      },

      // Data Consistency Rules
      {
        name: 'future_timestamps',
        description: 'Check for messages with future timestamps',
        query: `
          SELECT COUNT(*) as count
          FROM messages
          WHERE timestamp > NOW() + INTERVAL '1 hour'
        `,
        expectedCount: 0
      },
      
      {
        name: 'negative_metrics',
        description: 'Check for negative metric values where they should be positive',
        query: `
          SELECT COUNT(*) as count
          FROM system_metrics
          WHERE metric_name IN ('message_count', 'user_count', 'session_count', 'uptime_seconds')
          AND metric_value < 0
        `,
        expectedCount: 0
      },

      // Performance Rules
      {
        name: 'expired_context',
        description: 'Check for expired context entries that should be cleaned up',
        query: `
          SELECT COUNT(*) as count
          FROM user_context
          WHERE expires_at IS NOT NULL AND expires_at < NOW() - INTERVAL '7 days'
        `,
        maxCount: 1000
      },
      
      {
        name: 'old_learning_data',
        description: 'Check for learning data older than 6 months',
        query: `
          SELECT COUNT(*) as count
          FROM learning_data
          WHERE created_at < NOW() - INTERVAL '6 months'
        `,
        maxCount: 10000
      },

      // System Health Rules
      {
        name: 'active_sessions',
        description: 'Check number of active sessions',
        query: `
          SELECT COUNT(*) as count
          FROM whatsapp_sessions
          WHERE status = 'ready'
        `,
        minCount: 1
      },
      
      {
        name: 'admin_users',
        description: 'Check for admin users',
        query: `
          SELECT COUNT(*) as count
          FROM whatsapp_users
          WHERE is_admin = TRUE
        `,
        minCount: 1
      },

      // Message Flow Rules
      {
        name: 'conversations_without_messages',
        description: 'Check for conversations with no messages (might indicate issues)',
        query: `
          SELECT COUNT(*) as count
          FROM conversations c
          LEFT JOIN messages m ON c.id = m.conversation_id
          WHERE m.id IS NULL
          AND c.created_at < NOW() - INTERVAL '1 hour'
        `,
        maxCount: 100
      },
      
      {
        name: 'recent_message_activity',
        description: 'Check for recent message activity (system health)',
        query: `
          SELECT COUNT(*) as count
          FROM messages
          WHERE created_at > NOW() - INTERVAL '24 hours'
        `,
        minCount: 1
      }
    ]
  }

  private async executeValidationRule(rule: ValidationRule): Promise<ValidationResult> {
    try {
      const { data, error } = await this.supabase.rpc('exec_sql', {
        sql: rule.query
      })

      if (error) {
        return {
          rule: rule.name,
          status: 'FAIL',
          message: `Query execution failed: ${error.message}`,
          details: error
        }
      }

      const actualCount = parseInt(data?.[0]?.count || '0')

      // Check expected count
      if (rule.expectedCount !== undefined) {
        if (actualCount === rule.expectedCount) {
          return {
            rule: rule.name,
            status: 'PASS',
            message: rule.description,
            actualCount,
            expectedCount: rule.expectedCount
          }
        } else {
          return {
            rule: rule.name,
            status: 'FAIL',
            message: `${rule.description} - Expected ${rule.expectedCount}, found ${actualCount}`,
            actualCount,
            expectedCount: rule.expectedCount
          }
        }
      }

      // Check minimum count
      if (rule.minCount !== undefined && actualCount < rule.minCount) {
        return {
          rule: rule.name,
          status: 'FAIL',
          message: `${rule.description} - Minimum ${rule.minCount} required, found ${actualCount}`,
          actualCount
        }
      }

      // Check maximum count
      if (rule.maxCount !== undefined && actualCount > rule.maxCount) {
        return {
          rule: rule.name,
          status: 'WARNING',
          message: `${rule.description} - Maximum ${rule.maxCount} recommended, found ${actualCount}`,
          actualCount
        }
      }

      // If no specific checks, just report the count
      return {
        rule: rule.name,
        status: 'PASS',
        message: `${rule.description} - Found ${actualCount} records`,
        actualCount
      }

    } catch (error) {
      return {
        rule: rule.name,
        status: 'FAIL',
        message: `Validation error: ${error}`,
        details: error
      }
    }
  }

  async validate(): Promise<ValidationResult[]> {
    console.log('🔍 Running data integrity validation...\n')
    
    const rules = this.getValidationRules()
    const results: ValidationResult[] = []

    for (const rule of rules) {
      const result = await this.executeValidationRule(rule)
      results.push(result)
      
      const icon = result.status === 'PASS' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌'
      console.log(`${icon} ${result.rule}: ${result.message}`)
    }

    return results
  }

  async generateReport(): Promise<void> {
    const results = await this.validate()
    
    const passed = results.filter(r => r.status === 'PASS').length
    const warnings = results.filter(r => r.status === 'WARNING').length
    const failed = results.filter(r => r.status === 'FAIL').length
    
    console.log('\n📊 Validation Summary:')
    console.log('=====================')
    console.log(`✅ Passed: ${passed}`)
    console.log(`⚠️  Warnings: ${warnings}`)
    console.log(`❌ Failed: ${failed}`)
    console.log(`📋 Total: ${results.length}`)
    
    if (failed > 0) {
      console.log('\n🚨 Failed Validations:')
      console.log('======================')
      results
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`- ${r.rule}: ${r.message}`))
    }
    
    if (warnings > 0) {
      console.log('\n⚠️  Warnings:')
      console.log('=============')
      results
        .filter(r => r.status === 'WARNING')
        .forEach(r => console.log(`- ${r.rule}: ${r.message}`))
    }
  }

  async fix(): Promise<void> {
    console.log('🔧 Running automated data fixes...\n')
    
    const fixes = [
      {
        name: 'cleanup_expired_context',
        description: 'Remove expired user context entries',
        query: `
          DELETE FROM user_context 
          WHERE expires_at IS NOT NULL AND expires_at < NOW() - INTERVAL '7 days'
        `
      },
      {
        name: 'cleanup_old_metrics',
        description: 'Remove old system metrics (older than 30 days)',
        query: `
          DELETE FROM system_metrics 
          WHERE created_at < NOW() - INTERVAL '30 days'
        `
      },
      {
        name: 'update_last_activity',
        description: 'Update last activity for sessions based on recent messages',
        query: `
          UPDATE whatsapp_sessions 
          SET last_activity = (
            SELECT MAX(m.timestamp)
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE c.session_id = whatsapp_sessions.id
          )
          WHERE last_activity IS NULL OR last_activity < NOW() - INTERVAL '1 day'
        `
      }
    ]

    for (const fix of fixes) {
      try {
        console.log(`Applying fix: ${fix.description}`)
        
        const { error } = await this.supabase.rpc('exec_sql', {
          sql: fix.query
        })

        if (error) {
          console.error(`❌ Failed to apply ${fix.name}:`, error.message)
        } else {
          console.log(`✅ Applied ${fix.name}`)
        }
      } catch (error) {
        console.error(`❌ Error applying ${fix.name}:`, error)
      }
    }
    
    console.log('\n🎉 Automated fixes completed!')
  }
}