/**
 * URL and content sanitization utilities for XSS prevention
 */

// Allowed URL protocols
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:'];

// Dangerous URL patterns to block
const DANGEROUS_PATTERNS = [
  /^javascript:/i,
  /^data:/i,
  /^vbscript:/i,
  /^file:/i,
];

/**
 * Validate and sanitize URLs to prevent XSS attacks
 * @param url - The URL to sanitize
 * @returns Sanitized URL or null if invalid/dangerous
 */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return null;
    }
  }

  // Try to parse as URL
  try {
    // Handle URLs without protocol
    const urlToParse = trimmed.match(/^https?:\/\//) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(urlToParse);

    // Verify protocol is allowed
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      return null;
    }

    // Return the original if it had a protocol, otherwise add https
    return trimmed.match(/^https?:\/\//) ? trimmed : `https://${trimmed}`;
  } catch {
    // If URL parsing fails, check if it looks like a valid domain
    if (trimmed.match(/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i)) {
      return `https://${trimmed}`;
    }
    return null;
  }
}

/**
 * Sanitize email addresses for mailto links
 * @param email - The email to validate
 * @returns Valid email or null
 */
export function sanitizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;

  const trimmed = email.trim();
  if (!trimmed) return null;

  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(trimmed)) {
    return null;
  }

  // Additional check for dangerous characters
  if (trimmed.includes('<') || trimmed.includes('>') || trimmed.includes('"')) {
    return null;
  }

  return trimmed;
}

/**
 * Sanitize phone numbers for tel links
 * @param phone - The phone number to validate
 * @returns Cleaned phone number or null
 */
export function sanitizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;

  const trimmed = phone.trim();
  if (!trimmed) return null;

  // Remove all non-digit characters except + for country code
  const cleaned = trimmed.replace(/[^\d+]/g, '');

  // Must have at least 7 digits (minimum for local numbers)
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    return null;
  }

  return cleaned;
}

/**
 * Sanitize HTML content (basic - strips all tags)
 * For rich text, consider using DOMPurify library
 * @param html - The HTML string to sanitize
 * @returns Plain text with HTML tags removed
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';

  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Sanitize text input to prevent XSS in displayed content
 * @param input - User input text
 * @returns Sanitized text safe for display
 */
export function sanitizeTextInput(input: string | null | undefined): string {
  if (!input) return '';

  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .trim();
}

/**
 * Encode special characters for use in URLs
 * @param value - The value to encode
 * @returns URL-encoded string
 */
export function encodeUrlParam(value: string): string {
  return encodeURIComponent(value);
}
