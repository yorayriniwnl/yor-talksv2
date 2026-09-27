import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test, type TestContext } from 'node:test';
import { db, pool, storiesTable, userNotesTable, postsTable } from '@workspace/db';
import { inArray } from 'drizzle-orm';
import { UserRepository } from '../repositories/user-repository.js';
import { StoryRepository } from '../repositories/story-repository.js';
import { NoteRepository } from '../repositories/note-repository.js';
import { ContentSafetyService } from '../services/content-safety-service.js';
import { StoryService } from '../services/story-service.js';
import { NoteService } from '../services/note-service.js';
import { PostRepository } from '../repositories/post-repository.js';
import { SearchService } from '../services/search-service.js';
import { createTestUser } from './test-helpers.js';
import type { StoryRecord, UserRecord } from '../types/index.js';

after(() => pool.end());
const users = new UserRepository(), stories = new StoryRepository(), notes = new NoteRepository();
const safety = new ContentSafetyService(users);
const service = new StoryService(stories, safety, undefined, users);

async function measure<T>(t: TestContext, label: string, fn: () => Promise<T>) {
  let count = 0;
  const original = pool.query.bind(pool);
  const spy = t.mock.method(pool, 'query', ((...args: any[]) => { count++; return (original as any)(...args); }) as any);
  const start = performance.now();
  try {
    const value = await fn();
    t.diagnostic(`${label}: ${count} queries / ${(performance.now()-start).toFixed(1)} ms`);
    return { value, count };
  } finally { spy.mock.restore(); }
}

async function fixture(t: TestContext, size: number) {
  const owned: string[] = [];
  t.after(async () => { await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [owned]); });
  const create = async (overrides: Partial<UserRecord> = {}) => { const user = await createTestUser(users, overrides); owned.push(user.id); return user; };
  const viewer = await create(), authors: UserRecord[] = [];
  const now = new Date().toISOString(), expiresAt = new Date(Date.now()+3600_000).toISOString();
  const storyRows: typeof storiesTable.$inferInsert[] = [], noteRows: typeof userNotesTable.$inferInsert[] = [];
  for (let i=0; i<size; i++) {
    const kind = i%10;
    const author = await create(kind===6 ? { settings: { theme:'light', notificationsEnabled:true, privateAccount:true } } : kind===7 ? { blockedUsers:[viewer.id] } : {});
    authors.push(author);
    if (kind===1 || kind===3) await users.followUser(viewer.id, author.id);
    if (kind===3) await users.addCloseFriend(author.id, viewer.id);
    const audience = ['public','followers','followers','close_friends','selected_people','everyone_except','public','public','public','public'][kind];
    const id = randomUUID();
    storyRows.push({id,authorId:author.id,mediaUrl:'',type:'text',textContent:'Synthetic audience fixture',audience,
      createdAt:now,publishedAt:now,expiresAt,contentRating:kind===9?'mature':'regular'});
    noteRows.push({id:randomUUID(),authorId:author.id,content:'Synthetic note fixture',createdAt:now,expiresAt,
      audience:kind===4?'public':kind===5?'close_friends':audience,contentRating:kind===9?'mature':'regular'});
  }
  await db.insert(storiesTable).values(storyRows);
  await db.insert(userNotesTable).values(noteRows);
  for (let i=0; i<size; i++) {
    if (i%10===4) await pool.query('INSERT INTO story_audience_members(story_id,user_id) VALUES($1,$2)',[storyRows[i].id,viewer.id]);
    if (i%10===5) await pool.query('INSERT INTO story_audience_exclusions(story_id,user_id) VALUES($1,$2)',[storyRows[i].id,viewer.id]);
  }
  await users.update(viewer.id,{mutedUsers:authors.filter((_,i)=>i%10===8).map(u=>u.id)});
  return {viewer,authors,storyRows,noteRows,create};
}

test('Story and Note discovery batch mixed audiences and retain ranking with constant query counts', async t => {
  const f = await fixture(t,50), storyIds = new Set(f.storyRows.map(row=>row.id)), noteIds = new Set(f.noteRows.map(row=>row.id));
  const expected = f.storyRows.filter((_,i)=>[0,1,3,4].includes(i%10)).map(row=>row.id).sort();
  // Reproduce the former per-item visibility and relationship pipeline against
  // exactly these 50 real records; omit its old missing mute rule from comparison.
  const raw = await db.select().from(storiesTable).where(inArray(storiesTable.id,[...storyIds]));
  const baseline = await measure(t,'Former Story per-item policy (50 distinct authors)',async()=>{
    const visible = (await Promise.all(raw.map(async row=>await service.canViewStory(row as StoryRecord,f.viewer.id)?row:undefined))).filter(Boolean);
    await Promise.all(visible.map(async row=>await users.isCloseFriend(row!.authorId,f.viewer.id)||await users.isFollowing(f.viewer.id,row!.authorId)));
    return visible;
  });
  assert.ok(baseline.count >= 200);
  for (let sample=1; sample<=3; sample++) {
    const batch = await measure(t,`Story list sample ${sample}`,()=>service.listActiveStories(f.viewer.id));
    assert.ok(batch.count<=9, `bounded query count, observed ${batch.count}`);
    assert.deepEqual(batch.value.filter(row=>storyIds.has(row.id)).map(row=>row.id).sort(),expected);
    const ranked = batch.value.filter(row=>storyIds.has(row.id));
    assert.ok(ranked.slice(0,5).every(row=>f.authors.findIndex(author=>author.id===row.authorId)%10===3));
  }
  const noteService = new NoteService(notes, users, safety);
  const result = await measure(t,'Note list (50 distinct authors)',()=>noteService.listVisibleNotes(f.viewer.id));
  assert.equal(result.count,3);
  assert.deepEqual(result.value.filter(row=>noteIds.has(row.id)).map(row=>row.id).sort(),f.noteRows.filter((_,i)=>[0,1,3,4].includes(i%10)).map(row=>row.id).sort());
  const anonymous = await service.listActiveStories();
  assert.deepEqual(anonymous.filter(row=>storyIds.has(row.id)).map(row=>row.id).sort(),f.storyRows.filter((_,i)=>[0,7,8].includes(i%10)).map(row=>row.id).sort());
});

