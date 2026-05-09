/**
 * Shared validation utilities for both client and server
 */

/**
 * Password validation rules
 */
const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 128,
  requireLowercase: true,
  requireUppercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '@$!%*?&'
};

/**
 * Username validation rules
 */
const USERNAME_RULES = {
  minLength: 3,
  maxLength: 30,
  allowedPattern: /^[a-zA-Z0-9_-]+$/
};

/**
 * Email validation rules
 */
const EMAIL_RULES = {
  maxLength: 254,
  pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with isValid and errors
 */
function validatePassword(password) {
  const errors = [];
  
  if (!password) {
    return { isValid: false, errors: ['Password is required'] };
  }
  
  if (password.length < PASSWORD_RULES.minLength) {
    errors.push(`Password must be at least ${PASSWORD_RULES.minLength} characters`);
  }
  
  if (password.length > PASSWORD_RULES.maxLength) {
    errors.push(`Password must be less than ${PASSWORD_RULES.maxLength} characters`);
  }
  
  if (PASSWORD_RULES.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (PASSWORD_RULES.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (PASSWORD_RULES.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (PASSWORD_RULES.requireSpecialChars) {
    const specialCharRegex = new RegExp(`[${PASSWORD_RULES.specialChars.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`);
    if (!specialCharRegex.test(password)) {
      errors.push(`Password must contain at least one special character (${PASSWORD_RULES.specialChars})`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate username format
 * @param {string} username - Username to validate
 * @returns {Object} Validation result
 */
function validateUsername(username) {
  const errors = [];
  
  if (!username) {
    return { isValid: false, errors: ['Username is required'] };
  }
  
  if (username.length < USERNAME_RULES.minLength) {
    errors.push(`Username must be at least ${USERNAME_RULES.minLength} characters`);
  }
  
  if (username.length > USERNAME_RULES.maxLength) {
    errors.push(`Username must be less than ${USERNAME_RULES.maxLength} characters`);
  }
  
  if (!USERNAME_RULES.allowedPattern.test(username)) {
    errors.push('Username can only contain letters, numbers, underscores, and hyphens');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {Object} Validation result
 */
function validateEmail(email) {
  const errors = [];
  
  if (!email) {
    return { isValid: false, errors: ['Email is required'] };
  }
  
  if (email.length > EMAIL_RULES.maxLength) {
    errors.push(`Email must be less than ${EMAIL_RULES.maxLength} characters`);
  }
  
  if (!EMAIL_RULES.pattern.test(email)) {
    errors.push('Please enter a valid email address');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Create Zod schema for password validation (client-side)
 * @returns {z.ZodString} Zod schema
 */
function createPasswordSchema() {
  if (typeof window !== 'undefined' && window.z) {
    const { z } = window;
    return z.string().refine((password) => {
      const result = validatePassword(password);
      return result.isValid;
    }, {
      message: 'Password does not meet security requirements'
    });
  }
  return null;
}

module.exports = {
  PASSWORD_RULES,
  USERNAME_RULES,
  EMAIL_RULES,
  validatePassword,
  validateUsername,
  validateEmail,
  createPasswordSchema
};