/**
 * Client-only private-chat cryptography. OpenPGP.js implements the cryptographic
 * format; this module binds a signed payload to its account and server record.
 *
 * There is deliberately no transport, storage, key reset, or plaintext fallback
 * here. Fingerprints need verification outside Yor before trusting a contact's
 * first key. This static identity format does not provide forward secrecy.
 */
import {
  createMessage,
  decrypt,
  decryptKey,
  encrypt,
  enums,
  generateKey,
  readKey,
  readMessage,
  readPrivateKey,
  type PartialConfig,
  type PrivateKey,
  type PublicKey,
} from "openpgp";

export const PRIVATE_CHAT_VERSION = 1 as const;
export const MAX_PRIVATE_ATTACHMENT_BYTES = 512 * 1024;
export const MAX_PRIVATE_TEXT_LENGTH = 4000;
export const MAX_PRIVATE_CIPHERTEXT_BYTES = 1024 * 1024;
export const MAX_PRIVATE_BACKUP_BYTES = 64 * 1024;

const MAX_ENVELOPE_BYTES = 740_000;
const MAX_KEY_BYTES = 24 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const FINGERPRINT = /^[0-9a-f]{64}$/;
const utf8 = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });
const cryptoConfig: PartialConfig = {
  v6Keys: true,
  aeadProtect: true,
  preferredSymmetricAlgorithm: enums.symmetric.aes256,
  preferredAEADAlgorithm: enums.aead.gcm,
  preferredCompressionAlgorithm: enums.compression.uncompressed,
  // RFC 9580 iterated-and-salted S2K. This path needs no Argon2 WASM or
  // unsafe-eval CSP exception; the caller supplies a long recovery passphrase.
  s2kType: enums.s2k.iterated,
  s2kIterationCountByte: 224,
  allowUnauthenticatedMessages: false,
  allowUnauthenticatedStream: false,
  ignoreUnsupportedPackets: false,
  ignoreMalformedPackets: false,
  enforceGrammar: true,
  maxDecompressedMessageSize: MAX_ENVELOPE_BYTES,
  maxUserIDLength: 128,
  maxArgon2MemoryExponent: 16,
};

export interface PublicIdentity {
  userId: string;
  publicKey: string;
  fingerprint: string;
}

export interface IdentityBackup extends PublicIdentity {
  version: typeof PRIVATE_CHAT_VERSION;
  encryptedPrivateKey: string;
}

/** Opaque, nonpersistable handle. Its private key is held only in a WeakMap. */
export interface PrivateIdentity extends Readonly<PublicIdentity> {}

export interface PrivateMessageContext {
  id: string;
  threadId: string;
  senderId: string;
  /** Sorted, unique participant IDs, including the sender. */
  recipientIds: string[];
}

export interface PrivateAttachment {
  name: string;
  type: string;
  dataBase64: string;
}

export interface PrivateMessagePayload {
  text: string;
  attachment?: PrivateAttachment;
}

const unlockedKeys = new WeakMap<PrivateIdentity, PrivateKey>();

function fail(message: string): never {
  throw new Error(message);
}

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactFields(value: Record<string, unknown>, required: string[], optional: string[] = []) {
  const names = Object.keys(value);
  if (required.some((name) => !Object.hasOwn(value, name)) ||
      names.some((name) => !required.includes(name) && !optional.includes(name))) {
    fail("The private-chat data has an unsupported format.");
  }
}

function accountId(value: unknown): asserts value is string {
  if (typeof value !== "string" || !UUID.test(value)) {
    fail("The private-chat account or record ID is invalid.");
  }
}

function passphraseInput(value: unknown, creating = false): asserts value is string {
  if (typeof value !== "string" || value.length > 1024 || value.length === 0) {
    fail("Enter your private-chat passphrase.");
  }
  if (creating && (value.length < 16 || new Set(value).size < 8)) {
    fail("Use a private-chat passphrase of at least 16 characters, with several different words.");
  }
}