test('restricted newest candidates cannot starve an older eligible Story or Note', async t => {
  const f=await fixture(t,10), viewer=f.viewer;
  const story=f.storyRows[0], note=f.noteRows[0];
  // More restricted authors than the API result limit, all newer than the fixture.
  for (let i=0; i<105; i++) {
    const author=await f.create();
    const createdAt=new Date(Date.now()+i).toISOString(), expiresAt=new Date(Date.now()+3600_000).toISOString();
    await db.insert(storiesTable).values({id:randomUUID(),authorId:author.id,type:'text',mediaUrl:'',audience:'followers',createdAt,publishedAt:createdAt,expiresAt});
    await db.insert(userNotesTable).values({id:randomUUID(),authorId:author.id,content:'restricted',audience:'followers',createdAt,expiresAt});
  }
  assert.ok((await service.listActiveStories(viewer.id)).some(row=>row.id===story.id));
  assert.ok((await new NoteService(notes,users,safety).listVisibleNotes(viewer.id)).some(row=>row.id===note.id));
  await users.update(f.authors[0].id,{blockedUsers:[viewer.id]});
  assert.ok(!(await service.listActiveStories(viewer.id)).some(row=>row.id===story.id));
  await users.update(f.authors[0].id,{blockedUsers:[],accountStatus:'suspended'});
  assert.ok(!(await service.listActiveStories(f.authors[0].id)).some(row=>row.id===story.id));
  assert.ok(!(await new NoteService(notes,users,safety).listVisibleNotes(f.authors[0].id)).some(row=>row.id===note.id));
});

test('SQL Story candidates and final policy agree across current privacy, relationship, block and rating changes',async t=>{
  const f=await fixture(t,10), author=f.authors[4], id=f.storyRows[4].id;
  const visible=async()=> (await service.listActiveStories(f.viewer.id)).some(row=>row.id===id);
  assert.equal(await visible(),true);
  await users.update(author.id,{privacy:{profileVisibility:'private',messageRequests:true,allowDmFromStrangers:false}});
  assert.equal(await visible(),false);
  await users.followUser(f.viewer.id,author.id);
  assert.equal(await visible(),true);
  await pool.query('DELETE FROM story_audience_members WHERE story_id=$1',[id]);
  assert.equal(await visible(),false);
  await pool.query(`UPDATE stories SET audience='everyone_except' WHERE id=$1`,[id]);
  assert.equal(await visible(),true);
  await pool.query('INSERT INTO story_audience_exclusions(story_id,user_id) VALUES($1,$2)',[id,f.viewer.id]);
  assert.equal(await visible(),false);
  await users.update(f.viewer.id,{settings:{...f.viewer.settings,contentFilter:'child_safe'}});
  const fixtureIds=new Set(f.storyRows.map(row=>row.id));
  assert.equal((await service.listActiveStories(f.viewer.id)).filter(row=>fixtureIds.has(row.id)).length,0);
  await users.update(f.viewer.id,{settings:{...f.viewer.settings,contentFilter:'mature'}});
  assert.ok((await service.listActiveStories(f.viewer.id)).some(row=>row.id===f.storyRows[9].id));
});

test('both search implementations batch fifty distinct authors and filter before the candidate cap',async t=>{
  const f=await fixture(t,50), marker=randomUUID();
  const records=f.authors.map((author,i)=>({id:randomUUID(),authorId:author.id,content:marker,
    audience:i%10===1||i%10===2?'followers':i%10===3?'close_friends':'public',contentRating:i%10===9?'mature':'regular'}));
  await db.insert(postsTable).values(records);
  const raw=await db.select().from(postsTable).where(inArray(postsTable.id,records.map(row=>row.id)));
  const previous=await measure(t,'Former per-item search visibility (50 authors)',()=>Promise.all(raw.map(row=>safety.isVisible(row,f.viewer.id,row.authorId))));
  assert.equal(previous.count,100);
  const expected=records.filter((_,i)=>[0,1,3,4,5].includes(i%10)).map(row=>row.id).sort();
  // These new private posts used to consume the whole 250-candidate allowance.
  await db.insert(postsTable).values(Array.from({length:260},()=>({id:randomUUID(),authorId:f.authors[6].id,content:marker})));
  for (const mode of ['auto','fallback'] as const) {
    const search=new SearchService(users,new PostRepository(mode));
    for(let sample=1;sample<=3;sample++){
      const result=await measure(t,`${mode} full search sample ${sample}`,()=>search.search(marker,f.viewer.id));
      assert.ok(result.count<=12,`bounded query count, observed ${result.count}`);
      assert.deepEqual(result.value.posts.map(row=>row.id).sort(),expected);
    }
  }
});
