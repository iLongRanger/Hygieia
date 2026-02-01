import { describe, it, expect } from '@jest/globals';
import {
  passwordSchema,
  validatePassword,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  PASSWORD_REQUIREMENTS,
} from '../passwordPolicy';

describe('passwordPolicy', () => {
  describe('constants', () => {
    it('should have correct minimum length', () => {
      expect(MIN_PASSWORD_LENGTH).toBe(8);
    });

    it('should have correct maximum length', () => {
      expect(MAX_PASSWORD_LENGTH).toBe(128);
    });

    it('should have password requirements defined', () => {
      expect(PASSWORD_REQUIREMENTS).toHaveLength(4);
      expect(PASSWORD_REQUIREMENTS).toContain('At least 8 characters');
    });
  });

  describe('passwordSchema', () => {
    it('should accept valid password with all requirements', () => {
      const validPassword = 'StrongPass123';
      const result = passwordSchema.safeParse(validPassword);
      expect(result.success).toBe(true);
    });

    it('should reject password shorter than minimum length', () => {
      const shortPassword = 'Pass1';
      const result = passwordSchema.safeParse(shortPassword);
      expect(result.success).toBe(false);
    });

    it('should reject password without uppercase', () => {
      const noUppercase = 'weakpassword123';
      const result = passwordSchema.safeParse(noUppercase);
      expect(result.success).toBe(false);
    });

    it('should reject password without lowercase', () => {
      const noLowercase = 'WEAKPASSWORD123';
      const result = passwordSchema.safeParse(noLowercase);
      expect(result.success).toBe(false);
    });

    it('should reject password without number', () => {
      const noNumber = 'WeakPassword';
      const result = passwordSchema.safeParse(noNumber);
      expect(result.success).toBe(false);
    });

    it('should reject password that is too long', () => {
      const longPassword = 'Aa1' + 'x'.repeat(130);
      const result = passwordSchema.safeParse(longPassword);
      expect(result.success).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should return isValid true for valid password', () => {
      const result = validatePassword('ValidPass123');
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return isValid false with error for invalid password', () => {
      const result = validatePassword('weak');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return specific error for missing uppercase', () => {
      const result = validatePassword('weakpassword123');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('uppercase');
    });

    it('should return specific error for missing lowercase', () => {
      const result = validatePassword('WEAKPASSWORD123');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('lowercase');
    });

    it('should return specific error for missing number', () => {
      const result = validatePassword('WeakPassword');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('number');
    });

    it('should return specific error for short password', () => {
      const result = validatePassword('Aa1');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('8 characters');
    });
  });

  describe('edge cases', () => {
    it('should accept password with special characters', () => {
      const result = validatePassword('StrongPass123!@#');
      expect(result.isValid).toBe(true);
    });

    it('should accept password with spaces', () => {
      const result = validatePassword('Strong Pass 123');
      expect(result.isValid).toBe(true);
    });

    it('should accept password with unicode characters', () => {
      const result = validatePassword('StrongPass123éü');
      expect(result.isValid).toBe(true);
    });

    it('should accept minimum length password', () => {
      const result = validatePassword('Aa1aaaaa'); // exactly 8 chars
      expect(result.isValid).toBe(true);
    });
  });
});
