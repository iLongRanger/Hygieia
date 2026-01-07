import { Algorithm } from 'jsonwebtoken';

export interface JwtConfig {
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
  algorithm: Algorithm;
  issuer: string;
  audience: string;
  clockTolerance: number;
}

export const jwtConfig: JwtConfig = {
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
  algorithm: 'HS256',
  issuer: 'hygieia-platform',
  audience: 'hygieia-api',
  clockTolerance: 30,
};

export function getJwtSecret(): string {
  const secret = process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'JWT_SECRET or SUPABASE_JWT_SECRET environment variable is required'
    );
  }
  return secret;
}
