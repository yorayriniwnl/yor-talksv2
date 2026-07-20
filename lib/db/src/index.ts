import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export {
  usersTable,
  postsTable,
  conversationsTable,
  messagesTable,
  notificationsTable,
  communitiesTable,
  insertUserSchema,
  insertPostSchema,
  insertConversationSchema,
  insertMessageSchema,
  insertNotificationSchema,
  insertCommunitySchema
} from "./schema";
