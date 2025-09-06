/**
 * @file: utils/index.ts
 * @responsibility: Common utility functions
 * @exports: formatters, validators, helpers, phone number utils
 * @imports: types from types/index
 * @layer: utils
 */

import type { TimingConfig, UserContext, ZapNinjaError } from '../types/index.js';
import { ERROR_CODES } from '../constants/index.js';

// Phone Number Utilities
export class PhoneUtils {
  /**
   * Normalizes a phone number to international format
   */
  static normalize(phoneNumber: string): string {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Add country code if missing (assuming Brazil +55)
    if (digits.length === 11 && digits.startsWith('11')) {
      return `55${digits}`;
    }
    if (digits.length === 10) {
      return `5511${digits}`;
    }
    
    return digits;
  }

  /**
   * Validates if a phone number is valid
   */
  static isValid(phoneNumber: string): boolean {
    const normalized = this.normalize(phoneNumber);
    return normalized.length >= 10 && normalized.length <= 15;
  }

  /**
   * Formats phone number for display
   */
  static format(phoneNumber: string): string {
    const normalized = this.normalize(phoneNumber);
    
    if (normalized.startsWith('55')) {
      const withoutCountry = normalized.substring(2);
      if (withoutCountry.length === 11) {
        return `+55 (${withoutCountry.substring(0, 2)}) ${withoutCountry.substring(2, 7)}-${withoutCountry.substring(7)}`;
      }
    }
    
    return phoneNumber;
  }
}

// Date and Time Utilities
export class DateUtils {
  /**
   * Gets current timestamp in ISO format
   */
  static now(): string {
    return new Date().toISOString();
  }

  /**
   * Adds time to a date
   */
  static addTime(date: Date, milliseconds: number): Date {
    return new Date(date.getTime() + milliseconds);
  }

  /**
   * Formats date for display
   */
  static formatDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('pt-BR');
  }

  /**
   * Checks if a date is within working hours
   */
  static isWithinWorkingHours(
    date: Date,
    workingHours: { start: string; end: string }
  ): boolean {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const currentTime = hours * 60 + minutes;

    const [startHour, startMinute] = workingHours.start.split(':').map(Number);
    const [endHour, endMinute] = workingHours.end.split(':').map(Number);

    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    return currentTime >= startTime && currentTime <= endTime;
  }

  /**
   * Calculates time difference in milliseconds
   */
  static timeDiff(start: string | Date, end: string | Date): number {
    const startDate = typeof start === 'string' ? new Date(start) : start;
    const endDate = typeof end === 'string' ? new Date(end) : end;
    return endDate.getTime() - startDate.getTime();
  }
}

// String Utilities
export class StringUtils {
  /**
   * Capitalizes first letter of each word
   */
  static capitalize(str: string): string {
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }

  /**
   * Truncates string to specified length
   */
  static truncate(str: string, length: number): string {
    return str.length > length ? str.substring(0, length) + '...' : str;
  }

  /**
   * Removes special characters from string
   */
  static sanitize(str: string): string {
    return str.replace(/[^\w\s-]/gi, '');
  }

  /**
   * Generates a slug from string
   */
  static slugify(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Masks sensitive information
   */
  static maskPhone(phoneNumber: string): string {
    if (phoneNumber.length < 4) return phoneNumber;
    const start = phoneNumber.substring(0, 2);
    const end = phoneNumber.substring(phoneNumber.length - 2);
    const middle = '*'.repeat(phoneNumber.length - 4);
    return `${start}${middle}${end}`;
  }
}

// Object Utilities
export class ObjectUtils {
  /**
   * Deep clones an object
   */
  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Merges objects deeply
   */
  static deepMerge<T>(target: T, source: Partial<T>): T {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else if (source[key] !== undefined) {
        result[key] = source[key] as T[Extract<keyof T, string>];
      }
    }
    
    return result;
  }

  /**
   * Removes undefined and null values from object
   */
  static clean<T extends Record<string, any>>(obj: T): Partial<T> {
    const cleaned: Partial<T> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && value !== null) {
        cleaned[key as keyof T] = value;
      }
    }
    
    return cleaned;
  }

  /**
   * Picks specified keys from object
   */
  static pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
    const result = {} as Pick<T, K>;
    
    for (const key of keys) {
      if (key in obj) {
        result[key] = obj[key];
      }
    }
    
    return result;
  }

  /**
   * Omits specified keys from object
   */
  static omit<T, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
    const result = { ...obj };
    
    for (const key of keys) {
      delete result[key];
    }
    
    return result;
  }
}

