import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';
import { pool } from '@workspace/db';
import { MediaService } from '../services/media-service.js';
import type { MediaProvider, MediaUploadIntent } from '../services/media-provider.js';
import { createTestApprovedMedia } from './media-fixtures.js';

after(() => pool.end());

for (const storage of ['timestamp', 'timestamptz'] as const) {
  for (const zone of ['UTC', 'Asia/Calcutta', 'America/New_York']) {
    test(`the actual cleanup sweep preserves live media with ${storage} in ${zone}`, async (t) => {
      assert.equal(process.env.NODE_ENV, 'test');
      assert.ok(process.env.DATABASE_URL, 'An explicit disposable DATABASE_URL is required');
      const client = await pool.connect();
      const query = client.query.bind(client), release = client.release.bind(client);
      let restorePool = () => {};
      try {
        await query("SELECT set_config('TimeZone',$1,false)", [zone]);
        await query(`CREATE TEMP TABLE messages(id uuid PRIMARY KEY,expires_at ${storage},deleted_at timestamptz)`);
        await query(`CREATE TEMP TABLE stories(id uuid PRIMARY KEY,expires_at ${storage},is_highlight boolean,highlight_id uuid)`);
        await query('CREATE TEMP TABLE highlight_items(story_id uuid,highlight_id uuid)');
        for (const table of ['media_assets', 'media_references']) await query(`CREATE TEMP TABLE ${table}(LIKE public.${table} INCLUDING ALL)`);
        await query(`CREATE TRIGGER media_last_reference_cleanup AFTER DELETE ON pg_temp.media_references
          FOR EACH ROW EXECUTE FUNCTION public.media_last_reference_deleted()`);
        // The actual service, including its Drizzle transaction and provider
        // work, uses one checked-out connection with private TEMP tables.
        client.release = () => undefined;
        const queryMock = t.mock.method(pool, 'query', query);
        const connectMock = t.mock.method(pool, 'connect', async () => client);
        restorePool = () => { queryMock.mock.restore(); connectMock.mock.restore(); };
        const now = Date.now(), future = new Date(now + 3_600_000).toISOString(), past = new Date(now - 3_600_000).toISOString();
        const removed: string[] = [], expectedRemoved: string[] = [], expectedRetained: string[] = [];
        for (const kind of ['messages', 'stories'] as const) {
          for (const state of kind === 'messages' ? ['live', 'expired', 'deleted', 'timeless'] : ['live', 'expired', 'highlightFlag', 'highlightId', 'highlightItem']) {
            const id = randomUUID();
            const expiry = state === 'timeless' ? null : state === 'live' || state === 'deleted' ? future : past;
            if (kind === 'messages') await query('INSERT INTO pg_temp.messages VALUES($1,$2,$3)', [id, expiry, state === 'deleted' ? new Date(now).toISOString() : null]);
            else {
              await query('INSERT INTO pg_temp.stories VALUES($1,$2,$3,$4)', [id, expiry, state === 'highlightFlag', state === 'highlightId' ? randomUUID() : null]);
              if (state === 'highlightItem') await query('INSERT INTO pg_temp.highlight_items VALUES($1,$2)', [id, randomUUID()]);
            }
            const asset = await createTestApprovedMedia(randomUUID(), kind === 'messages' ? 'message' : 'story');
            await query("INSERT INTO pg_temp.media_references(media_id,entity_type,entity_id,slot) VALUES($1,$2,$3,'mediaUrl')", [asset.id, kind, id]);
            (state === 'expired' || state === 'deleted' ? expectedRemoved : expectedRetained).push(asset.id);
          }
        }
        const provider = { deletePendingUpload: async (intent: MediaUploadIntent) => { removed.push(intent.id); } } as unknown as MediaProvider;
        assert.deepEqual(await new MediaService(provider).cleanup(100), { deleted: expectedRemoved.length, failed: 0 });
        assert.deepEqual(removed.sort(), expectedRemoved.sort(), 'only actually expired or explicitly deleted media reaches provider deletion');
        const references = await query<{ media_id: string }>('SELECT media_id FROM pg_temp.media_references ORDER BY media_id');
        assert.deepEqual(references.rows.map(row => row.media_id), expectedRetained.sort());
        const live = await query<{ id: string; status: string; deletion_status: string }>('SELECT id,status,deletion_status FROM pg_temp.media_assets WHERE id=ANY($1::uuid[])', [expectedRetained]);
        assert.equal(live.rows.length, expectedRetained.length);
        for (const asset of live.rows) {
          assert.equal(asset.status, 'approved');
          assert.equal(asset.deletion_status, 'none');
        }
      } finally {
        restorePool();
        try {
          await query('ROLLBACK');
          await query('DISCARD TEMP');
          await query('RESET TimeZone');
        } finally { client.release = release; release(); }
      }
    });
  }
}
