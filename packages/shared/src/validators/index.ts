/**
 * @file: validators/index.ts
 * @responsibility: Input validation and sanitization functions
 * @exports: validation schemas and functions
 * @imports: types, constants, utils
 * @layer: validators
 */

import type { 
  SessionCreateInput, 
  SessionUpdateInput, 
  UserCreateInput, 
  MessageCreateInput,
  ContextCreateInput,
  AIConfig,
  TimingConfig,
} from '../types/index.js';
import { TIMING, AI, SESSION, MESSAGE, CONTEXT } from '../constants/index.js';
import { ValidationUtils, PhoneUtils } from '../utils/index.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Session Validators
export class SessionValidators {
  static validateCreateInput(input: SessionCreateInput): ValidationResult {
    const errors: string[] = [];

    // Required fields
    if (!input.session_name) {
      errors.push('Session name is required');
    } else if (input.session_name.length > SESSION.MAX_SESSION_NAME_LENGTH) {
      errors.push(`Session name must be less than ${SESSION.MAX_SESSION_NAME_LENGTH} characters`);
    }

    // Phone number validation
    if (input.phone_number && !PhoneUtils.isValid(input.phone_number)) {
      errors.push('Invalid phone number format');
    }

    // Max messages validation
    if (input.max_messages !== undefined) {
      if (!ValidationUtils.isInRange(
        input.max_messages, 
        SESSION.MIN_MAX_MESSAGES, 
        SESSION.MAX_MAX_MESSAGES
      )) {
        errors.push(
          `Max messages must be between ${SESSION.MIN_MAX_MESSAGES} and ${SESSION.MAX_MAX_MESSAGES}`
        );
      }
    }

    // AI config validation
    if (input.ai_config) {
      const aiValidation = this.validateAIConfig(input.ai_config);
      errors.push(...aiValidation.errors);
    }

    // Timing config validation
    if (input.timing_config) {
      const timingValidation = this.validateTimingConfig(input.timing_config);
      errors.push(...timingValidation.errors);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static validateUpdateInput(input: SessionUpdateInput): ValidationResult {
    const errors: string[] = [];

    // Phone number validation
    if (input.phone_number && !PhoneUtils.isValid(input.phone_number)) {
      errors.push('Invalid phone number format');
    }

    // Max messages validation
    if (input.max_messages !== undefined) {
      if (!ValidationUtils.isInRange(
        input.max_messages,
        SESSION.MIN_MAX_MESSAGES,
        SESSION.MAX_MAX_MESSAGES
      )) {
        errors.push(
          `Max messages must be between ${SESSION.MIN_MAX_MESSAGES} and ${SESSION.MAX_MAX_MESSAGES}`
        );
      }
    }

    // AI config validation
    if (input.ai_config) {
      const aiValidation = this.validateAIConfig(input.ai_config);
      errors.push(...aiValidation.errors);
    }

    // Timing config validation
    if (input.timing_config) {
      const timingValidation = this.validateTimingConfig(input.timing_config);
      errors.push(...timingValidation.errors);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private static validateAIConfig(config: Partial<AIConfig>): ValidationResult {
    const errors: string[] = [];

    // Temperature validation
    if (config.temperature !== undefined) {
      if (!ValidationUtils.isInRange(
        config.temperature,
        AI.MIN_TEMPERATURE,
        AI.MAX_TEMPERATURE
      )) {
        errors.push(
          `Temperature must be between ${AI.MIN_TEMPERATURE} and ${AI.MAX_TEMPERATURE}`
        );
      }
    }

    // Max tokens validation
    if (config.max_tokens !== undefined) {
      if (!ValidationUtils.isInRange(
        config.max_tokens,
        AI.MIN_MAX_TOKENS,
        AI.MAX_MAX_TOKENS
      )) {
        errors.push(
          `Max tokens must be between ${AI.MIN_MAX_TOKENS} and ${AI.MAX_MAX_TOKENS}`
        );
      }
    }

    // Model validation
    if (config.model) {
      const validModels = Object.values(AI.MODELS);
      if (!validModels.includes(config.model)) {
        errors.push(`Model must be one of: ${validModels.join(', ')}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private static validateTimingConfig(config: Partial<TimingConfig>): ValidationResult {
    const errors: string[] = [];

    // Response time validation
    if (config.response_time !== undefined) {
      if (!ValidationUtils.isInRange(
        config.response_time,
        TIMING.MIN_RESPONSE_TIME,
        TIMING.MAX_RESPONSE_TIME
      )) {
        errors.push(
          `Response time must be between ${TIMING.MIN_RESPONSE_TIME} and ${TIMING.MAX_RESPONSE_TIME} ms`
        );
      }
    }

    // Message delay validation
    if (config.message_delay !== undefined) {
      if (!ValidationUtils.isInRange(
        config.message_delay,
        TIMING.MIN_MESSAGE_DELAY,
        TIMING.MAX_MESSAGE_DELAY
      )) {
        errors.push(
          `Message delay must be between ${TIMING.MIN_MESSAGE_DELAY} and ${TIMING.MAX_MESSAGE_DELAY} ms`
        );
      }
    }

    // Rest period validation
    if (config.rest_period !== undefined) {
      if (!ValidationUtils.isInRange(
        config.rest_period,
        TIMING.MIN_REST_PERIOD,
        TIMING.MAX_REST_PERIOD
      )) {
        errors.push(
          `Rest period must be between ${TIMING.MIN_REST_PERIOD} and ${TIMING.MAX_REST_PERIOD} ms`
        );
      }
    }

    // Message limit validation
    if (config.message_limit_per_hour !== undefined) {
      if (!ValidationUtils.isInRange(
        config.message_limit_per_hour,
        TIMING.MIN_MESSAGE_LIMIT,
        TIMING.MAX_MESSAGE_LIMIT
      )) {
        errors.push(
          `Message limit must be between ${TIMING.MIN_MESSAGE_LIMIT} and ${TIMING.MAX_MESSAGE_LIMIT}`
        );
      }
    }

    // Working hours validation
    if (config.working_hours) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      
      if (!timeRegex.test(config.working_hours.start)) {
        errors.push('Start time must be in HH:MM format');
      }
      
      if (!timeRegex.test(config.working_hours.end)) {
        errors.push('End time must be in HH:MM format');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// User Validators
export class UserValidators {
  static validateCreateInput(input: UserCreateInput): ValidationResult {
    const errors: string[] = [];

    // Required fields
    const requiredValidation = ValidationUtils.validateRequired(input, ['phone_number']);
    errors.push(...requiredValidation.missingFields.map(field => `${field} is required`));

    // Phone number validation
    if (input.phone_number && !PhoneUtils.isValid(input.phone_number)) {
      errors.push('Invalid phone number format');
    }

    // Name validation
    if (input.name && input.name.length > 255) {
      errors.push('Name must be less than 255 characters');
    }

    // Display name validation
    if (input.display_name && input.display_name.length > 255) {
      errors.push('Display name must be less than 255 characters');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Message Validators
export class MessageValidators {
  static validateCreateInput(input: MessageCreateInput): ValidationResult {
    const errors: string[] = [];

    // Required fields
    const requiredValidation = ValidationUtils.validateRequired(input, [
      'conversation_id',
      'sender_type',
      'content',
    ]);
    errors.push(...requiredValidation.missingFields.map(field => `${field} is required`));

    // UUID validation
    if (input.conversation_id && !ValidationUtils.isValidUUID(input.conversation_id)) {
      errors.push('Invalid conversation ID format');
    }

    // Sender type validation
    if (input.sender_type && !MESSAGE.SENDER_TYPES.includes(input.sender_type)) {
      errors.push(`Sender type must be one of: ${MESSAGE.SENDER_TYPES.join(', ')}`);
    }

    // Content length validation
    if (input.content && input.content.length > MESSAGE.MAX_CONTENT_LENGTH) {
      errors.push(`Content must be less than ${MESSAGE.MAX_CONTENT_LENGTH} characters`);
    }

    // Message type validation
    if (input.message_type && !MESSAGE.SUPPORTED_TYPES.includes(input.message_type)) {
      errors.push(`Message type must be one of: ${MESSAGE.SUPPORTED_TYPES.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Context Validators
export class ContextValidators {
  static validateCreateInput(input: ContextCreateInput): ValidationResult {
    const errors: string[] = [];

    // Required fields
    const requiredValidation = ValidationUtils.validateRequired(input, [
      'user_id',
      'session_id',
      'context_type',
      'context_data',
    ]);
    errors.push(...requiredValidation.missingFields.map(field => `${field} is required`));

    // UUID validation
    if (input.user_id && !ValidationUtils.isValidUUID(input.user_id)) {
      errors.push('Invalid user ID format');
    }

    if (input.session_id && !ValidationUtils.isValidUUID(input.session_id)) {
      errors.push('Invalid session ID format');
    }

    // Context type validation
    if (input.context_type) {
      const validTypes = Object.values(CONTEXT.TYPES);
      if (!validTypes.includes(input.context_type)) {
        errors.push(`Context type must be one of: ${validTypes.join(', ')}`);
      }
    }

    // Relevance score validation
    if (input.relevance_score !== undefined) {
      if (!ValidationUtils.isInRange(
        input.relevance_score,
        CONTEXT.MIN_RELEVANCE_SCORE,
        CONTEXT.MAX_RELEVANCE_SCORE
      )) {
        errors.push(
          `Relevance score must be between ${CONTEXT.MIN_RELEVANCE_SCORE} and ${CONTEXT.MAX_RELEVANCE_SCORE}`
        );
      }
    }

    // Expiration date validation
    if (input.expires_at) {
      const expirationDate = new Date(input.expires_at);
      if (isNaN(expirationDate.getTime())) {
        errors.push('Invalid expiration date format');
      } else if (expirationDate <= new Date()) {
        errors.push('Expiration date must be in the future');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Generic Data Validators
export class DataValidators {
  /**
   * Validates pagination parameters
   */
  static validatePagination(page?: number, limit?: number): ValidationResult {
    const errors: string[] = [];

    if (page !== undefined && (page < 1 || !Number.isInteger(page))) {
      errors.push('Page must be a positive integer');
    }

    if (limit !== undefined && (limit < 1 || limit > 100 || !Number.isInteger(limit))) {
      errors.push('Limit must be an integer between 1 and 100');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates date range parameters
   */
  static validateDateRange(dateFrom?: string, dateTo?: string): ValidationResult {
    const errors: string[] = [];

    if (dateFrom) {
      const from = new Date(dateFrom);
      if (isNaN(from.getTime())) {
        errors.push('Invalid date_from format');
      }
    }

    if (dateTo) {
      const to = new Date(dateTo);
      if (isNaN(to.getTime())) {
        errors.push('Invalid date_to format');
      }
    }

    if (dateFrom && dateTo) {
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      if (from >= to) {
        errors.push('date_from must be before date_to');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates sort parameters
   */
  static validateSort(field?: string, order?: string): ValidationResult {
    const errors: string[] = [];

    const validFields = [
      'created_at',
      'updated_at',
      'last_interaction',
      'relevance_score',
      'feedback_score',
    ];

    if (field && !validFields.includes(field)) {
      errors.push(`Sort field must be one of: ${validFields.join(', ')}`);
    }

    if (order && !['asc', 'desc'].includes(order)) {
      errors.push('Sort order must be either "asc" or "desc"');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export all validators
export {
  SessionValidators,
  UserValidators,
  MessageValidators,
  ContextValidators,
  DataValidators,
};