/**
 * validators.js - Enterprise-grade validation utilities for n8n workflows
 * Version: 2.0.0
 * 
 * Provides comprehensive validation and data processing utilities:
 * - Input validation (email, phone, CNPJ, URLs)
 * - Schema validation (Joi-based)
 * - Data sanitization (XSS, SQL injection prevention)
 * - Business logic (lead scoring, currency formatting)
 * - Logging utilities
 */

const Joi = require('joi');
const { format } = require('date-fns');

// ============================================================================
// BASIC VALIDATORS
// ============================================================================

/**
 * Validates email format (RFC 5322 compliant)
 * @param {string} email - Email address to validate
 * @returns {boolean} True if valid
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  return emailRegex.test(email) && email.length <= 254;
};

/**
 * Validates phone number (international format)
 * Accepts: +55 11 98765-4321, (11) 98765-4321, 11987654321, +1-555-123-4567
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid
 */
const validatePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  
  // Remove all non-digit characters for length check
  const cleanPhone = phone.replace(/[\s\-()]/g, '');
  
  // Must have 10-15 digits
  if (cleanPhone.length < 10 || cleanPhone.length > 15) return false;
  
  // Must contain only valid characters
  const phoneRegex = /^[\d\s\-+()]+$/;
  return phoneRegex.test(phone);
};

/**
 * Validates URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
const validateURL = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

/**
 * Validates CNPJ (Brazilian company registration number)
 * @param {string} cnpj - CNPJ to validate
 * @returns {boolean} True if valid
 */
const validateCNPJ = (cnpj) => {
  if (!cnpj || typeof cnpj !== 'string') return false;
  
  cnpj = cnpj.replace(/[^\d]/g, '');
  
  if (cnpj.length !== 14) return false;
  
  // Check for known invalid CNPJs (all digits the same)
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  
  // First verification digit
  let size = cnpj.length - 2;
  let numbers = cnpj.substring(0, size);
  const digits = cnpj.substring(size);
  let sum = 0;
  let pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += numbers.charAt(size - i) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result != digits.charAt(0)) return false;
  
  // Second verification digit
  size = size + 1;
  numbers = cnpj.substring(0, size);
  sum = 0;
  pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += numbers.charAt(size - i) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return result == digits.charAt(1);
};

/**
 * Validates CPF (Brazilian individual taxpayer number)
 * @param {string} cpf - CPF to validate
 * @returns {boolean} True if valid
 */
const validateCPF = (cpf) => {
  if (!cpf || typeof cpf !== 'string') return false;
  
  cpf = cpf.replace(/[^\d]/g, '');
  
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  
  // First verification digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let result = (sum * 10) % 11;
  if (result === 10) result = 0;
  if (result != cpf.charAt(9)) return false;
  
  // Second verification digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  result = (sum * 10) % 11;
  if (result === 10) result = 0;
  return result == cpf.charAt(10);
};

/**
 * Validates required fields in object
 * @param {Object} data - Data object to validate
 * @param {Array<string>} required - Array of required field names
 * @returns {Object} { valid: boolean, missing: Array<string> }
 */
const validateRequiredFields = (data, required) => {
  const missing = required.filter(field => {
    const value = data[field];
    return value === undefined || value === null || value === '';
  });
  
  return {
    valid: missing.length === 0,
    missing: missing
  };
};

// ============================================================================
// DATA SANITIZATION
// ============================================================================

/**
 * Sanitizes data by removing dangerous characters and patterns
 * Prevents XSS, SQL injection, and other attacks
 * @param {*} data - Data to sanitize (can be string, object, array)
 * @returns {*} Sanitized data
 */
const sanitizeData = (data) => {
  if (data === null || data === undefined) return data;
  
  if (typeof data === 'string') {
    return data
      // Remove script tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove event handlers
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      // Remove javascript: protocol
      .replace(/javascript:/gi, '')
      // Remove common SQL injection patterns
      .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi, '')
      // Escape dangerous characters
      .replace(/[<>]/g, (char) => ({ '<': '&lt;', '>': '&gt;' }[char]))
      .trim();
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }
  
  if (typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeData(value);
    }
    return sanitized;
  }
  
  return data;
};

/**
 * Sanitizes HTML content while preserving safe tags
 * @param {string} html - HTML content to sanitize
 * @returns {string} Sanitized HTML
 */
const sanitizeHTML = (html) => {
  if (!html || typeof html !== 'string') return '';
  
  // Allow only safe tags
  const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img'];
  const tagRegex = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
  
  return html.replace(tagRegex, (match, tag) => {
    return allowedTags.includes(tag.toLowerCase()) ? match : '';
  });
};

