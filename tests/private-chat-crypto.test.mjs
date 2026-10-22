import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { after, before, test } from "node:test";
import { build } from "esbuild";

// Bundle the actual browser implementation, including the browser OpenPGP build.
// No mocked cryptographic operations or network/key service is involved.
const bundle = await build({
  entryPoints: ["social/src/lib/private-chat-crypto.ts"],
  bundle: true,
  write: false,
  platform: "browser",
  format: "esm",
  target: "es2022",
  define: { "process.env.NODE_ENV": '"production"' },
});
const crypto = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const socialRequire = createRequire(new URL("../social/package.json", import.meta.url));
const pgp = await import(pathToFileURL(socialRequire.resolve("openpgp")).href);

const aliceId = randomUUID();
const bobId = randomUUID();
const eveId = randomUUID();
const passphrase = "rainfall lantern violet compass 42";
let aliceBackup, bobBackup, eveBackup;
let alice, bob, eve;
let alicePrivate;
const handles = [];
const context = () => ({
  id: randomUUID(), threadId: randomUUID(), senderId: aliceId,
  recipientIds: [aliceId, bobId].sort(),
});
const publicIdentity = ({ userId, publicKey, fingerprint }) => ({ userId, publicKey, fingerprint });
const recipients = () => [publicIdentity(aliceBackup), publicIdentity(bobBackup)];
const envelope = (ctx, payload = { text: "signed content" }) => ({
  purpose: "yor-private-chat", version: 1, context: ctx, payload,
});
async function customCiphertext(value, { signed = true, compression, signingKey = alicePrivate } = {}) {
  const recipientKeys = await Promise.all(recipients().map(({ publicKey }) => pgp.readKey({ armoredKey: publicKey })));
  return pgp.encrypt({
    message: await pgp.createMessage({ binary: new TextEncoder().encode(JSON.stringify(value)) }),
    encryptionKeys: recipientKeys,
    ...(signed ? { signingKeys: signingKey } : {}),
    config: {
      aeadProtect: true,
      preferredCompressionAlgorithm: compression ?? pgp.enums.compression.uncompressed,
    },
  });
}

before(async () => {
  [aliceBackup, bobBackup, eveBackup] = await Promise.all(
    [aliceId, bobId, eveId].map((id) => crypto.generateIdentity(id, passphrase)),
  );
  [alice, bob, eve] = await Promise.all(
    [aliceBackup, bobBackup, eveBackup].map((backup) => crypto.unlockIdentity(backup.userId, backup, passphrase)),
  );
  handles.push(alice, bob, eve);
  alicePrivate = await pgp.decryptKey({
    privateKey: await pgp.readPrivateKey({ armoredKey: aliceBackup.encryptedPrivateKey }),
    passphrase,
  });
});

after(() => {
  handles.forEach(crypto.lockIdentity);
  alicePrivate?.clearPrivateParams();
});

test("identities contain standard Ed25519/X25519 v6 keys and keep private material out of runtime serialization", async () => {
  assert.match(aliceBackup.fingerprint, /^[0-9a-f]{64}$/);
  const key = await pgp.readKey({ armoredKey: aliceBackup.publicKey });
  const encrypted = await pgp.readPrivateKey({ armoredKey: aliceBackup.encryptedPrivateKey });
  assert.equal(key.keyPacket.version, 6);
  assert.equal(key.keyPacket.algorithm, pgp.enums.publicKey.ed25519);
  assert.equal(key.subkeys[0].keyPacket.algorithm, pgp.enums.publicKey.x25519);
  assert.deepEqual(key.getUserIDs(), [`yor:${aliceId}`]);
  assert.equal(encrypted.isDecrypted(), false);
  assert.equal(encrypted.getKeys().every(({ keyPacket }) => !keyPacket.isDecrypted()), true);
  assert.equal(JSON.stringify(alice).includes("PRIVATE KEY"), false);
  assert.equal(JSON.stringify(alice).includes(passphrase), false);
  assert.equal(Object.isFrozen(alice), true);
  assert.equal("privateKey" in alice, false);
  await crypto.validatePublicKey(publicIdentity(aliceBackup));
});

