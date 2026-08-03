/**
 * AES-256-GCM token encryption/decryption. (SETUP.md §9)
 * Tokens are encrypted at rest; only the encrypted value is stored in the DB.
 *
 * ENCRYPTION_KEY must be a 32-byte base64-encoded string.
 * Generate: openssl rand -base64 32
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const keyBase64 = process.env.ENCRYPTION_KEY;
  if (!keyBase64) throw new Error('ENCRYPTION_KEY env var is not set');
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== 32)
    throw new Error('ENCRYPTION_KEY must be 32 bytes (base64-encoded)');
  return key;
}

/**
 * Encrypts a plaintext string.
 * Returns a base64 string: iv (12 bytes) + authTag (16 bytes) + ciphertext
 */
export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

/**
 * Decrypts a base64 string produced by encryptToken.
 */
export function decryptToken(ciphertext: string): string {
  const key = getKey();
  const buf = Buffer.from(ciphertext, 'base64');
  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8');
}
