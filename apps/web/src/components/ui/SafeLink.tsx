import React from 'react';
import { sanitizeUrl, sanitizeEmail, sanitizePhone } from '../../lib/sanitize';
import { cn } from '../../lib/utils';

type LinkType = 'url' | 'email' | 'phone';

interface SafeLinkProps {
  href: string | null | undefined;
  type?: LinkType;
  children: React.ReactNode;
  className?: string;
  fallbackClassName?: string;
  showFallback?: boolean;
}

/**
 * SafeLink component that sanitizes URLs before rendering
 * Prevents XSS attacks from malicious URLs (javascript:, data:, etc.)
 *
 * @example
 * // URL link
 * <SafeLink href={account.website} type="url">Visit Website</SafeLink>
 *
 * // Email link
 * <SafeLink href={contact.email} type="email">{contact.email}</SafeLink>
 *
 * // Phone link
 * <SafeLink href={contact.phone} type="phone">{contact.phone}</SafeLink>
 */
export const SafeLink: React.FC<SafeLinkProps> = ({
  href,
  type = 'url',
  children,
  className,
  fallbackClassName,
  showFallback = true,
}) => {
  let sanitizedHref: string | null = null;

  switch (type) {
    case 'email': {
      const email = sanitizeEmail(href);
      sanitizedHref = email ? `mailto:${email}` : null;
      break;
    }
    case 'phone': {
      const phone = sanitizePhone(href);
      sanitizedHref = phone ? `tel:${phone}` : null;
      break;
    }
    default: {
      sanitizedHref = sanitizeUrl(href);
      break;
    }
  }

  // If URL is invalid or dangerous, render as plain text
  if (!sanitizedHref) {
    if (!showFallback) {
      return null;
    }
    return (
      <span className={cn(fallbackClassName || className)}>
        {children}
      </span>
    );
  }

  // Render safe link
  return (
    <a
      href={sanitizedHref}
      target={type === 'url' ? '_blank' : undefined}
      rel={type === 'url' ? 'noopener noreferrer' : undefined}
      className={cn(
        'text-primary-600 hover:text-primary-700 hover:underline dark:text-primary-400 dark:hover:text-primary-300',
        className
      )}
    >
      {children}
    </a>
  );
};

export default SafeLink;
