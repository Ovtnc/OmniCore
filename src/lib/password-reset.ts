import crypto from 'crypto';

const RESET_PREFIX = 'password-reset:';
const RESET_TTL_MS = 1000 * 60 * 30; // 30 dakika

export function makeResetIdentifier(email: string): string {
  return `${RESET_PREFIX}${email.trim().toLowerCase()}`;
}

export function isPasswordResetIdentifier(identifier: string): boolean {
  return identifier.startsWith(RESET_PREFIX);
}

export function emailFromResetIdentifier(identifier: string): string | null {
  if (!isPasswordResetIdentifier(identifier)) return null;
  const email = identifier.slice(RESET_PREFIX.length).trim().toLowerCase();
  return email || null;
}

export function generateRawResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashResetToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function resetTokenExpiresAt(): Date {
  return new Date(Date.now() + RESET_TTL_MS);
}