function armored(value: unknown, kind: "PUBLIC KEY BLOCK" | "PRIVATE KEY BLOCK" | "MESSAGE", limit: number): asserts value is string {
  if (typeof value !== "string" || value.length > limit || utf8.encode(value).length > limit) {
    fail("The private-chat key or message is too large or invalid.");
  }
  const trimmed = value.trim();
  const begin = `-----BEGIN PGP ${kind}-----`;
  const end = `-----END PGP ${kind}-----`;
  if (!trimmed.startsWith(`${begin}\n`) && !trimmed.startsWith(`${begin}\r\n`)) {
    fail("The private-chat key or message has an invalid format.");
  }
  if (!trimmed.endsWith(end) ||
      trimmed.indexOf("-----BEGIN PGP ", begin.length) !== -1 ||
      trimmed.indexOf("-----END PGP ") !== trimmed.length - end.length) {
    fail("Only one private-chat key or message is allowed.");
  }
}

function publicFields(value: unknown): asserts value is PublicIdentity {
  if (!object(value)) fail("The private-chat identity is invalid.");
  accountId(value.userId);
  if (typeof value.fingerprint !== "string" || !FINGERPRINT.test(value.fingerprint)) {
    fail("The private-chat identity fingerprint is invalid.");
  }
  armored(value.publicKey, "PUBLIC KEY BLOCK", MAX_KEY_BYTES);
}

async function readBoundPublicKey(value: PublicIdentity): Promise<PublicKey> {
  publicFields(value);
  const key = await readKey({ armoredKey: value.publicKey, config: cryptoConfig });
  if (key.isPrivate() || key.getFingerprint() !== value.fingerprint) {
    fail("The private-chat public key does not match its fingerprint.");
  }
  if (key.keyPacket.version !== 6 ||
      key.keyPacket.algorithm !== enums.publicKey.ed25519 ||
      key.subkeys.length !== 1 ||
      key.subkeys[0].keyPacket.algorithm !== enums.publicKey.x25519) {
    fail("This private-chat identity uses an unsupported key format.");
  }
  const userIds = key.getUserIDs();
  if (userIds.length !== 1 || userIds[0] !== `yor:${value.userId}`) {
    fail("The private-chat key belongs to a different account.");
  }
  // Verify the account's self-certification as well as both key capabilities.
  // Match the exact encoded user ID above. The library's parsed name/email
  // filters interpret `yor:<uuid>` differently from the encoded user ID.
  await key.getPrimaryUser();
  await key.getSigningKey();
  await key.getEncryptionKey();
  return key;
}

/** Validate directory entries before storing a trust pin or sending a message. */
export async function validatePublicKey(value: PublicIdentity): Promise<void> {
  await readBoundPublicKey(value);
}

function contextInput(value: unknown): PrivateMessageContext {
  if (!object(value)) fail("The private-chat message context is invalid.");
  exactFields(value, ["id", "threadId", "senderId", "recipientIds"]);
  accountId(value.id);
  accountId(value.threadId);
  accountId(value.senderId);
  if (!Array.isArray(value.recipientIds) || value.recipientIds.length < 2 || value.recipientIds.length > 32) {
    fail("A private chat needs between 2 and 32 participants.");
  }
  value.recipientIds.forEach(accountId);
  const ids = value.recipientIds as string[];
  if (new Set(ids).size !== ids.length || ids.some((id, i) => i > 0 && ids[i - 1] >= id) ||
      !ids.includes(value.senderId)) {
    fail("The private-chat participants must be unique, sorted, and include the sender.");
  }
  return { id: value.id, threadId: value.threadId, senderId: value.senderId, recipientIds: [...ids] };
}

