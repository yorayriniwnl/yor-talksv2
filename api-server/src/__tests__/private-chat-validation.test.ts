import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { armor, createMessage, encrypt, enums, generateKey, sign, unarmor } from 'openpgp';
import { PRIVATE_CHAT_MAX_CIPHERTEXT_BYTES, PrivateChatError, validatePrivateChatCiphertext, validatePrivateChatIdentity } from '../services/private-chat-validation.js';

async function keyFor(userId = randomUUID()) {
  const generated = await generateKey({
    type: 'curve25519', userIDs: [{ name: `yor:${userId}` }], format: 'object', config: { v6Keys: true },
  });
  return { userId, ...generated, fingerprint: generated.publicKey.getFingerprint() };
}
const pair = Promise.all([keyFor(), keyFor()]);
const invalid = (code: string) => (error: unknown) => error instanceof PrivateChatError && error.status === 400 && error.code === code;

test('only a valid self-certified account-bound v6 public identity can enroll', async () => {
  const [a] = await pair;
  const enrolled = await validatePrivateChatIdentity(a.userId, a.publicKey.armor(), a.fingerprint);
  assert.equal(enrolled.fingerprint, a.fingerprint);
  assert.equal(enrolled.publicKey, a.publicKey.armor());
  await assert.rejects(validatePrivateChatIdentity(randomUUID(), a.publicKey.armor(), a.fingerprint), invalid('private_chat_invalid_public_key'));
  await assert.rejects(validatePrivateChatIdentity(a.userId, a.publicKey.armor(), '0'.repeat(64)), invalid('private_chat_invalid_public_key'));
  await assert.rejects(validatePrivateChatIdentity(a.userId, a.privateKey.armor(), a.fingerprint), invalid('private_chat_invalid_public_key'));
  await assert.rejects(validatePrivateChatIdentity(a.userId, a.privateKey.armor().replaceAll('PRIVATE KEY', 'PUBLIC KEY'), a.fingerprint), invalid('private_chat_invalid_public_key'));
  await assert.rejects(validatePrivateChatIdentity(a.userId, `${a.publicKey.armor()}\n${a.privateKey.armor()}`, a.fingerprint), invalid('private_chat_invalid_public_key'));
});

test('relay accepts a signed two-recipient encrypted envelope without inspecting its body', async () => {
  const [a, b] = await pair;
  const plaintext = `private-chat-sentinel-${randomUUID()}`;
  const ciphertext = await encrypt({
    message: await createMessage({ text: plaintext }), encryptionKeys: [a.publicKey, b.publicKey],
    signingKeys: a.privateKey, format: 'armored',
  });
  const recipients = [a.publicKey.armor(), b.publicKey.armor()];
  assert.equal(await validatePrivateChatCiphertext(ciphertext, recipients), ciphertext);
  assert.equal(ciphertext.includes(plaintext), false);
  await assert.rejects(validatePrivateChatCiphertext(`${ciphertext}\n${plaintext}`, recipients), invalid('private_chat_invalid_envelope'));
  await assert.rejects(validatePrivateChatCiphertext(`${ciphertext}\n${ciphertext}`, recipients), invalid('private_chat_invalid_envelope'));
  await assert.rejects(validatePrivateChatCiphertext(ciphertext.replace('MESSAGE-----', 'MESSAGE-----\nComment: readable metadata'), recipients), invalid('private_chat_invalid_envelope'));
  const decoded = await unarmor(ciphertext);
  assert.ok(decoded.data instanceof Uint8Array);
  const literal = (await createMessage({ text: plaintext })).write();
  assert.ok(literal instanceof Uint8Array);
  const appended = armor(enums.armor.message, Buffer.concat([decoded.data, literal]));
  await assert.rejects(validatePrivateChatCiphertext(appended, recipients), invalid('private_chat_invalid_envelope'));
  const outsider = await keyFor();
  await assert.rejects(validatePrivateChatCiphertext(ciphertext, [a.publicKey.armor(), outsider.publicKey.armor()]), invalid('private_chat_invalid_envelope'));
  await assert.rejects(validatePrivateChatCiphertext(ciphertext, [a.publicKey.armor(), a.publicKey.armor()]), invalid('private_chat_invalid_envelope'));
  assert.equal(await validatePrivateChatCiphertext(ciphertext, [...recipients].reverse()), ciphertext);
});

test('large encrypted packets retain their original bytes and can be retried unchanged', async () => {
  const [a, b] = await pair;
  const ciphertext = await encrypt({
    message: await createMessage({ binary: new Uint8Array(750_000) }),
    encryptionKeys: [a.publicKey, b.publicKey], signingKeys: a.privateKey,
    format: 'armored', config: { aeadProtect: true },
  });
  assert.ok(ciphertext.length > 1_000_000);
  const recipients = [a.publicKey.armor(), b.publicKey.armor()];
  assert.equal(await validatePrivateChatCiphertext(ciphertext, recipients), ciphertext);
  assert.equal(await validatePrivateChatCiphertext(ciphertext, recipients), ciphertext);
});

test('literal, signature-only, password-only, missing-recipient and malformed containers are rejected', async () => {
  const [a, b] = await pair;
  const message = await createMessage({ text: 'plaintext must not reach relay storage' });
  const literal = message.armor();
  const signed = await sign({ message, signingKeys: a.privateKey, format: 'armored' });
  const passwordOnly = await encrypt({ message, passwords: ['local-test-only'], format: 'armored' });
  const missingRecipient = await encrypt({ message, encryptionKeys: a.publicKey, signingKeys: a.privateKey, format: 'armored' });
  for (const input of [literal, signed, passwordOnly, missingRecipient, '-----BEGIN PGP MESSAGE-----\nplaintext\n-----END PGP MESSAGE-----']) {
    await assert.rejects(validatePrivateChatCiphertext(input, [a.publicKey.armor(), b.publicKey.armor()]), invalid('private_chat_invalid_envelope'));
  }
});

test('hidden recipients and oversized messages are rejected before persistence', async () => {
  const [a, b] = await pair;
  const hidden = await encrypt({ message: await createMessage({ text: 'hidden' }), encryptionKeys: [a.publicKey, b.publicKey], wildcard: true, format: 'armored' });
  const recipients = [a.publicKey.armor(), b.publicKey.armor()];
  await assert.rejects(validatePrivateChatCiphertext(hidden, recipients), invalid('private_chat_invalid_envelope'));
  await assert.rejects(validatePrivateChatCiphertext('-----BEGIN PGP MESSAGE-----\n' + 'A'.repeat(PRIVATE_CHAT_MAX_CIPHERTEXT_BYTES), recipients), invalid('private_chat_invalid_envelope'));
});
