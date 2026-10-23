import type { IdentityBackup } from './private-chat-crypto';

const backupKey = (userId: string) => `yor:private-chat:encrypted-key:v1:${userId}`;
const trustKey = (userId: string, peerId: string) => `yor:private-chat:verified:v1:${userId}:${peerId}`;

// Only the passphrase-encrypted recovery file is persisted, never the unlocked
// key, passphrase, message plaintext, or an unencrypted attachment.
export function loadPrivateBackup(userId: string): IdentityBackup | null {
  try {
    const value = localStorage.getItem(backupKey(userId));
    if (!value) return null;
    const parsed = JSON.parse(value);
    return parsed?.userId === userId && parsed?.version === 1 ? parsed : null;
  } catch { return null; }
}
export function savePrivateBackup(backup: IdentityBackup): boolean {
  try {
    localStorage.setItem(backupKey(backup.userId), JSON.stringify(backup));
    return true;
  } catch { return false; }
}
export function forgetPrivateBackup(userId: string) {
  localStorage.removeItem(backupKey(userId));
}
export function isPrivatePeerVerified(userId: string, peerId: string, fingerprint: string): boolean {
  try { return localStorage.getItem(trustKey(userId, peerId)) === fingerprint; } catch { return false; }
}
export function verifyPrivatePeer(userId: string, peerId: string, fingerprint: string): boolean {
  try {
    localStorage.setItem(trustKey(userId, peerId), fingerprint);
    return true;
  } catch { return false; }
}
export const formatFingerprint = (fingerprint: string) => fingerprint.toUpperCase().match(/.{1,4}/g)?.join(' ') ?? '';