function payloadInput(value: unknown): PrivateMessagePayload {
  if (!object(value)) fail("The private-chat message is invalid.");
  exactFields(value, ["text"], ["attachment"]);
  if (typeof value.text !== "string" || value.text.length > MAX_PRIVATE_TEXT_LENGTH) {
    fail(`Private-chat messages can contain at most ${MAX_PRIVATE_TEXT_LENGTH} characters.`);
  }
  const payload: PrivateMessagePayload = { text: value.text };
  if (value.attachment !== undefined) {
    const file = value.attachment;
    if (!object(file)) fail("The private-chat attachment is invalid.");
    exactFields(file, ["name", "type", "dataBase64"]);
    if (typeof file.name !== "string" || file.name.length < 1 || file.name.length > 200 ||
        /[\u0000-\u001f\u007f/\\]/.test(file.name) ||
        typeof file.type !== "string" || file.type.length < 1 || file.type.length > 100 ||
        !/^[a-zA-Z0-9!#$&^_.+-]+\/[a-zA-Z0-9!#$&^_.+-]+$/.test(file.type) ||
        typeof file.dataBase64 !== "string" || file.dataBase64.length === 0 ||
        file.dataBase64.length > Math.ceil(MAX_PRIVATE_ATTACHMENT_BYTES / 3) * 4 ||
        file.dataBase64.length % 4 !== 0 ||
        !/^[A-Za-z0-9+/]*={0,2}$/.test(file.dataBase64)) {
      fail("The private-chat attachment is invalid or exceeds 512 KiB.");
    }
    const binary = atob(file.dataBase64);
    if (binary.length > MAX_PRIVATE_ATTACHMENT_BYTES || btoa(binary) !== file.dataBase64) {
      fail("The private-chat attachment is invalid or exceeds 512 KiB.");
    }
    payload.attachment = { name: file.name, type: file.type, dataBase64: file.dataBase64 };
  }
  if (!payload.text.trim() && !payload.attachment) fail("Write a message or choose an attachment.");
  return payload;
}

function requireUnlocked(identity: PrivateIdentity): PrivateKey {
  const privateKey = unlockedKeys.get(identity);
  if (!privateKey) fail("Unlock private chats on this device first.");
  return privateKey;
}

/** Generates a new identity only. The caller must enforce immutable registration. */
export async function generateIdentity(userId: string, passphrase: string): Promise<IdentityBackup> {
  accountId(userId);
  passphraseInput(passphrase, true);
  const generated = await generateKey({
    type: "curve25519",
    userIDs: [{ name: `yor:${userId}` }],
    passphrase,
    format: "armored",
    config: cryptoConfig,
  });
  const key = await readKey({ armoredKey: generated.publicKey, config: cryptoConfig });
  const backup: IdentityBackup = {
    version: PRIVATE_CHAT_VERSION,
    userId,
    publicKey: generated.publicKey,
    encryptedPrivateKey: generated.privateKey,
    fingerprint: key.getFingerprint(),
  };
  await validatePublicKey(backup);
  return backup;
}

/** Parse bounded recovery metadata. unlockIdentity must validate it before storage. */
export function parseIdentityBackup(value: string | unknown): IdentityBackup {
  let parsed: unknown = value;
  if (typeof value === "string") {
    if (value.length > MAX_PRIVATE_BACKUP_BYTES || utf8.encode(value).length > MAX_PRIVATE_BACKUP_BYTES) {
      fail("The private-chat recovery file is too large.");
    }
    try { parsed = JSON.parse(value); } catch { fail("The private-chat recovery file is invalid."); }
  }
  if (!object(parsed)) fail("The private-chat recovery file is invalid.");
  exactFields(parsed, ["version", "userId", "publicKey", "encryptedPrivateKey", "fingerprint"]);
  if (parsed.version !== PRIVATE_CHAT_VERSION) fail("This private-chat recovery version is not supported.");
  publicFields(parsed);
  armored(parsed.encryptedPrivateKey, "PRIVATE KEY BLOCK", MAX_KEY_BYTES);
  return {
    version: PRIVATE_CHAT_VERSION,
    userId: parsed.userId,
    publicKey: parsed.publicKey,
    encryptedPrivateKey: parsed.encryptedPrivateKey,
    fingerprint: parsed.fingerprint,
  };
}

export async function unlockIdentity(userId: string, value: IdentityBackup | unknown, passphrase: string): Promise<PrivateIdentity> {
  accountId(userId);
  passphraseInput(passphrase);
  const backup = parseIdentityBackup(value);
  if (backup.userId !== userId) fail("This private-chat recovery file belongs to another account.");
  await readBoundPublicKey(backup);
  const encrypted = await readPrivateKey({ armoredKey: backup.encryptedPrivateKey, config: cryptoConfig });
  if (encrypted.isDecrypted()) fail("The private-chat recovery file must contain a passphrase-protected key.");
  if (encrypted.getFingerprint() !== backup.fingerprint ||
      encrypted.toPublic().armor() !== backup.publicKey) {
    fail("The private-chat recovery keys do not match.");
  }
  let key: PrivateKey;
  try {
    key = await decryptKey({ privateKey: encrypted, passphrase, config: cryptoConfig });
  } catch {
    fail("The private-chat passphrase is incorrect or the recovery file is damaged.");
  }
  const identity: PrivateIdentity = Object.freeze({
    userId, publicKey: backup.publicKey, fingerprint: backup.fingerprint,
  });
  unlockedKeys.set(identity, key);
  return identity;
}

/** Release the unlocked key on explicit lock, account switch, or logout. */
export function lockIdentity(identity: PrivateIdentity): void {
  // OpenPGP.js 6.3.2 implements this on PrivateKey, but omits it from its .d.ts.
  // It clears retained private-parameter arrays; it cannot erase JS engine copies.
  const key = unlockedKeys.get(identity) as (PrivateKey & { clearPrivateParams(): void }) | undefined;
  key?.clearPrivateParams();
  unlockedKeys.delete(identity);
}

export async function sealMessage(
  identity: PrivateIdentity,
  rawContext: PrivateMessageContext,
  recipientKeys: PublicIdentity[],
  rawPayload: PrivateMessagePayload,
): Promise<string> {
  const key = requireUnlocked(identity);
  const context = contextInput(rawContext);
  if (identity.userId !== context.senderId) fail("The message sender does not match your private-chat identity.");
  const payload = payloadInput(rawPayload);
  if (!Array.isArray(recipientKeys) || recipientKeys.length !== context.recipientIds.length) {
    fail("Every private-chat participant needs a verified public key.");
  }
  const keysByUser = new Map(recipientKeys.map((recipient) => [recipient.userId, recipient]));
  if (keysByUser.size !== recipientKeys.length ||
      context.recipientIds.some((id) => !keysByUser.has(id)) ||
      keysByUser.get(identity.userId)?.fingerprint !== identity.fingerprint) {
    fail("The private-chat recipient keys do not match this conversation.");
  }
  const encryptionKeys = await Promise.all(context.recipientIds.map((id) => readBoundPublicKey(keysByUser.get(id)!)));
  const envelope = utf8.encode(JSON.stringify({
    purpose: "yor-private-chat",
    version: PRIVATE_CHAT_VERSION,
    context,
    payload,
  }));
  if (envelope.length > MAX_ENVELOPE_BYTES) fail("The private-chat message is too large.");
  const ciphertext = await encrypt({
    message: await createMessage({ binary: envelope }),
    encryptionKeys,
    signingKeys: key,
    format: "armored",
    config: cryptoConfig,
  });
  armored(ciphertext, "MESSAGE", MAX_PRIVATE_CIPHERTEXT_BYTES);
  // An account switch or explicit lock during asynchronous work cancels delivery.
  if (unlockedKeys.get(identity) !== key) fail("Private chats were locked before the message was ready.");
  return ciphertext;
}

export async function openMessage(
  identity: PrivateIdentity,
  rawContext: PrivateMessageContext,
  sender: PublicIdentity,
  ciphertext: string,
): Promise<PrivateMessagePayload> {
  const key = requireUnlocked(identity);
  const context = contextInput(rawContext);
  if (!context.recipientIds.includes(identity.userId) || sender.userId !== context.senderId) {
    fail("This private-chat message belongs to another conversation or account.");
  }
  if (sender.userId === identity.userId && sender.fingerprint !== identity.fingerprint) {
    fail("The message sender's private-chat identity has changed.");
  }
  armored(ciphertext, "MESSAGE", MAX_PRIVATE_CIPHERTEXT_BYTES);
  const verificationKey = await readBoundPublicKey(sender);
  const message = await readMessage({ armoredMessage: ciphertext, config: cryptoConfig });
  const result = await decrypt({
    message,
    decryptionKeys: key,
    verificationKeys: verificationKey,
    expectSigned: true,
    format: "binary",
    config: cryptoConfig,
  });
  await Promise.all(result.signatures.map((signature) => signature.verified));
  if (result.signatures.length !== 1) fail("The private-chat message must have exactly one verified sender.");
  if (!(result.data instanceof Uint8Array) || result.data.byteLength > MAX_ENVELOPE_BYTES) {
    fail("The private-chat message is too large or invalid.");
  }
  let decoded: unknown;
  try { decoded = JSON.parse(decoder.decode(result.data)); } catch { fail("The private-chat message has an invalid format."); }
  if (!object(decoded)) fail("The private-chat message has an invalid format.");
  exactFields(decoded, ["purpose", "version", "context", "payload"]);
  if (decoded.purpose !== "yor-private-chat" || decoded.version !== PRIVATE_CHAT_VERSION ||
      JSON.stringify(contextInput(decoded.context)) !== JSON.stringify(context)) {
    fail("The signed private-chat message does not match this conversation.");
  }
  const payload = payloadInput(decoded.payload);
  if (unlockedKeys.get(identity) !== key) fail("Private chats were locked before the message was ready.");
  return payload;
}
