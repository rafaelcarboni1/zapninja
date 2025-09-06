// Utility functions for ZAPNINJA

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Tailwind CSS class utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Date formatting utilities
export function formatDate(date: Date | string): string {
  if (typeof date === 'string') {
    date = new Date(date)
  }
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const target = typeof date === 'string' ? new Date(date) : date
  const diffInSeconds = Math.floor((now.getTime() - target.getTime()) / 1000)

  if (diffInSeconds < 60) return 'agora'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m atr�s`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h atr�s`
  return `${Math.floor(diffInSeconds / 86400)}d atr�s`
}

// Phone number utilities
export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const numbers = phone.replace(/\D/g, '')
  
  // Brazilian phone number formatting
  if (numbers.length === 11) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`
  }
  if (numbers.length === 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`
  }
  
  return phone
}

export function normalizePhoneNumber(phone: string): string {
  // Remove all non-numeric characters and ensure country code
  let numbers = phone.replace(/\D/g, '')
  
  // Add Brazil country code if not present
  if (numbers.length === 11 && numbers.startsWith('0')) {
    numbers = '55' + numbers.slice(1)
  } else if (numbers.length === 10) {
    numbers = '55' + numbers
  } else if (numbers.length === 11 && !numbers.startsWith('55')) {
    numbers = '55' + numbers
  }
  
  return numbers
}

// File size utilities
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// String utilities
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9 -]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim()
}

// Validation utilities
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{10,14}$/
  return phoneRegex.test(phone.replace(/\D/g, ''))
}

// Array utilities
export function groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key])
    groups[groupKey] = groups[groupKey] || []
    groups[groupKey].push(item)
    return groups
  }, {} as Record<string, T[]>)
}

export function uniqueBy<T>(array: T[], key: keyof T): T[] {
  const seen = new Set()
  return array.filter(item => {
    const value = item[key]
    if (seen.has(value)) {
      return false
    }
    seen.add(value)
    return true
  })
}

// Performance utilities
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T {
  let timeout: NodeJS.Timeout | null = null
  
  return ((...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }) as T
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T {
  let inThrottle: boolean
  
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }) as T
}

// Color utilities for status
export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    active: 'green',
    ready: 'green',
    completed: 'green',
    inactive: 'gray',
    pending: 'yellow',
    executing: 'blue',
    initializing: 'blue',
    waiting_qr: 'yellow',
    disconnected: 'red',
    error: 'red',
    failed: 'red',
    cancelled: 'orange',
    archived: 'gray',
    blocked: 'red'
  }
  
  return statusColors[status.toLowerCase()] || 'gray'
}

// Retry utility
export async function retry<T>(
  fn: () => Promise<T>,
  attempts: number = 3,
  delay: number = 1000
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (attempts <= 1) {
      throw error
    }
    
    await new Promise(resolve => setTimeout(resolve, delay))
    return retry(fn, attempts - 1, delay * 2) // Exponential backoff
  }
}