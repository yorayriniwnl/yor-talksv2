import { armor, enums, readKey, readMessage, unarmor, type WebStream } from 'openpgp';

export const PRIVATE_CHAT_MAX_CIPHERTEXT_BYTES = 2 * 1024 * 1024;
export const PRIVATE_CHAT_MAX_PUBLIC_KEY_BYTES = 64 * 1024;

export class PrivateChatError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = 'PrivateChatError';
  }
}

const invalidKey = () => new PrivateChatError(400, 'private_chat_invalid_public_key', 'A valid public encryption identity is required');
const invalidEnvelope = () => new PrivateChatError(400, 'private_chat_invalid_envelope', 'A supported encrypted message is required');

/** Parse public material only; no private/recovery key is accepted by this API. */
export async function validatePrivateChatIdentity(userId: string, publicKey: string, fingerprint: string) {
  if (typeof publicKey !== 'string' || Buffer.byteLength(publicKey, 'utf8') > PRIVATE_CHAT_MAX_PUBLIC_KEY_BYTES
    || !publicKey.startsWith('-----BEGIN PGP PUBLIC KEY BLOCK-----')
    || typeof fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(fingerprint)) throw invalidKey();
  try {
    const key = await readKey({ armoredKey: publicKey });
    const userIds = key.getUserIDs();
    if (key.isPrivate() || key.getFingerprint() !== fingerprint || key.keyPacket.version !== 6
      || key.keyPacket.algorithm !== enums.publicKey.ed25519 || key.subkeys.length !== 1
      || key.subkeys[0].keyPacket.algorithm !== enums.publicKey.x25519
      || userIds.length !== 1 || userIds[0] !== `yor:${userId}`) throw invalidKey();
    await key.verifyPrimaryKey();
    await key.getPrimaryUser();
    await key.getEncryptionKey();
    await key.getSigningKey();
    // Admit one canonical public block only. Trailing keys, recovery material
    // or custom armor headers must not turn this field into arbitrary storage.
    const canonical = key.armor();
    if (canonical.trim() !== publicKey.trim()) throw invalidKey();
    return { publicKey: canonical, fingerprint };
  } catch {
    throw invalidKey();
  }
}

/**
 * Validate only the encrypted outer container. It is deliberately impossible
 * for this module to decrypt, moderate, inspect or forward the inner content.
 * A malicious client can send undecryptable bytes; recipient signature and
 * authenticated-decryption checks remain mandatory in the client.
 */
export async function validatePrivateChatCiphertext(ciphertext: string, recipientPublicKeys: readonly string[]): Promise<string> {
  if (typeof ciphertext !== 'string' || Buffer.byteLength(ciphertext, 'utf8') > PRIVATE_CHAT_MAX_CIPHERTEXT_BYTES
    || !ciphertext.startsWith('-----BEGIN PGP MESSAGE-----')) throw invalidEnvelope();
  try {
    // Check the armor around the original bytes. Reserializing parsed packets
    // changes valid partial-length encodings, especially for larger files.
    const decoded = await unarmor(ciphertext);
    if (decoded.type !== enums.armor.message || !(decoded.data instanceof Uint8Array)) throw invalidEnvelope();
    const hasChecksum = /^=[A-Za-z0-9+/]{4}\r?$/m.test(ciphertext);
    if (armor(enums.armor.message, decoded.data, undefined, undefined, undefined, hasChecksum).trim() !== ciphertext.trim()) {
      throw invalidEnvelope();
    }
    const message = await readMessage({
      binaryMessage: decoded.data,
      config: { enforceGrammar: true, ignoreMalformedPackets: false, ignoreUnsupportedPackets: false, maxDecompressedMessageSize: PRIVATE_CHAT_MAX_CIPHERTEXT_BYTES },
    });
    const tags = Array.from(message.packets, packet => (packet.constructor as { tag?: number }).tag);
    // Two recipient public-key envelopes (self and peer), followed by one
    // authenticated encrypted-data container. No password-only, literal,
    // unencrypted compressed, signature-only or legacy unauthenticated packet.
    if (tags.length !== 3 || tags[0] !== enums.packet.publicKeyEncryptedSessionKey
      || tags[1] !== enums.packet.publicKeyEncryptedSessionKey
      || ![enums.packet.symEncryptedIntegrityProtectedData, enums.packet.aeadEncryptedData].includes(tags[2] as 18 | 20)) throw invalidEnvelope();
    const keyIds = message.getEncryptionKeyIDs().map(id => id.toHex());
    if (keyIds.length !== 2 || keyIds[0] === keyIds[1] || keyIds.some(id => /^0+$/.test(id))) throw invalidEnvelope();
    // An otherwise valid container for arbitrary keys is not a message for
    // this thread. Bind both visible session-key recipients to its immutable,
    // registered identities, without attempting to inspect the encrypted body.
    if (recipientPublicKeys.length !== 2) throw invalidEnvelope();
    const expectedKeyIds = await Promise.all(recipientPublicKeys.map(async publicKey => {
      const key = await readKey({ armoredKey: publicKey });
      return (await key.getEncryptionKey()).getKeyID().toHex();
    }));
    expectedKeyIds.sort();
    if (new Set(expectedKeyIds).size !== 2
      || keyIds.sort().some((keyId, index) => keyId !== expectedKeyIds[index])) throw invalidEnvelope();
    // OpenPGP.js can return a stream here even for an armored string input.
    // Consuming it also surfaces errors in the remaining encrypted packets.
    const serialized = message.write() as Uint8Array | WebStream<Uint8Array>;
    let serializedBytes = 0;
    if (serialized instanceof Uint8Array) serializedBytes = serialized.byteLength;
    else {
      const reader = serialized.getReader();
      try {
        for (;;) {
          const chunk = await reader.read();
          if (chunk.done) break;
          if (!(chunk.value instanceof Uint8Array)) throw invalidEnvelope();
          serializedBytes += chunk.value.byteLength;
          if (serializedBytes > PRIVATE_CHAT_MAX_CIPHERTEXT_BYTES) {
            await reader.cancel?.();
            throw invalidEnvelope();
          }
        }
      } finally { reader.releaseLock?.(); }
    }
    if (serializedBytes > PRIVATE_CHAT_MAX_CIPHERTEXT_BYTES || message.packets.length !== 3) throw invalidEnvelope();
    return ciphertext;
  } catch {
    throw invalidEnvelope();
  }
}
