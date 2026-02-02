import { describe, it, expect } from 'vitest';
import {
  sanitizeUrl,
  sanitizeEmail,
  sanitizePhone,
  sanitizeHtml,
  sanitizeTextInput,
} from '../sanitize';

describe('sanitize utilities', () => {
  describe('sanitizeUrl', () => {
    it('should return null for empty input', () => {
      expect(sanitizeUrl(null)).toBeNull();
      expect(sanitizeUrl(undefined)).toBeNull();
      expect(sanitizeUrl('')).toBeNull();
      expect(sanitizeUrl('   ')).toBeNull();
    });

    it('should block javascript: URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
      expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBeNull();
      expect(sanitizeUrl('javascript:void(0)')).toBeNull();
    });

    it('should block data: URLs', () => {
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
      expect(sanitizeUrl('DATA:text/html,test')).toBeNull();
    });

    it('should block vbscript: URLs', () => {
      expect(sanitizeUrl('vbscript:msgbox("xss")')).toBeNull();
    });

    it('should block file: URLs', () => {
      expect(sanitizeUrl('file:///etc/passwd')).toBeNull();
    });

    it('should allow valid http URLs', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
      expect(sanitizeUrl('http://example.com/path')).toBe('http://example.com/path');
    });

    it('should allow valid https URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
      expect(sanitizeUrl('https://sub.example.com/path?query=1')).toBe(
        'https://sub.example.com/path?query=1'
      );
    });

    it('should add https to URLs without protocol', () => {
      expect(sanitizeUrl('example.com')).toBe('https://example.com');
      expect(sanitizeUrl('www.example.com')).toBe('https://www.example.com');
    });

    it('should handle URLs with special characters', () => {
      const url = 'https://example.com/path?q=test&foo=bar#section';
      expect(sanitizeUrl(url)).toBe(url);
    });
  });

  describe('sanitizeEmail', () => {
    it('should return null for empty input', () => {
      expect(sanitizeEmail(null)).toBeNull();
      expect(sanitizeEmail(undefined)).toBeNull();
      expect(sanitizeEmail('')).toBeNull();
    });

    it('should validate correct email formats', () => {
      expect(sanitizeEmail('test@example.com')).toBe('test@example.com');
      expect(sanitizeEmail('user.name@domain.co.uk')).toBe('user.name@domain.co.uk');
      expect(sanitizeEmail('user+tag@example.com')).toBe('user+tag@example.com');
    });

    it('should reject invalid email formats', () => {
      expect(sanitizeEmail('notanemail')).toBeNull();
      expect(sanitizeEmail('@example.com')).toBeNull();
      expect(sanitizeEmail('user@')).toBeNull();
      expect(sanitizeEmail('user@.com')).toBeNull();
    });

    it('should reject emails with dangerous characters', () => {
      expect(sanitizeEmail('user<script>@example.com')).toBeNull();
      expect(sanitizeEmail('user">@example.com')).toBeNull();
    });

    it('should trim whitespace', () => {
      expect(sanitizeEmail('  test@example.com  ')).toBe('test@example.com');
    });
  });

  describe('sanitizePhone', () => {
    it('should return null for empty input', () => {
      expect(sanitizePhone(null)).toBeNull();
      expect(sanitizePhone(undefined)).toBeNull();
      expect(sanitizePhone('')).toBeNull();
    });

    it('should accept valid phone numbers', () => {
      expect(sanitizePhone('1234567')).toBe('1234567');
      expect(sanitizePhone('+1-555-123-4567')).toBe('+15551234567');
      expect(sanitizePhone('(555) 123-4567')).toBe('5551234567');
    });

    it('should reject too short numbers', () => {
      expect(sanitizePhone('123')).toBeNull();
      expect(sanitizePhone('12345')).toBeNull();
    });

    it('should reject too long numbers', () => {
      expect(sanitizePhone('1234567890123456')).toBeNull();
    });

    it('should strip non-digit characters except +', () => {
      expect(sanitizePhone('+1 (555) 123-4567')).toBe('+15551234567');
    });
  });

  describe('sanitizeHtml', () => {
    it('should return empty string for empty input', () => {
      expect(sanitizeHtml(null)).toBe('');
      expect(sanitizeHtml(undefined)).toBe('');
      expect(sanitizeHtml('')).toBe('');
    });

    it('should strip HTML tags', () => {
      expect(sanitizeHtml('<script>alert(1)</script>')).toBe('alert(1)');
      expect(sanitizeHtml('<p>Hello</p>')).toBe('Hello');
      expect(sanitizeHtml('<div><b>Bold</b></div>')).toBe('Bold');
    });

    it('should decode HTML entities', () => {
      expect(sanitizeHtml('&lt;script&gt;')).toBe('<script>');
      expect(sanitizeHtml('&amp;')).toBe('&');
      expect(sanitizeHtml('&quot;')).toBe('"');
    });
  });

  describe('sanitizeTextInput', () => {
    it('should return empty string for empty input', () => {
      expect(sanitizeTextInput(null)).toBe('');
      expect(sanitizeTextInput(undefined)).toBe('');
      expect(sanitizeTextInput('')).toBe('');
    });

    it('should encode HTML special characters', () => {
      expect(sanitizeTextInput('<script>')).toBe('&lt;script&gt;');
      expect(sanitizeTextInput('"test"')).toBe('&quot;test&quot;');
      expect(sanitizeTextInput("it's")).toBe("it&#39;s");
    });

    it('should trim whitespace', () => {
      expect(sanitizeTextInput('  hello world  ')).toBe('hello world');
    });
  });
});
