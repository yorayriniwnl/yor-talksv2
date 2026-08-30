import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = "v1";
const IV_BYTES = 12;
const KEY_BYTES = 32;

function keyFromSecret(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest();
}

function encode(value: Buffer): string {
  return value.toString("base64url");
}

function decode(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

export type DecryptedSecret = { secret: string; needsMigration: boolean };

/** Encrypts small secrets (such as TOTP seeds) for storage at rest. */
export function encryptSecret(secret: string, encryptionKey: string): string {
  const key = keyFromSecret(encryptionKey);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, encode(iv), encode(tag), encode(ciphertext)].join(":");
}

/**
 * Decrypts an encrypted secret. Legacy plaintext values are returned once and
 * marked for migration so existing accounts can be upgraded on first use.
 */
export function decryptSecret(value: string, encryptionKey: string): DecryptedSecret {
  if (!value.startsWith(`${VERSION}:`)) {
    return { secret: value, needsMigration: true };
  }

  const [, encodedIv, encodedTag, encodedCiphertext] = value.split(":");
  if (!encodedIv || !encodedTag || !encodedCiphertext) {
    throw new Error("Invalid encrypted secret format");
  }

  const key = keyFromSecret(encryptionKey);
  const iv = decode(encodedIv);
  const tag = decode(encodedTag);
  const ciphertext = decode(encodedCiphertext);
  if (key.length !== KEY_BYTES || iv.length !== IV_BYTES || tag.length !== 16) {
    throw new Error("Invalid encrypted secret payload");
  }

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return { secret: plaintext.toString("utf8"), needsMigration: false };
}
