/**
 * HTML Sanitization and Security utilities
 * Prevents XSS attacks in user-generated and AI-generated content
 */

// Safe HTML entities map
const htmlEntityMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;'
};

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} HTML-escaped text
 */
export function escapeHtml(text) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/[&<>"'/]/g, char => htmlEntityMap[char]);
}

/**
 * Sanitize and render markdown-like formatting safely
 * Supports: **bold**, > blockquotes, \n\n paragraphs, \n line breaks
 * @param {string} text - Raw text to render
 * @returns {string} Safe HTML string
 */
export function renderSafeMarkdown(text) {
  if (!text || typeof text !== 'string') return '';
  
  // Step 1: Escape HTML to prevent injection
  let safe = escapeHtml(text);
  
  // Step 2: Apply safe formatting AFTER escaping
  safe = safe
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  
  if (safe && !safe.startsWith('<p>') && !safe.startsWith('<blockquote>')) {
    safe = '<p>' + safe + '</p>';
  }
  
  return safe;
}

/**
 * Validate and sanitize user input for AI queries
 * @param {string} input - User input
 * @returns {object} {valid: boolean, message: string, error?: string}
 */
export function sanitizeUserInput(input) {
  if (!input || typeof input !== 'string') {
    return { valid: false, message: '', error: 'Input must be a string' };
  }
  
  const trimmed = input.trim();
  
  if (trimmed.length === 0) {
    return { valid: false, message: '', error: 'Message cannot be empty' };
  }
  
  if (trimmed.length > 3000) {
    return { valid: false, message: '', error: 'Message is too long (max 3000 chars)' };
  }
  
  // Check for suspicious patterns (but allow normal scripture references)
  const suspicious = /<script|onerror|onclick|onload|javascript:/i;
  if (suspicious.test(trimmed)) {
    return { valid: false, message: '', error: 'Input contains invalid characters' };
  }
  
  return { valid: true, message: trimmed };
}

/**
 * Sanitize AI response before display
 * Removes any injected scripts while preserving formatting
 * @param {string} response - AI response text
 * @returns {string} Sanitized response
 */
export function sanitizeAIResponse(response) {
  if (!response || typeof response !== 'string') return '';
  
  // Remove script tags completely
  let sanitized = response.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers (quoted, backtick, and unquoted variants)
  sanitized = sanitized.replace(/on\w+\s*=\s*["'`][^"'`]*["'`]/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');
  
  // Remove dangerous tags and javascript: URLs
  sanitized = sanitized.replace(/<iframe\b[^>]*>/gi, '');
  sanitized = sanitized.replace(/<\/iframe>/gi, '');
  sanitized = sanitized.replace(/<object\b[^>]*>/gi, '');
  sanitized = sanitized.replace(/<\/object>/gi, '');
  sanitized = sanitized.replace(/<embed\b[^>]*>/gi, '');
  sanitized = sanitized.replace(/<\/embed>/gi, '');
  sanitized = sanitized.replace(/<svg\s+onload\b[^>]*>/gi, '');
  sanitized = sanitized.replace(/href\s*=\s*(?:["'`])?\s*javascript\s*:/gi, '');
  
  return sanitized;
}

/**
 * Create a safe React prop for dangerouslySetInnerHTML
 * Must be used with content that's been properly escaped
 * @param {string} html - Pre-sanitized HTML
 * @returns {object} React dangerouslySetInnerHTML prop
 */
export function createSafeHtmlProp(html) {
  return { __html: html };
}

/**
 * Validate devotional input before submission
 * @param {string} topic - Devotional topic
 * @param {number} days - Number of days
 * @param {string} style - Style preference
 * @returns {object} Validation result
 */
export function validateDevotionalInput(topic, days, style) {
  const errors = [];
  
  if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
    errors.push('Topic is required');
  }
  
  if (topic && topic.length > 200) {
    errors.push('Topic is too long (max 200 chars)');
  }
  
  if (!Number.isInteger(days) || days < 3 || days > 30) {
    errors.push('Duration must be between 3 and 30 days');
  }
  
  if (!style || typeof style !== 'string' || style.length > 100) {
    errors.push('Style is invalid');
  }
  
  const suspiciousPattern = /<script|onerror|onclick/i;
  if (suspiciousPattern.test(topic) || suspiciousPattern.test(style)) {
    errors.push('Input contains invalid characters');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    sanitizedTopic: topic.trim(),
    sanitizedStyle: style.trim()
  };
}

export default {
  escapeHtml,
  renderSafeMarkdown,
  sanitizeUserInput,
  sanitizeAIResponse,
  createSafeHtmlProp,
  validateDevotionalInput
};
