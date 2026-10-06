import { pgTable, uuid, text, integer, timestamp, jsonb, doublePrecision, index, primaryKey } from "drizzle-orm/pg-core";
import { usersTable } from "./index";

export const mediaAssetsTable = pgTable("media_assets", {
  id: uuid("id").primaryKey(),
  ownerId: uuid("owner_id").references(() => usersTable.id, { onDelete: "set null" }),
  purpose: text("purpose").notNull(),
  provider: text("provider").notNull().default("cloudinary"),
  status: text("status").notNull().default("pending"),
  publicId: text("public_id").notNull().unique(),
  resourceType: text("resource_type").notNull(),
  declaredMime: text("declared_mime").notNull(),
  declaredBytes: integer("declared_bytes").notNull(),
  providerAssetId: text("provider_asset_id"),
  providerVersion: integer("provider_version"),
  providerFormat: text("provider_format"),
  verifiedMime: text("verified_mime"),
  verifiedBytes: integer("verified_bytes"),
  sha256: text("sha256"),
  width: integer("width"),
  height: integer("height"),
  durationSeconds: doublePrecision("duration_seconds"),
  moderationJson: jsonb("moderation_json"),
  verificationToken: uuid("verification_token"),
  verificationUntil: timestamp("verification_until", { withTimezone: true, mode: "string" }),
  deletionStatus: text("deletion_status").notNull().default("none"),
  deletionAttempts: integer("deletion_attempts").notNull().default(0),
  deletionToken: uuid("deletion_token"),
  deletionUntil: timestamp("deletion_until", { withTimezone: true, mode: "string" }),
  cleanupAt: timestamp("cleanup_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  uploadExpiresAt: timestamp("upload_expires_at", { withTimezone: true, mode: "string" }).notNull(),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  finalizedAt: timestamp("finalized_at", { withTimezone: true, mode: "string" }),
}, table => ({ cleanupIdx: index("media_assets_cleanup_idx").on(table.deletionStatus, table.cleanupAt), ownerIdx: index("media_assets_owner_idx").on(table.ownerId, table.status) }));

export const mediaReferencesTable = pgTable("media_references", {
  mediaId: uuid("media_id").notNull().references(() => mediaAssetsTable.id),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  slot: text("slot").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, table => ({ pk: primaryKey({ columns: [table.mediaId, table.entityType, table.entityId, table.slot] }), entityIdx: index("media_references_entity_idx").on(table.entityType, table.entityId) }));