test("sender and recipient can read a signed encrypted text and attachment while another identity cannot", async () => {
  const ctx = context();
  const sentinel = "do-not-send-readable-private-attachment-to-server";
  const payload = {
    text: "A confidential conversation ✓",
    attachment: { name: "private-note.txt", type: "text/plain", dataBase64: Buffer.from(sentinel).toString("base64") },
  };
  const ciphertext = await crypto.sealMessage(alice, ctx, recipients(), payload);
  assert.match(ciphertext, /^-----BEGIN PGP MESSAGE-----/);
  for (const secret of [payload.text, payload.attachment.name, payload.attachment.dataBase64, sentinel]) {
    assert.equal(ciphertext.includes(secret), false);
  }
  const packets = await pgp.readMessage({ armoredMessage: ciphertext });
  const encryptionIds = packets.getEncryptionKeyIDs().map((id) => id.toHex());
  assert.equal(encryptionIds.length, 2);
  assert.equal(new Set(encryptionIds).size, 2);
  assert.ok(encryptionIds.every((id) => id !== "0000000000000000"));
  assert.equal(packets.packets.length, 3);
  assert.equal(packets.packets.find((packet) => packet.constructor.tag === pgp.enums.packet.symEncryptedIntegrityProtectedData)?.version, 2);
  assert.deepEqual(await crypto.openMessage(bob, ctx, publicIdentity(aliceBackup), ciphertext), payload);
  assert.deepEqual(await crypto.openMessage(alice, ctx, publicIdentity(aliceBackup), ciphertext), payload);
  await assert.rejects(crypto.openMessage(eve, ctx, publicIdentity(aliceBackup), ciphertext), /another conversation or account/);
  // Merely editing the visible context to include an attacker grants no ability to decrypt.
  await assert.rejects(crypto.openMessage(eve, { ...ctx, recipientIds: [aliceId, eveId].sort() }, publicIdentity(aliceBackup), ciphertext));
});

test("encrypting the same payload twice produces different ciphertexts", async () => {
  const ctx = context();
  const first = await crypto.sealMessage(alice, ctx, recipients(), { text: "hello" });
  const second = await crypto.sealMessage(alice, ctx, recipients(), { text: "hello" });
  assert.notEqual(first, second);
});

test("message signatures bind the server record, conversation, sender, and complete participant list", async () => {
  const ctx = context();
  const ciphertext = await crypto.sealMessage(alice, ctx, recipients(), { text: "context is signed" });
  for (const changed of [
    { ...ctx, id: randomUUID() },
    { ...ctx, threadId: randomUUID() },
    { ...ctx, senderId: bobId },
    { ...ctx, recipientIds: [aliceId, bobId, eveId].sort() },
  ]) {
    await assert.rejects(crypto.openMessage(bob, changed, publicIdentity(aliceBackup), ciphertext));
  }
});

test("unsigned encryption and signatures from another key are rejected before returning plaintext", async () => {
  const ctx = context();
  const unsigned = await customCiphertext(envelope(ctx), { signed: false });
  await assert.rejects(crypto.openMessage(bob, ctx, publicIdentity(aliceBackup), unsigned), /not signed/i);
  const wrongSigner = await pgp.decryptKey({
    privateKey: await pgp.readPrivateKey({ armoredKey: eveBackup.encryptedPrivateKey }), passphrase,
  });
  try {
    const forged = await customCiphertext(envelope(ctx), { signingKey: wrongSigner });
    await assert.rejects(crypto.openMessage(bob, ctx, publicIdentity(aliceBackup), forged));
  } finally {
    wrongSigner.clearPrivateParams();
  }
});

