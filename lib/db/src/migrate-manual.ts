import { db } from "./index";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Migrating...");
  await db.execute(sql`ALTER TABLE posts DROP COLUMN IF EXISTS liked_by`);
  await db.execute(sql`ALTER TABLE posts DROP COLUMN IF EXISTS comments`);
  await db.execute(sql`ALTER TABLE posts DROP COLUMN IF EXISTS bookmarked_by`);
  await db.execute(sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS likes_count integer NOT NULL DEFAULT 0`);
  await db.execute(sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS comments_count integer NOT NULL DEFAULT 0`);
  await db.execute(sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS bookmarks_count integer NOT NULL DEFAULT 0`);

  await db.execute(sql`ALTER TABLE users DROP COLUMN IF EXISTS followers`);
  await db.execute(sql`ALTER TABLE users DROP COLUMN IF EXISTS following`);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS post_likes (
      post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamp NOT NULL DEFAULT now(),
      PRIMARY KEY (post_id, user_id)
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS post_bookmarks (
      post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamp NOT NULL DEFAULT now(),
      PRIMARY KEY (post_id, user_id)
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS user_follows (
      follower_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      following_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at timestamp NOT NULL DEFAULT now(),
      PRIMARY KEY (follower_id, following_id)
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS reel_views (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES users(id) ON DELETE CASCADE,
      reel_id uuid NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
      started_at timestamp NOT NULL DEFAULT now(),
      watched_ms integer NOT NULL DEFAULT 0,
      completed boolean NOT NULL DEFAULT false,
      rewatched boolean NOT NULL DEFAULT false
    )
  `);
  console.log("Migrated!");
  process.exit(0);
}
run();
