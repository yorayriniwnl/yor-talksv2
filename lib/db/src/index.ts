import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { AsyncLocalStorage } from "node:async_hooks";
import * as schema from "./schema";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/yor_talks";

if (!process.env.DATABASE_URL && process.env.NODE_ENV === "production") {
  console.warn("[Database Warning] DATABASE_URL is not set in environment variables.");
}

export const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS) || 3000,
  idleTimeoutMillis: 10000,
  ssl: process.env.DB_SSL === "true"
    ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" }
    : undefined,
});

pool.on("error", (err) => {
  console.warn("[Database Pool Notice]:", err.message);
});

const database = drizzle(pool, { schema });
export type DbTransaction = Parameters<Parameters<typeof database.transaction>[0]>[0];
const transactions = new AsyncLocalStorage<DbTransaction>();
// Media publication spans existing repositories. Within its explicit transaction
// boundary their Drizzle calls share the same transaction, including savepoints.
export const db = new Proxy(database, {
  get(target, property) {
    const current = transactions.getStore() ?? target;
    const value = Reflect.get(current, property, current);
    return typeof value === "function" ? value.bind(current) : value;
  },
});
export async function runInDatabaseTransaction<T>(work: (tx: DbTransaction) => Promise<T>): Promise<T> {
  const current = transactions.getStore();
  return (current ?? database).transaction(tx => transactions.run(tx, () => work(tx)));
}

export {
  mediaAssetsTable,
  mediaReferencesTable,
  usersTable,
  contactShieldsTable,
  postsTable,
  conversationsTable,
  messagesTable,
  messagePreviewEventsTable,
  notificationsTable,
  profileCommentsTable,
  profileShowcasesTable,
  profilePostPinsTable,
  communitiesTable,
  communityMembersTable,
  broadcastChannelsTable,
  broadcastChannelMembersTable,
  broadcastChannelMessagesTable,
  eventsTable,
  eventRsvpsTable,
  productsTable,
  productSavesTable,
  marketplaceOrdersTable,
  articlesTable,
  videosTable,
  videoCommentsTable,
  videoBookmarksTable,
  liveStreamsTable,
  storiesTable,
  highlightsTable,
  highlightItemsTable,
  storyViewsTable,
  storyViewEventsTable,
  storyReactionsTable,
  userNotesTable,
  userCloseFriendsTable,
  postRepostsTable,
  userFavoriteCreatorsTable,
  postPollsTable,
  postPollOptionsTable,
  postPollVotesTable,
  followRequestsTable,
  storyPollsTable,
  storyPollOptionsTable,
  storyPollVotesTable,
  pushSubscriptionsTable,
  subscriptionsTable,
  entitlementsTable,
  featureEntitlementsTable,
  userFeatureOverridesTable,
  storyAudienceMembersTable,
  storyAudienceExclusionsTable,
  subscriptionOrdersTable,
  creatorAnalyticsDailyTable,
  creatorProfileViewEventsTable,
  productAnalyticsEventsTable,
  productAnalyticsDailyTable,
  productAnalyticsJobsTable,
  insertUserSchema,
  insertPostSchema,
  insertConversationSchema,
  insertMessageSchema,
  insertMessagePreviewEventSchema,
  insertProfilePostPinSchema,
  insertNotificationSchema,
  insertCommunitySchema,
  insertBroadcastChannelSchema,
  insertBroadcastChannelMemberSchema,
  insertBroadcastChannelMessageSchema,
  insertEventSchema,
  insertProductSchema,
  insertArticleSchema,
  insertVideoSchema,
  insertVideoCommentSchema,
  insertLiveStreamSchema,
  insertStorySchema,
  insertHighlightSchema,
  insertHighlightItemSchema,
  insertStoryViewEventSchema,
  insertUserNoteSchema,
  insertUserCloseFriendSchema,
  creatorWorkspaceItemsTable,
  insertCreatorWorkspaceItemSchema,
  insertFeatureEntitlementSchema,
  insertUserFeatureOverrideSchema,
} from "./schema";
