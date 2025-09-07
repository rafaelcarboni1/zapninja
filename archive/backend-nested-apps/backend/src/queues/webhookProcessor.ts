// Webhook processor for external integrations

import { queueManager } from './QueueManager'

interface WebhookEvent {
  type: string
  sessionId?: string
  userId?: string
  data: any
  timestamp: Date
  metadata?: any
}

export class WebhookProcessor {
  private webhookEndpoints: Map<string, string> = new Map()

  constructor() {
    // Load webhook endpoints from environment or database
    this.loadWebhookEndpoints()
  }

  private loadWebhookEndpoints(): void {
    // Example webhook endpoints
    if (process.env.WEBHOOK_DISCORD) {
      this.webhookEndpoints.set('discord', process.env.WEBHOOK_DISCORD)
    }
    
    if (process.env.WEBHOOK_SLACK) {
      this.webhookEndpoints.set('slack', process.env.WEBHOOK_SLACK)
    }
    
    if (process.env.WEBHOOK_CUSTOM) {
      this.webhookEndpoints.set('custom', process.env.WEBHOOK_CUSTOM)
    }
  }

  async processWebhook(event: WebhookEvent): Promise<void> {
    try {
      console.log(`📡 Processing webhook event: ${event.type}`)
      
      // Format webhook payload based on event type
      const payload = this.formatWebhookPayload(event)
      
      // Send to all configured endpoints
      const promises = Array.from(this.webhookEndpoints.entries()).map(
        ([name, url]) => this.sendWebhook(name, url, payload)
      )
      
      await Promise.allSettled(promises)
      
    } catch (error) {
      console.error('❌ Webhook processing failed:', error)
      throw error
    }
  }

  private formatWebhookPayload(event: WebhookEvent): any {
    const basePayload = {
      timestamp: event.timestamp.toISOString(),
      source: 'ZAPNINJA',
      event_type: event.type,
      session_id: event.sessionId,
      user_id: event.userId
    }

    switch (event.type) {
      case 'session:ready':
        return {
          ...basePayload,
          title: '✅ WhatsApp Session Ready',
          message: `Session ${event.data.sessionName} is now connected`,
          color: 'green',
          fields: [
            { name: 'Session', value: event.data.sessionName },
            { name: 'Phone', value: event.data.phoneNumber || 'N/A' }
          ]
        }
      
      case 'session:disconnected':
        return {
          ...basePayload,
          title: '❌ WhatsApp Session Disconnected',
          message: `Session ${event.data.sessionName} has disconnected`,
          color: 'red',
          fields: [
            { name: 'Session', value: event.data.sessionName },
            { name: 'Reason', value: event.data.reason || 'Unknown' }
          ]
        }
      
      case 'message:received':
        return {
          ...basePayload,
          title: '📨 New Message Received',
          message: `Message from ${event.data.userName}`,
          color: 'blue',
          fields: [
            { name: 'From', value: event.data.userName },
            { name: 'Content', value: event.data.content.substring(0, 100) + (event.data.content.length > 100 ? '...' : '') },
            { name: 'Type', value: event.data.type }
          ]
        }
      
      case 'command:executed':
        return {
          ...basePayload,
          title: '⚡ Admin Command Executed',
          message: `Command ${event.data.command} executed`,
          color: 'yellow',
          fields: [
            { name: 'Command', value: event.data.command },
            { name: 'User', value: event.data.userName },
            { name: 'Status', value: event.data.status },
            { name: 'Duration', value: `${event.data.duration}ms` }
          ]
        }
      
      case 'error:occurred':
        return {
          ...basePayload,
          title: '🚨 System Error',
          message: `Error in ${event.data.component}`,
          color: 'red',
          fields: [
            { name: 'Component', value: event.data.component },
            { name: 'Error', value: event.data.error },
            { name: 'Severity', value: event.data.severity || 'medium' }
          ]
        }
      
      default:
        return {
          ...basePayload,
          title: `📋 ${event.type}`,
          message: 'System event occurred',
          data: event.data
        }
    }
  }

  private async sendWebhook(name: string, url: string, payload: any): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ZAPNINJA/1.0.0'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      console.log(`✅ Webhook sent to ${name}`)
      
    } catch (error) {
      console.error(`❌ Failed to send webhook to ${name}:`, error)
      // Don't throw - let other webhooks continue
    }
  }

  // Helper methods for triggering common webhook events
  async triggerSessionReady(sessionId: string, sessionData: any): Promise<void> {
    await queueManager.addWebhook({
      type: 'session:ready',
      sessionId,
      data: sessionData,
      timestamp: new Date()
    })
  }

  async triggerSessionDisconnected(sessionId: string, reason: string): Promise<void> {
    await queueManager.addWebhook({
      type: 'session:disconnected',
      sessionId,
      data: { reason },
      timestamp: new Date()
    })
  }

  async triggerMessageReceived(userId: string, messageData: any): Promise<void> {
    await queueManager.addWebhook({
      type: 'message:received',
      userId,
      data: messageData,
      timestamp: new Date()
    })
  }

  async triggerCommandExecuted(userId: string, sessionId: string, commandData: any): Promise<void> {
    await queueManager.addWebhook({
      type: 'command:executed',
      userId,
      sessionId,
      data: commandData,
      timestamp: new Date()
    })
  }

  async triggerError(component: string, error: string, severity: 'low' | 'medium' | 'high' = 'medium'): Promise<void> {
    await queueManager.addWebhook({
      type: 'error:occurred',
      data: { component, error, severity },
      timestamp: new Date()
    })
  }
}

export const webhookProcessor = new WebhookProcessor()