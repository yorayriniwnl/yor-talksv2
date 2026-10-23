import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { usersTable } from './index';

const instant = (name: string) => timestamp(name, { withTimezone: true, mode: 'string' });

// Only public identity material is stored here. Private/recovery keys remain on
// participant devices. The migration makes enrolled identities immutable.
export const privateChatIdentitiesTable = pgTable('private_chat_identities', {
  userId: uuid('user_id').primaryKey().references(() => usersTable.id, { onDelete: 'cascade' }),
  publicKey: text('public_key').notNull(),
  fingerprint: text('fingerprint').notNull(),
  createdAt: instant('created_at').notNull().defaultNow(),
}, table => ({
  fingerprintIdx: uniqueIndex('private_chat_identity_fingerprint_idx').on(table.fingerprint),
  valid: check('private_chat_identity_valid_check', sql`octet_length(${table.publicKey}) BETWEEN 100 AND 65536
    AND ${table.fingerprint} ~ '^[0-9a-f]{64}$'
    AND ${table.publicKey} LIKE '-----BEGIN PGP PUBLIC KEY BLOCK-----%'`),
}));

export const privateChatThreadsTable = pgTable('private_chat_threads', {
  id: uuid('id').primaryKey(),
  userAId: uuid('user_a_id').notNull().references(() => privateChatIdentitiesTable.userId, { onDelete: 'cascade' }),
  userBId: uuid('user_b_id').notNull().references(() => privateChatIdentitiesTable.userId, { onDelete: 'cascade' }),
  createdAt: instant('created_at').notNull().defaultNow(),
  updatedAt: instant('updated_at').notNull().defaultNow(),
}, table => ({
  pairIdx: uniqueIndex('private_chat_thread_pair_idx').on(table.userAId, table.userBId),
  recipientIdx: index('private_chat_thread_recipient_idx').on(table.userBId, table.updatedAt),
  orderedPair: check('private_chat_thread_pair_check', sql`${table.userAId} < ${table.userBId}`),
}));

export const privateChatEnvelopesTable = pgTable('private_chat_envelopes', {
  id: uuid('id').primaryKey(),
  threadId: uuid('thread_id').notNull().references(() => privateChatThreadsTable.id, { onDelete: 'cascade' }),
  senderId: uuid('sender_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  ciphertext: text('ciphertext').notNull(),
  createdAt: instant('created_at').notNull().defaultNow(),
}, table => ({
  pageIdx: index('private_chat_envelope_page_idx').on(table.threadId, table.createdAt, table.id),
  valid: check('private_chat_envelope_valid_check', sql`octet_length(${table.ciphertext}) BETWEEN 100 AND 2097152
    AND ${table.ciphertext} LIKE '-----BEGIN PGP MESSAGE-----%'`),
}));
