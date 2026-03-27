import crypto from 'crypto';

export function hashPublicToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function createPublicTokenPair(): {
  rawToken: string;
  hashedToken: string;
} {
  const rawToken = crypto.randomBytes(32).toString('hex');
  return {
    rawToken,
    hashedToken: hashPublicToken(rawToken),
  };
}
