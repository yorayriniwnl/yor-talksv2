import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { db, pool, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UserRepository } from "../repositories/user-repository.js";
import { ContactShieldService } from "../services/contact-shield-service.js";
import { getContactIdentifierDigest, normalizeContactIdentifier, isValidContactIdentifier } from "../utils/contact-shield.js";

after(async () => {
  await pool.end();
});

test("contact identifiers normalize consistently before matching", () => {
  assert.equal(normalizeContactIdentifier("email", "  STUDENT@KIIT.AC.IN "), "student@kiit.ac.in");
  assert.equal(normalizeContactIdentifier("phone", "98765 43210"), "+919876543210");
  assert.equal(isValidContactIdentifier("email", "student@kiit.ac.in"), true);
  assert.equal(isValidContactIdentifier("phone", "+919876543210"), true);
  assert.equal(isValidContactIdentifier("email", "not-an-email"), false);
});

test("contact identifier digests are stable without exposing the raw value", () => {
  const first = getContactIdentifierDigest("email", "student@kiit.ac.in");
  const second = getContactIdentifierDigest("email", " STUDENT@KIIT.AC.IN ");

  assert.equal(first, second);
  assert.notEqual(first, "student@kiit.ac.in");
  assert.equal(first.length, 64);
});

test("contact shields hide matching accounts in both directions", async () => {
  const userRepository = new UserRepository();
  const shieldService = new ContactShieldService();
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const ownerEmail = `owner-${suffix}@kiit.ac.in`;
  const targetEmail = `target-${suffix}@kiit.ac.in`;
  const createUser = (email: string, username: string) => userRepository.create({
    id: randomUUID(),
    username,
    email,
    passwordHash: "test-hash",
    fullName: username,
    bio: "",
    avatarUrl: null,
    role: "user",
    permissions: ["read:profile"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    settings: { theme: "light", notificationsEnabled: true, privateAccount: false },
    contactIdentityDigest: getContactIdentifierDigest("email", email),
  });

  const owner = await createUser(ownerEmail, `owner-${suffix}`);
  const target = await createUser(targetEmail, `target-${suffix}`);

  try {
    const shields = await shieldService.add(owner.id, [{ type: "email", value: targetEmail }]);
    assert.equal(shields.length, 1);
    assert.equal(await shieldService.canView(owner.id, target.id), false);
    assert.equal(await shieldService.canView(target.id, owner.id), false);
    assert.equal((await shieldService.list(owner.id)).length, 1);

    assert.equal(await shieldService.remove(owner.id, shields[0].id), true);
    assert.equal(await shieldService.canView(owner.id, target.id), true);
    assert.equal(await shieldService.canView(target.id, owner.id), true);
  } finally {
    await db.delete(usersTable).where(eq(usersTable.id, owner.id));
    await db.delete(usersTable).where(eq(usersTable.id, target.id));
  }
});