test("ciphertext tampering and concatenated armored messages are rejected", async () => {
  const ctx = context();
  const ciphertext = await crypto.sealMessage(alice, ctx, recipients(), { text: "integrity matters" });
  const lines = ciphertext.split("\n");
  // Alter the encrypted data near the end, not one participant's session-key
  // packet: damaging Alice's packet alone need not prevent Bob decrypting.
  const lineIndex = lines.findLastIndex(line => /^[A-Za-z0-9+/]{20,}={0,2}\r?$/.test(line));
  assert.ok(lineIndex > 0);
  const index = Math.floor(lines[lineIndex].length / 2);
  lines[lineIndex] = `${lines[lineIndex].slice(0, index)}${lines[lineIndex][index] === "A" ? "B" : "A"}${lines[lineIndex].slice(index + 1)}`;
  await assert.rejects(crypto.openMessage(bob, ctx, publicIdentity(aliceBackup), lines.join("\n")));
  await assert.rejects(crypto.openMessage(bob, ctx, publicIdentity(aliceBackup), ciphertext + ciphertext), /Only one/);
});

test("public directory keys reject mismatched account bindings, fingerprints, and secret key blocks", async () => {
  await assert.rejects(crypto.validatePublicKey({ ...publicIdentity(aliceBackup), userId: bobId }), /different account/);
  await assert.rejects(crypto.validatePublicKey({ ...publicIdentity(aliceBackup), fingerprint: bobBackup.fingerprint }), /fingerprint/);
  await assert.rejects(crypto.validatePublicKey({ ...publicIdentity(aliceBackup), publicKey: aliceBackup.encryptedPrivateKey }), /invalid format/);
  await assert.rejects(crypto.validatePublicKey({ ...publicIdentity(aliceBackup), publicKey: aliceBackup.publicKey + bobBackup.publicKey }), /Only one/);
});

test("recipient key substitutions, omissions, duplicates, and forged sender handles fail closed", async () => {
  const ctx = context();
  for (const keys of [
    [publicIdentity(aliceBackup)],
    [publicIdentity(aliceBackup), publicIdentity(aliceBackup)],
    [publicIdentity(aliceBackup), { ...publicIdentity(eveBackup), userId: bobId }],
    [{ ...publicIdentity(aliceBackup), fingerprint: bobBackup.fingerprint }, publicIdentity(bobBackup)],
  ]) {
    await assert.rejects(crypto.sealMessage(alice, ctx, keys, { text: "hello" }));
  }
  await assert.rejects(crypto.sealMessage(bob, ctx, recipients(), { text: "hello" }), /sender/);
  await assert.rejects(crypto.sealMessage({ ...alice }, ctx, recipients(), { text: "hello" }), /Unlock/);
  await assert.rejects(crypto.sealMessage(alice, { ...ctx, recipientIds: [...ctx.recipientIds].reverse() }, recipients(), { text: "hello" }), /sorted/);
});

test("recovery rejects wrong passphrases, other accounts, changed versions, plaintext secret keys, and mismatched key pairs", async () => {
  assert.deepEqual(crypto.parseIdentityBackup(JSON.stringify(aliceBackup)), aliceBackup);
  await assert.rejects(crypto.unlockIdentity(aliceId, aliceBackup, "an incorrect passphrase"), /incorrect or.*damaged/);
  await assert.rejects(crypto.unlockIdentity(bobId, aliceBackup, passphrase), /another account/);
  assert.throws(() => crypto.parseIdentityBackup({ ...aliceBackup, version: 2 }), /version/);
  assert.throws(() => crypto.parseIdentityBackup({ ...aliceBackup, passphrase }), /unsupported format/);
  await assert.rejects(crypto.unlockIdentity(aliceId, { ...aliceBackup, encryptedPrivateKey: alicePrivate.armor() }, passphrase), /passphrase-protected/);
  await assert.rejects(crypto.unlockIdentity(aliceId, { ...aliceBackup, encryptedPrivateKey: bobBackup.encryptedPrivateKey }, passphrase), /do not match/);
  assert.throws(() => crypto.parseIdentityBackup("x".repeat(crypto.MAX_PRIVATE_BACKUP_BYTES + 1)), /too large/);
});

