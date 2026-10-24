import assert from "node:assert/strict";
import test from "node:test";
import { canViewContent, normalizeContentRating } from "../utils/content-safety.js";
import { ContentSafetyService } from "../services/content-safety-service.js";
import { EligibilityService } from "../services/eligibility-service.js";
import type { EligibilityDecision } from "../eligibility/types.js";
import { env } from "../config/env.js";
import { CONTENT_CLASSIFICATION_POLICY_VERSION, contentHashFor, contentRevisionFor, effectiveContentRating } from "../eligibility/content-policy.js";

test("content ratings default to regular", () => {
  assert.equal(normalizeContentRating(undefined), "regular");
  assert.equal(normalizeContentRating("unknown"), "regular");
});

test("viewer filters are cumulative by audience level", () => {
  assert.equal(canViewContent("child_safe", "child_safe"), true);
  assert.equal(canViewContent("regular", "child_safe"), false);
  assert.equal(canViewContent("regular", "regular"), true);
  assert.equal(canViewContent("mature", "regular"), false);
  assert.equal(canViewContent("mature", "mature"), true);
});

test("an author supplied child-safe rating needs approval for the exact current revision", () => {
  const item = { id: "post-id", content: "Reviewed text", contentRating: "child_safe", updatedAt: "2026-10-11T00:00:00.000Z" };
  const contentHash = contentHashFor(item);
  const approval = { entityType: "posts", entityId: item.id, contentRevision: contentRevisionFor(item, contentHash), contentHash,
    classification: "child_safe", issuer: "fixture:reviewer", status: "approved", policyVersion: CONTENT_CLASSIFICATION_POLICY_VERSION,
    approvedAt: "2026-10-11T00:01:00.000Z" } as const;
  assert.equal(effectiveContentRating(item, "posts"), "regular", "self-rating cannot unlock child-safe browsing");
  assert.equal(effectiveContentRating(item, "posts", approval), "child_safe");
  assert.equal(effectiveContentRating({ ...item, content: "Changed text" }, "posts", approval), "regular",
    "an older approval cannot carry over after content changes");
  const liked = { ...item, likesCount: 1, updatedAt: "2026-10-11T00:02:00.000Z" };
  assert.equal(contentRevisionFor(liked),approval.contentRevision,"engagement timestamps do not invalidate content review");
  assert.equal(effectiveContentRating(liked,"posts",approval),"child_safe");
});

test("current eligibility ceiling overrides a mature saved preference", async (t) => {
  const originalNodeEnv = env.NODE_ENV;
  env.NODE_ENV = "production";
  t.after(() => { env.NODE_ENV = originalNodeEnv; });
  const decision: EligibilityDecision = {
    experience: "teen_13_17", activated: true,
    capabilities: { social: true, publish: true, messaging: true, payments: false, seller: false,
      memberships: false, live: false, rtc: false, ai: false, analytics: false, profiling: false },
    maximumContentRating: "regular", policyVersions: ["fixture:1"], revision: "2", reason: null,
    publicBrowsingAllowed: true,
  };
  t.mock.method(EligibilityService.prototype, "decisionFor", async () => decision);
  const viewer = { id: "teen", accountStatus: "active", settings: { contentFilter: "mature" } };
  const service = new ContentSafetyService({ findById: async () => viewer } as never);
  const content = [{ id: "regular", contentRating: "regular" }, { id: "mature", contentRating: "mature" }];
  assert.deepEqual((await service.filterVisible(content, viewer.id)).map((item) => item.id), ["regular"]);
});

test("author visibility is enforced consistently for public and private content", async () => {
  const users = new Map([
    ["owner", { id: "owner", privacy: { profileVisibility: "private" }, settings: { privateAccount: true } }],
    ["follower", { id: "follower", privacy: { profileVisibility: "public" }, settings: { privateAccount: false } }],
  ]);
  const repository = {
    findById: async (id: string) => users.get(id),
    isFollowing: async (followerId: string, followingId: string) => followerId === "follower" && followingId === "owner",
  };
  const service = new ContentSafetyService(repository as never);
  const content = { contentRating: "regular" };

  assert.equal(await service.isVisible(content, undefined, "owner"), false);
  assert.equal(await service.isVisible(content, "follower", "owner"), true);
  assert.equal(await service.isVisible(content, "owner", "owner"), true);
});

test("author visibility denies content across a mutual block", async () => {
  const author = {
    id: "owner",
    privacy: { profileVisibility: "public" },
    blockedUsers: ["viewer"],
  };
  const viewer = {
    id: "viewer",
    privacy: { profileVisibility: "public" },
    blockedUsers: [],
  };
  const repository = {
    findById: async (id: string) => id === author.id ? author : id === viewer.id ? viewer : undefined,
    isFollowing: async () => true,
  } as any;
  const service = new ContentSafetyService(repository);

  assert.equal(await service.isVisible({ contentRating: "regular" }, viewer.id, author.id), false);
});

test("age based privacy overrides stale public profile settings when filtering authored content", async t => {
  const originalNodeEnv=env.NODE_ENV;
  env.NODE_ENV='production';
  t.after(()=>{env.NODE_ENV=originalNodeEnv;});
  const adult: EligibilityDecision={experience:'adult_18_plus',activated:true,
    capabilities:{social:true,publish:true,messaging:true,payments:false,seller:false,memberships:false,live:false,rtc:false,ai:false,analytics:false,profiling:false},
    maximumContentRating:'mature',policyVersions:['fixture:1'],revision:'adult',reason:null,publicBrowsingAllowed:true};
  const teen: EligibilityDecision={...adult,experience:'teen_13_17',maximumContentRating:'regular',revision:'teen'};
  t.mock.method(EligibilityService.prototype,'decisionFor',async (id:string)=>id==='minor'?teen:adult);
  t.mock.method(EligibilityService.prototype,'decisionForMany',async (ids:string[])=>new Map(ids.map(id=>[id,id==='minor'?teen:adult])));
  let following=false;
  const records=new Map([
    ['adult',{id:'adult',accountStatus:'active',settings:{privateAccount:false,contentFilter:'mature'},privacy:{profileVisibility:'public'},blockedUsers:[]}],
    ['minor',{id:'minor',accountStatus:'active',settings:{privateAccount:false,contentFilter:'regular'},privacy:{profileVisibility:'public'},blockedUsers:[]}],
  ]);
  const repository={findById:async(id:string)=>records.get(id),findByIds:async(ids:string[])=>ids.flatMap(id=>records.get(id)??[]),
    audienceRelationships:async()=>({following:new Set(following?['minor']:[]),closeFriends:new Set<string>()})};
  const service=new ContentSafetyService(repository as never,undefined,{findApproved:async()=>[]} as never);
  const post={id:'minor-post',authorId:'minor',content:'Regular post',contentRating:'regular',createdAt:'2026-10-14T00:00:00.000Z',distributionMode:'feed_and_profile',audience:'public'};
  assert.equal(await service.isVisible(post,'adult','minor'),false,'legacy public settings cannot make a minor profile public');
  following=true;
  assert.equal(await service.isVisible(post,'adult','minor'),true,'an established follower can still see the post');
});