// ============================================================================
// SCHEMA VALIDATORS (Joi-based)
// ============================================================================

/**
 * Validates lead data schema
 * @param {Object} lead - Lead data to validate
 * @returns {Object} Joi validation result { error, value }
 */
const validateLeadSchema = (lead) => {
  const schema = Joi.object({
    name: Joi.string().min(3).max(100).required()
      .messages({
        'string.min': 'Nome deve ter pelo menos 3 caracteres',
        'string.max': 'Nome deve ter no máximo 100 caracteres',
        'any.required': 'Nome é obrigatório'
      }),
    
    email: Joi.string().email().required()
      .messages({
        'string.email': 'Email inválido',
        'any.required': 'Email é obrigatório'
      }),
    
    phone: Joi.string().pattern(/^[\d\s\-+()]{10,}$/).required()
      .messages({
        'string.pattern.base': 'Telefone inválido',
        'any.required': 'Telefone é obrigatório'
      }),
    
    company: Joi.string().max(100).optional().allow(''),
    position: Joi.string().max(100).optional().allow(''),
    
    source: Joi.string()
      .valid('website', 'referral', 'cold_call', 'event', 'social_media', 'other')
      .default('other')
      .messages({
        'any.only': 'Fonte inválida'
      }),
    
    score: Joi.number().min(0).max(100).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    customFields: Joi.object().optional()
  });
  
  return schema.validate(lead, { abortEarly: false });
};

/**
 * Validates financial transaction data
 * @param {Object} transaction - Transaction data
 * @returns {Object} Joi validation result
 */
const validateTransactionSchema = (transaction) => {
  const schema = Joi.object({
    type: Joi.string()
      .valid('income', 'expense', 'transfer')
      .required()
      .messages({
        'any.required': 'Tipo de transação é obrigatório',
        'any.only': 'Tipo deve ser: income, expense ou transfer'
      }),
    
    amount: Joi.number()
      .positive()
      .precision(2)
      .required()
      .messages({
        'number.positive': 'Valor deve ser positivo',
        'any.required': 'Valor é obrigatório'
      }),
    
    currency: Joi.string()
      .length(3)
      .uppercase()
      .default('BRL')
      .messages({
        'string.length': 'Moeda deve ter 3 caracteres (ex: BRL, USD)'
      }),
    
    description: Joi.string()
      .max(500)
      .required()
      .messages({
        'string.max': 'Descrição deve ter no máximo 500 caracteres',
        'any.required': 'Descrição é obrigatória'
      }),
    
    category: Joi.string().required(),
    
    date: Joi.date().iso().required()
      .messages({
        'date.format': 'Data deve estar no formato ISO (YYYY-MM-DD)',
        'any.required': 'Data é obrigatória'
      }),
    
    paymentMethod: Joi.string().optional(),
    reference: Joi.string().optional(),
    tags: Joi.array().items(Joi.string()).optional()
  });
  
  return schema.validate(transaction, { abortEarly: false });
};

/**
 * Validates task data schema
 * @param {Object} task - Task data
 * @returns {Object} Joi validation result
 */
const validateTaskSchema = (task) => {
  const schema = Joi.object({
    title: Joi.string().min(5).max(200).required(),
    description: Joi.string().max(2000).optional().allow(''),
    assignee: Joi.string().default('unassigned'),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
    status: Joi.string().valid('todo', 'in_progress', 'review', 'done').default('todo'),
    dueDate: Joi.date().iso().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    project: Joi.string().default('general')
  });
  
  return schema.validate(task, { abortEarly: false });
};

// ============================================================================
// BUSINESS LOGIC
// ============================================================================

/**
 * Calculates lead score based on multiple factors
 * Returns a score from 0-100
 * @param {Object} lead - Lead data
 * @returns {number} Score from 0-100
 */
