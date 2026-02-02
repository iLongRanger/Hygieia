/**
 * Validation utilities for form inputs
 */

// Validation patterns
export const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\d\s\-\+\(\)\.]+$/,
  url: /^(https?:\/\/)?([\w\-]+\.)+[\w\-]+(\/[\w\-._~:/?#[\]@!$&'()*+,;=%]*)?$/,
  postalCode: /^[A-Za-z\d\s\-]+$/,
  numeric: /^\d+$/,
  decimal: /^\d+(\.\d{1,2})?$/,
};

// Max lengths for common fields
export const maxLengths = {
  // Names
  name: 100,
  fullName: 100,
  companyName: 150,
  title: 200,

  // Contact info
  email: 254,
  phone: 20,

  // URLs
  url: 500,
  website: 500,

  // Address fields
  street: 200,
  city: 100,
  state: 50,
  postalCode: 20,
  country: 100,

  // Text areas
  notes: 2000,
  description: 1000,
  accessInstructions: 1000,
  terms: 5000,

  // Other
  industry: 100,
  buildingType: 50,
  lostReason: 500,
};

/**
 * Validates an email address
 */
export function validateEmail(email: string): boolean {
  if (!email) return true; // Empty is valid (use required for mandatory)
  return patterns.email.test(email.trim());
}

/**
 * Validates a phone number (basic format check)
 */
export function validatePhone(phone: string): boolean {
  if (!phone) return true;
  return patterns.phone.test(phone.trim()) && phone.trim().length >= 7;
}

/**
 * Validates a URL
 */
export function validateUrl(url: string): boolean {
  if (!url) return true;
  return patterns.url.test(url.trim());
}

/**
 * Validates a postal code
 */
export function validatePostalCode(postalCode: string): boolean {
  if (!postalCode) return true;
  return patterns.postalCode.test(postalCode.trim());
}

/**
 * Validates a required field
 * @returns Error message or null if valid
 */
export function validateRequired(value: string | null | undefined, fieldName: string): string | null {
  if (!value || value.trim() === '') {
    return `${fieldName} is required`;
  }
  return null;
}

/**
 * Validates a numeric value is within range
 */
export function validateNumericRange(
  value: number | null | undefined,
  min?: number,
  max?: number,
  fieldName?: string
): string | null {
  if (value === null || value === undefined) return null;

  if (min !== undefined && value < min) {
    return `${fieldName || 'Value'} must be at least ${min}`;
  }
  if (max !== undefined && value > max) {
    return `${fieldName || 'Value'} must be at most ${max}`;
  }
  return null;
}

/**
 * Validates text length
 */
export function validateLength(
  value: string | null | undefined,
  maxLength: number,
  fieldName?: string
): string | null {
  if (!value) return null;
  if (value.length > maxLength) {
    return `${fieldName || 'Field'} must be ${maxLength} characters or less`;
  }
  return null;
}

/**
 * Validates that end date is after start date
 */
export function validateDateRange(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined
): string | null {
  if (!startDate || !endDate) return null;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (end <= start) {
    return 'End date must be after start date';
  }
  return null;
}

/**
 * Form validation helper - validates multiple fields
 * @returns Array of error messages, empty if all valid
 */
export function validateForm(validations: Array<string | null>): string[] {
  return validations.filter((error): error is string => error !== null);
}

/**
 * Gets validation error for email field
 */
export function getEmailError(email: string | null | undefined, required = false): string | null {
  if (required && (!email || email.trim() === '')) {
    return 'Email is required';
  }
  if (email && !validateEmail(email)) {
    return 'Please enter a valid email address';
  }
  return null;
}

/**
 * Gets validation error for phone field
 */
export function getPhoneError(phone: string | null | undefined, required = false): string | null {
  if (required && (!phone || phone.trim() === '')) {
    return 'Phone is required';
  }
  if (phone && !validatePhone(phone)) {
    return 'Please enter a valid phone number';
  }
  return null;
}

/**
 * Gets validation error for URL field
 */
export function getUrlError(url: string | null | undefined, required = false): string | null {
  if (required && (!url || url.trim() === '')) {
    return 'URL is required';
  }
  if (url && !validateUrl(url)) {
    return 'Please enter a valid URL';
  }
  return null;
}

// Password validation constants
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Password validation rules
 */
export const passwordRules = {
  minLength: PASSWORD_MIN_LENGTH,
  maxLength: PASSWORD_MAX_LENGTH,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
};

/**
 * Validates password strength
 * @returns Object with valid flag and error messages
 */
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!password) {
    return { valid: false, errors: ['Password is required'] };
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    errors.push(`Password must be at most ${PASSWORD_MAX_LENGTH} characters`);
  }

  if (passwordRules.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (passwordRules.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (passwordRules.requireNumber && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Gets validation error for password field (returns first error)
 */
export function getPasswordError(
  password: string | null | undefined,
  required = true
): string | null {
  if (required && (!password || password.trim() === '')) {
    return 'Password is required';
  }

  if (password) {
    const { valid, errors } = validatePassword(password);
    if (!valid) {
      return errors[0] || 'Invalid password';
    }
  }

  return null;
}

/**
 * Validates password confirmation matches
 */
export function validatePasswordMatch(
  password: string | null | undefined,
  confirmPassword: string | null | undefined
): string | null {
  if (!password || !confirmPassword) return null;

  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }

  return null;
}
