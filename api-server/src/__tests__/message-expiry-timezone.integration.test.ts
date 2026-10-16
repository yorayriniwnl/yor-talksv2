import assert from 'node:assert/strict';
import { after, test, type TestContext } from 'node:test';
import { randomUUID } from 'node:crypto';
import { pool } from '@workspace/db';
import { ConversationRepository, MessageRepository } from '../repositories/message-repository.js';
import { UserRepository } from '../repositories/user-repository.js';
import { MessageService } from '../services/message-service.js';
import { ACCOUNT_EXPORT_COLLECTIONS, buildAccountExportPageQuery, streamAccountExport } from '../services/account-export.js';
import { allowTestContacts, createVerifiedAdultTestUser } from './test-helpers.js';

after(() => pool.end());
const shadowTables = ['messages', 'message_reads', 'message_preview_events', 'user_notes', 'stories',
  'story_polls', 'story_poll_options', 'story_audience_members', 'story_audience_exclusions', 'highlights', 'highlight_items',
  'media_assets', 'media_references'] as const;

async function fixture(t: TestContext, storage: 'timestamp' | 'timestamptz', zone: string) {
  const users = new UserRepository();
  const owner = await createVerifiedAdultTestUser(users);
  const other = await createVerifiedAdultTestUser(users);
  const conversations = new ConversationRepository();
  const conversation = await conversations.findOrCreateDirect(owner.id, other.id);
  t.after(async () => { await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [[owner.id, other.id]]); });
  const client = await pool.connect();
  const release = client.release.bind(client);
  const query = client.query.bind(client);
  let unpin = () => {};
  let restored = false;
  const restore = async () => {
    if (restored) return;
    restored = true;
    unpin();
    try {
      await query('ROLLBACK');
      await query('DISCARD TEMP');
      await query('RESET TimeZone');
    } finally { client.release = release; release(); }
  };
  t.after(restore);
  try {
    await query("SELECT set_config('TimeZone',$1,false)", [zone]);
    for (const table of shadowTables) await query(`CREATE TEMP TABLE ${table} (LIKE public.${table} ${table === 'user_notes' ? 'INCLUDING DEFAULTS' : 'INCLUDING ALL'})`);
    for (const table of ['messages', 'user_notes', 'stories']) {
      await query(`ALTER TABLE pg_temp.${table} ALTER COLUMN expires_at TYPE ${storage}
        USING ${storage === 'timestamp' ? 'expires_at::timestamp' : "expires_at::timestamp AT TIME ZONE 'UTC'"}`);
    }
    // Real repositories and archive transactions share this one checked-out
    // connection. All schema changes affect its private TEMP shadows only.
    client.release = () => undefined;
    const queryMock = t.mock.method(pool, 'query', query);
    const connectMock = t.mock.method(pool, 'connect', async () => client);
    unpin = () => { queryMock.mock.restore(); connectMock.mock.restore(); };
  } catch (error) { await restore(); throw error; }
  const now = new Date();
  const expired = new Date(now.getTime() - 3_600_000).toISOString();
  const future = new Date(now.getTime() + 3_600_000).toISOString();
  return { owner, other, conversation, users, conversations, client, query, now, expired, future, restore };
}