const calculateLeadScore = (lead) => {
  let score = 0;
  
  // Email domain scoring (20 points)
  if (lead.email) {
    const domain = lead.email.split('@')[1];
    const freeEmailDomains = [
      'gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com',
      'live.com', 'aol.com', 'icloud.com', 'protonmail.com'
    ];
    
    if (!freeEmailDomains.includes(domain?.toLowerCase())) {
      score += 20; // Corporate email
    } else {
      score += 5; // Free email
    }
  }
  
  // Company presence (15 points)
  if (lead.company && lead.company.trim() !== '' && lead.company.toLowerCase() !== 'não informado') {
    score += 15;
  }
  
  // Position/title scoring (25 points)
  if (lead.position) {
    const position = lead.position.toLowerCase();
    const seniorTitles = ['ceo', 'cto', 'cfo', 'coo', 'director', 'diretor', 'manager', 'gerente', 'head', 'vp', 'presidente'];
    const midTitles = ['coordenador', 'coordinator', 'supervisor', 'analista', 'analyst', 'specialist', 'especialista'];
    
    const isSenior = seniorTitles.some(title => position.includes(title));
    const isMid = midTitles.some(title => position.includes(title));
    
    if (isSenior) score += 25;
    else if (isMid) score += 15;
    else score += 5;
  }
  
  // Phone provided (15 points)
  if (lead.phone && validatePhone(lead.phone)) {
    score += 15;
  }
  
  // Source quality (25 points)
  const sourceScores = {
    'referral': 25,
    'event': 20,
    'website': 15,
    'social_media': 12,
    'cold_call': 8,
    'other': 5
  };
  score += sourceScores[lead.source] || 5;
  
  // Bonus for complete profile
  const fieldsProvided = [lead.name, lead.email, lead.phone, lead.company, lead.position].filter(Boolean).length;
  if (fieldsProvided === 5) {
    score += 10; // Bonus for complete information
  }
  
  return Math.min(Math.round(score), 100);
};

/**
 * Checks if current time is within business hours
 * @param {Date} date - Date to check (defaults to now)
 * @returns {boolean} True if within business hours
 */
const isBusinessHours = (date = new Date()) => {
  const hour = date.getHours();
  const day = date.getDay();
  
  const startHour = parseInt(process.env.WORKING_HOURS_START?.split(':')[0] || '9');
  const endHour = parseInt(process.env.WORKING_HOURS_END?.split(':')[0] || '18');
  
  // Check if weekend (0 = Sunday, 6 = Saturday)
  if (day === 0 || day === 6) return false;
  
  // Check if within working hours
  return hour >= startHour && hour < endHour;
};

/**
 * Formats currency value
 * @param {number|string} value - Value to format
 * @param {string} currency - Currency code (default: BRL)
 * @returns {string} Formatted currency string
 */
const formatCurrency = (value, currency = 'BRL') => {
  const number = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(number)) {
    throw new Error('Invalid currency value');
  }
  
  const locale = currency === 'BRL' ? 'pt-BR' : currency === 'USD' ? 'en-US' : 'en-US';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency
  }).format(number);
};

/**
 * Formats date to Brazilian format
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
const formatDate = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'dd/MM/yyyy HH:mm');
};

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

/**
 * Logs operation with structured format
 * @param {string} workflow - Workflow identifier
 * @param {string} status - Operation status (success/error/warning/info)
 * @param {Object|string} details - Additional details
 */
const logOperation = (workflow, status, details) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    workflow,
    status: status.toUpperCase(),
    details: typeof details === 'object' ? details : { message: details }
  };
  
  // Color-coded console output
  const colors = {
    SUCCESS: '\x1b[32m',
    ERROR: '\x1b[31m',
    WARNING: '\x1b[33m',
    INFO: '\x1b[36m',
    RESET: '\x1b[0m'
  };
  
  const color = colors[status.toUpperCase()] || colors.INFO;
  console.log(`${color}[${timestamp}] ${workflow} - ${status.toUpperCase()}${colors.RESET}`);
  console.log(JSON.stringify(logEntry.details, null, 2));
  
  // Optional: Send to external logging service
  if (process.env.ENABLE_AUDIT_LOGS === 'true') {
    // Implementation for external logging (e.g., Notion, database)
    // This would be called by n8n workflows
  }
};

/**
 * Error handler wrapper for async functions
 * Provides automatic error logging and rethrowing
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function with error handling
 */
const asyncErrorHandler = (fn) => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      logOperation('ERROR_HANDLER', 'error', {
        function: fn.name,
        error: error.message,
        stack: error.stack,
        args: args
      });
      throw error;
    }
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Basic validators
  validateEmail,
  validatePhone,
  validateURL,
  validateCNPJ,
  validateCPF,
  validateRequiredFields,
  
  // Schema validators
  validateLeadSchema,
  validateTransactionSchema,
  validateTaskSchema,
  
  // Data processing
  sanitizeData,
  sanitizeHTML,
  calculateLeadScore,
  formatCurrency,
  formatDate,
  
  // Business logic
  isBusinessHours,
  
  // Utilities
  logOperation,
  asyncErrorHandler
};
