import * as schema from "./schema";
export declare const pool: import("pg").Pool;
export declare const db: import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema> & {
    $client: import("pg").Pool;
};
export { usersTable, postsTable, conversationsTable, messagesTable, notificationsTable, communitiesTable, insertUserSchema, insertPostSchema, insertConversationSchema, insertMessageSchema, insertNotificationSchema, insertCommunitySchema } from "./schema";
//# sourceMappingURL=index.d.ts.map