test("setup rejects short or repetitive passphrases and malformed account IDs", async () => {
  await assert.rejects(crypto.generateIdentity(aliceId, "short"), /16 characters/);
  await assert.rejects(crypto.generateIdentity(aliceId, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"), /16 characters/);
  await assert.rejects(crypto.generateIdentity("not-an-account", passphrase), /invalid/);
});

test("the maximum allowed attachment round-trips and larger or malformed payloads are rejected", async () => {
  const ctx = context();
  const file = { name: "sample.bin", type: "application/octet-stream", dataBase64: Buffer.alloc(crypto.MAX_PRIVATE_ATTACHMENT_BYTES, 93).toString("base64") };
  const payload = { text: "", attachment: file };
  const ciphertext = await crypto.sealMessage(alice, ctx, recipients(), payload);
  assert.ok(Buffer.byteLength(ciphertext) <= crypto.MAX_PRIVATE_CIPHERTEXT_BYTES);
  assert.deepEqual(await crypto.openMessage(bob, ctx, publicIdentity(aliceBackup), ciphertext), payload);
  for (const invalid of [
    { text: "x".repeat(crypto.MAX_PRIVATE_TEXT_LENGTH + 1) },
    { text: "" },
    { text: "", attachment: { ...file, dataBase64: Buffer.alloc(crypto.MAX_PRIVATE_ATTACHMENT_BYTES + 1).toString("base64") } },
    { text: "", attachment: { ...file, name: "../file.txt" } },
    { text: "", attachment: { ...file, dataBase64: "AAAA===" } },
    { text: "", attachment: { ...file, dataBase64: "AB==" } },
  ]) {
    await assert.rejects(crypto.sealMessage(alice, ctx, recipients(), invalid));
  }
});

test("even valid signatures cannot bypass payload limits, domain/version binding, or compressed-size limits", async () => {
  const ctx = context();
  for (const invalid of [
    { ...envelope(ctx), purpose: "another-product" },
    { ...envelope(ctx), version: 9 },
    envelope(ctx, { text: "x".repeat(crypto.MAX_PRIVATE_TEXT_LENGTH + 1) }),
    { ...envelope(ctx), leakedExtraField: "unsupported" },
  ]) {
    const ciphertext = await customCiphertext(invalid);
    await assert.rejects(crypto.openMessage(bob, ctx, publicIdentity(aliceBackup), ciphertext));
  }
  const compressedBomb = await customCiphertext(envelope(ctx, { text: "z".repeat(2_000_000) }), {
    compression: pgp.enums.compression.zlib,
  });
  assert.ok(compressedBomb.length < crypto.MAX_PRIVATE_CIPHERTEXT_BYTES);
  await assert.rejects(crypto.openMessage(bob, ctx, publicIdentity(aliceBackup), compressedBomb), /decompress|large|limit/i);
});

test("locking clears the opaque runtime key and invalidates later reads and sends", async () => {
  const recovered = await crypto.unlockIdentity(aliceId, JSON.parse(JSON.stringify(aliceBackup)), passphrase);
  handles.push(recovered);
  const ctx = context();
  const ciphertext = await crypto.sealMessage(recovered, ctx, recipients(), { text: "restore preserves identity" });
  assert.deepEqual(await crypto.openMessage(bob, ctx, publicIdentity(aliceBackup), ciphertext), { text: "restore preserves identity" });
  crypto.lockIdentity(recovered);
  await assert.rejects(crypto.sealMessage(recovered, ctx, recipients(), { text: "locked" }), /Unlock/);
  await assert.rejects(crypto.openMessage(recovered, ctx, publicIdentity(aliceBackup), ciphertext), /Unlock/);
});
