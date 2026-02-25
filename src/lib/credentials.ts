/**
 * Pazaryeri API anahtarlarını şifreleyip çözmek için.
 * ENCRYPTION_KEY: 32 byte hex (64 karakter) veya 32 karakter string (AES-256).
 * Örnek: openssl rand -hex 32
 */

import crypto from 'crypto';

const ALG = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw || raw.length < 16) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY ortam değişkeni production için zorunludur (32 byte hex veya 32+ karakter).');
    }
    return crypto.scryptSync('omnicore-dev-fallback-key', 'salt', KEY_LENGTH);
  }
  if (raw.length === 64 && /^[0-9a-fA-F]+$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  return crypto.createHash('sha256').update(raw).digest();
}

/**
 * Düz metni şifreler; DB'ye yazılacak string döner (iv:authTag:cipher hex).
 */
export function encryptCredentials(plain: string | null | undefined): string | null {
  if (plain == null || plain === '') return null;
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALG, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

/**
 * DB'den okunan şifreli string'i çözer.
 * Format düz string ise (eski kayıt) olduğu gibi döner; yoksa decrypt eder.
 */
export function decryptCredentials(encrypted: string | null | undefined): string | null {
  if (encrypted == null || encrypted === '') return null;
  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    return encrypted;
  }
  try {
    const key = getKey();
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const cipher = Buffer.from(parts[2], 'hex');
    const decipher = crypto.createDecipheriv(ALG, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    decipher.setAuthTag(tag);
    return decipher.update(cipher).toString('utf8') + decipher.final('utf8');
  } catch {
    return encrypted;
  }
}