// Array Utilities
export class ArrayUtils {
  /**
   * Removes duplicates from array
   */
  static unique<T>(arr: T[]): T[] {
    return [...new Set(arr)];
  }

  /**
   * Groups array by key
   */
  static groupBy<T, K extends keyof T>(arr: T[], key: K): Record<string, T[]> {
    return arr.reduce((groups, item) => {
      const group = String(item[key]);
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  /**
   * Chunks array into smaller arrays
   */
  static chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Shuffles array elements
   */
  static shuffle<T>(arr: T[]): T[] {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// Timing Utilities
export class TimingUtils {
  /**
   * Calculates delay based on message content and timing config
   */
  static calculateDelay(messageContent: string, config: TimingConfig): number {
    const readingTime = Math.max(
      config.response_time || 2000,
      messageContent.length * 50
    );

    const thinkingTime = Math.random() * 3000 + 1000;
    
    const hasLongBreak = Math.random() < (config.long_break_chance || 0.05);
    const longBreak = hasLongBreak ? 
      Math.random() * 10000 + 5000 : 0;

    const workingMultiplier = DateUtils.isWithinWorkingHours(
      new Date(), 
      config.working_hours
    ) ? 1 : 2;

    return (readingTime + thinkingTime + longBreak) * workingMultiplier;
  }

  /**
   * Creates a delay promise
   */
  static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Executes function with timeout
   */
  static async withTimeout<T>(
    promise: Promise<T>, 
    timeoutMs: number,
    errorMessage = 'Operation timed out'
  ): Promise<T> {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    );

    return Promise.race([promise, timeout]);
  }
}

// Error Utilities
export class ErrorUtils {
  /**
   * Creates a standardized error object
   */
  static createError(
    code: string,
    message: string,
    details?: Record<string, any>
  ): ZapNinjaError {
    return {
      code,
      message,
      details,
      timestamp: DateUtils.now(),
    };
  }

  /**
   * Checks if error is of a specific type
   */
  static isErrorCode(error: any, code: string): boolean {
    return error?.code === code;
  }

  /**
   * Extracts error message safely
   */
  static getMessage(error: any): string {
    if (typeof error === 'string') return error;
    if (error?.message) return error.message;
    if (error?.error) return error.error;
    return 'Unknown error occurred';
  }
}

// Context Utilities
export class ContextUtils {
  /**
   * Filters active context entries
   */
  static filterActive(contexts: UserContext[]): UserContext[] {
    const now = new Date();
    return contexts.filter(ctx => 
      !ctx.expires_at || new Date(ctx.expires_at) > now
    );
  }

  /**
   * Sorts contexts by relevance score
   */
  static sortByRelevance(contexts: UserContext[]): UserContext[] {
    return [...contexts].sort((a, b) => b.relevance_score - a.relevance_score);
  }

  /**
   * Gets context summary
   */
  static getSummary(contexts: UserContext[]): Record<string, any> {
    const active = this.filterActive(contexts);
    const summary: Record<string, any> = {};

    for (const ctx of active) {
      if (!summary[ctx.context_type]) {
        summary[ctx.context_type] = [];
      }
      summary[ctx.context_type].push({
        data: ctx.context_data,
        relevance: ctx.relevance_score,
        created: ctx.created_at,
      });
    }

    return summary;
  }
}

// Validation Utilities
export class ValidationUtils {
  /**
   * Validates email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validates UUID format
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validates number range
   */
  static isInRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
  }

  /**
   * Validates required fields
   */
  static validateRequired<T extends Record<string, any>>(
    obj: T,
    requiredFields: (keyof T)[]
  ): { valid: boolean; missingFields: string[] } {
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
        missingFields.push(String(field));
      }
    }

    return {
      valid: missingFields.length === 0,
      missingFields,
    };
  }
}

// Export all utilities
export {
  PhoneUtils,
  DateUtils,
  StringUtils,
  ObjectUtils,
  ArrayUtils,
  TimingUtils,
  ErrorUtils,
  ContextUtils,
  ValidationUtils,
};