for (const storage of ['timestamp', 'timestamptz'] as const) for (const zone of ['Europe/Berlin', 'America/New_York']) {
  test(`message reads and previews compare UTC instants with ${storage} in ${zone}`, async t => {
    const f = await fixture(t, storage, zone);
    try {
      const messages = new MessageRepository();
      const service = new MessageService(f.conversations, messages, f.users, undefined,
        { hasFeature: async () => true } as never, allowTestContacts);
      const expiredId = randomUUID(), previewId = randomUUID(), readId = randomUUID();
      for (const [id, expiry] of [[expiredId, f.expired], [previewId, f.future], [readId, f.future]]) {
        await messages.create({ id, conversationId: f.conversation.id, senderId: f.owner.id, recipientId: f.other.id,
          content: id === expiredId ? 'Expired private body' : 'Visible body', createdAt: f.now.toISOString(), seenAt: null, expiresAt: expiry });
      }
      const visible = [previewId, readId].sort();
      assert.deepEqual((await messages.listConversation(f.conversation.id)).map(row => row.id).sort(), visible);
      assert.notEqual((await messages.lastMessageForConversation(f.conversation.id))?.id, expiredId);
      assert.equal(await messages.findVisibleById(expiredId), undefined);
      assert.equal(await messages.recordVisiblePreview(expiredId, f.other.id, new Date()), undefined);
      assert.equal(await messages.recordVisibleRead(expiredId, f.other.id), undefined);
      assert.equal((await messages.updateVisible(expiredId, { content: 'Must not reopen' })), undefined);
      assert.equal((await service.previewMessage(previewId, f.other.id))?.content, 'Visible body');
      assert.ok((await service.markSeen(readId, f.other.id))?.seenAt);
      assert.deepEqual((await f.query('SELECT message_id FROM message_preview_events')).rows.map(row => row.message_id), [previewId]);
      assert.deepEqual((await f.query('SELECT message_id FROM message_reads')).rows.map(row => row.message_id), [readId]);
      assert.equal((await f.query('SELECT content FROM messages WHERE id=$1', [expiredId])).rows[0].content, 'Expired private body');
    } finally { await f.restore(); }
  });

  test(`archive expiry scopes preserve one snapshot with ${storage} in ${zone}`, async t => {
    const f = await fixture(t, storage, zone);
    try {
      const liveMessages: string[] = [], liveStories: string[] = [], liveNotes: string[] = [], livePolls: string[] = [], liveOptions: string[] = [];
      const expiredIds: string[] = [];
      const reference = async (entityType: string, entityId: string) => {
        const mediaId = randomUUID();
        await f.query(`INSERT INTO media_assets(id,owner_id,purpose,public_id,resource_type,declared_mime,declared_bytes,upload_expires_at)
          VALUES($1,$2,'post',$3,'image','image/png',10,$4)`, [mediaId, f.owner.id, `isolated-${mediaId}`, f.future]);
        await f.query("INSERT INTO media_references(media_id,entity_type,entity_id,slot) VALUES($1,$2,$3,'mediaUrl')", [mediaId, entityType, entityId]);
      };
      for (const [live, expiry] of [[false, f.expired], [false, f.now.toISOString()], [true, f.future], [true, f.future]] as const) {
        const sent = randomUUID(), received = randomUUID(), story = randomUUID(), note = randomUUID(), poll = randomUUID(), option = randomUUID();
        for (const [id, sender, recipient] of [[sent, f.owner.id, f.other.id], [received, f.other.id, f.owner.id]]) {
          await f.query(`INSERT INTO messages(id,conversation_id,sender_id,recipient_id,content,expires_at,reactions)
            VALUES($1,$2,$3,$4,$5,$6,$7)`, [id, f.conversation.id, sender, recipient,
            live ? 'Permitted archive body' : 'Expired private archive body', expiry, JSON.stringify({ like: [f.owner.id] })]);
          await f.query('INSERT INTO message_reads(message_id,user_id,read_at) VALUES($1,$2,$3)', [id, f.owner.id, f.now.toISOString()]);
          await f.query('INSERT INTO message_preview_events(message_id,user_id,previewed_at) VALUES($1,$2,$3)', [id, f.owner.id, f.now.toISOString()]);
          await reference('messages', id);
          (live ? liveMessages : expiredIds).push(id);
        }
        await f.query('INSERT INTO user_notes(id,author_id,content,expires_at) VALUES($1,$2,$3,$4)',
          [note, f.owner.id, live ? 'Permitted note' : 'Expired private note', expiry]);
        await f.query(`INSERT INTO stories(id,author_id,media_url,type,text_content,expires_at) VALUES($1,$2,'','text',$3,$4)`,
          [story, f.owner.id, live ? 'Permitted story' : 'Expired private story', expiry]);
        await f.query("INSERT INTO story_polls(id,story_id,question) VALUES($1,$2,'Question')", [poll, story]);
        await f.query("INSERT INTO story_poll_options(id,poll_id,text,position) VALUES($1,$2,'Option',0)", [option, poll]);
        await f.query('INSERT INTO story_audience_members(story_id,user_id) VALUES($1,$2)', [story, f.other.id]);
        await f.query('INSERT INTO story_audience_exclusions(story_id,user_id) VALUES($1,$2)', [story, f.other.id]);
        await reference('stories', story);
        await reference('user_notes', note);
        if (live) { liveStories.push(story); liveNotes.push(note); livePolls.push(poll); liveOptions.push(option); }
        else expiredIds.push(story, note, poll, option);
      }
      // Every supported retained-story representation keeps the story and its
      // associated archive scopes after its ordinary expiry instant.
      for (const representation of ['flag', 'highlightId', 'item']) {
        const story = randomUUID(), highlight = randomUUID(), poll = randomUUID(), option = randomUUID();
        await f.query("INSERT INTO highlights(id,owner_id,title) VALUES($1,$2,'Retained fixture')", [highlight, f.owner.id]);
        await f.query(`INSERT INTO stories(id,author_id,media_url,type,text_content,expires_at,is_highlight,highlight_id)
          VALUES($1,$2,'','text','Retained story',$3,$4,$5)`,
          [story, f.owner.id, f.expired, representation === 'flag', representation === 'highlightId' ? highlight : null]);
        if (representation === 'item') await f.query('INSERT INTO highlight_items(highlight_id,story_id,position) VALUES($1,$2,0)', [highlight, story]);
        await f.query("INSERT INTO story_polls(id,story_id,question) VALUES($1,$2,'Retained question')", [poll, story]);
        await f.query("INSERT INTO story_poll_options(id,poll_id,text,position) VALUES($1,$2,'Retained option',0)", [option, poll]);
        await f.query('INSERT INTO story_audience_members(story_id,user_id) VALUES($1,$2)', [story, f.other.id]);
        await f.query('INSERT INTO story_audience_exclusions(story_id,user_id) VALUES($1,$2)', [story, f.other.id]);
        await reference('stories', story);
        liveStories.push(story); livePolls.push(poll); liveOptions.push(option);
      }
      const expected: Record<string, { key: string; ids: string[] }> = {
        sentMessages: { key: 'id', ids: liveMessages.filter((_, i) => i % 2 === 0) },
        receivedMessages: { key: 'id', ids: liveMessages.filter((_, i) => i % 2 === 1) },
        messagesReactions: { key: 'entityId', ids: liveMessages },
        messageReads: { key: 'messageId', ids: liveMessages }, messagePreviews: { key: 'messageId', ids: liveMessages },
        stories: { key: 'id', ids: liveStories }, notes: { key: 'id', ids: liveNotes }, storyPolls: { key: 'id', ids: livePolls },
        storyPollOptions: { key: 'id', ids: liveOptions }, storyAudienceSelections: { key: 'storyId', ids: liveStories },
        storyAudienceExclusions: { key: 'storyId', ids: liveStories },
        references: { key: 'entityId', ids: [...liveMessages, ...liveStories, ...liveNotes] },
      };
      for (const [name, wanted] of Object.entries(expected)) {
        const item = ACCOUNT_EXPORT_COLLECTIONS.find(item => item.name === name)!;
        const result: Record<string, unknown>[] = [];
        let cursor: string[] | null = null;
        while (true) {
          const page: { rows: Array<{ data: Record<string, unknown>; cursor: string[] }> } =
            await f.query(buildAccountExportPageQuery(item, f.owner.id, f.now.toISOString(), cursor, 1));
          result.push(...page.rows.map(row => row.data));
          if (page.rows.length < 1) break;
          cursor = page.rows[0].cursor;
          assert.ok(result.length <= wanted.ids.length + expiredIds.length, 'native keyset positions must advance');
        }
        assert.deepEqual(result.map(row => row[wanted.key]).sort(), [...wanted.ids].sort(), `${name}: same captured instant in every native keyset page`);
      }
      let archive = '';
      for await (const chunk of streamAccountExport(f.owner.id, { pageSize: 1 })) archive += chunk;
      assert.doesNotMatch(archive, /Expired private/);
      const parsed = JSON.parse(archive);
      assert.equal(parsed.content.sentMessages.length, 2);
      assert.equal(parsed.content.receivedMessages.length, 2);
      assert.equal(parsed.content.notes.length, 2);
      assert.equal(parsed.content.stories.length, 5);
      assert.equal(parsed.media.references.length, liveMessages.length + liveStories.length + liveNotes.length);
      assert.equal((await f.query('SHOW TimeZone')).rows[0].TimeZone, zone, 'archive-local UTC must not mutate its caller session');
    } finally { await f.restore(); }
  });
}
