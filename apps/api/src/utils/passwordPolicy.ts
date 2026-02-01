import { z } from 'zod';

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;

/**
 * Centralized password validation schema.
 * Requirements:
 * - Minimum 8 characters
 * - Maximum 128 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(MAX_PASSWORD_LENGTH, `Password must be at most ${MAX_PASSWORD_LENGTH} characters`)
  .refine((val) => /[A-Z]/.test(val), {
    message: 'Password must contain at least one uppercase letter',
  })
  .refine((val) => /[a-z]/.test(val), {
    message: 'Password must contain at least one lowercase letter',
  })
  .refine((val) => /[0-9]/.test(val), {
    message: 'Password must contain at least one number',
  });

/**
 * Validates a password against the policy.
 * Returns an object with isValid and optional error message.
 */
export function validatePassword(password: string): {
  isValid: boolean;
  error?: string;
} {
  const result = passwordSchema.safeParse(password);
  if (result.success) {
    return { isValid: true };
  }
  return {
    isValid: false,
    error: result.error.errors[0]?.message || 'Invalid password',
  };
}

/**
 * Password requirements as human-readable text.
 */
export const PASSWORD_REQUIREMENTS = [
  `At least ${MIN_PASSWORD_LENGTH} characters`,
  'At least one uppercase letter',
  'At least one lowercase letter',
  'At least one number',
];
