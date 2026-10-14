import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { db, pool } from '@workspace/db';
import { env } from '../config/env.js';
import type { ApprovedTerritoryPolicy, Experience, GuardianAuthorization, ThresholdAssertion } from '../eligibility/types.js';
import { EligibilityRepository } from '../repositories/eligibility-repository.js';
import { ConversationRepository, MessageRepository } from '../repositories/message-repository.js';
import { UserRepository } from '../repositories/user-repository.js';
import { ContactAuthorizationService } from '../services/contact-authorization-service.js';
import { EligibilityService } from '../services/eligibility-service.js';
import { MessageService, UnauthorizedError } from '../services/message-service.js';
import { createEligibilityFixture } from './eligibility-fixtures.js';
import { createTestUser } from './test-helpers.js';

after(async()=>{await pool.end();});

const now=Date.now();
const policies:ApprovedTerritoryPolicy[]=(['recipient','operator'] as const).map(scope=>({
  id:scope==='recipient'?'fixture-recipient':'fixture-operator',scope,territory:scope==='recipient'?'ZZ':'EE',version:'fixture-1',
  approved:true,synthetic:true,approvalReference:'isolated-fixture',effectiveFrom:new Date(now-60_000).toISOString(),
  reviewExpiresAt:new Date(now+86_400_000).toISOString(),sources:['https://legal.example/fixture'],
  allowedExperiences:['under_13','teen_13_17','adult_18_plus'],minimumAccessThreshold:null,independentConsentThreshold:13,
  guardianRequiredBelow:null,requiredGuardianPurposes:['account_activation','social_contact'],
  guardianNoticeVersions:{account_activation:'activation-1',social_contact:'contact-1'},currentTermsVersion:env.TERMS_VERSION,
  guardianContactsRequired:true,publicBrowsingAllowed:true,maximumContentRating:'mature',
  capabilities:{social:true,publish:true,messaging:true,payments:false,seller:false,memberships:false,live:false,rtc:false,ai:false,analytics:false,profiling:false},
}));

async function fixture(t:{after(fn:()=>Promise<void>):void}){
  const ids:string[]=[];
  t.after(async()=>{if(ids.length)await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[ids]);});
  const add=async(experience:Experience)=>{
    const user=await createTestUser(new UserRepository());ids.push(user.id);
    await new UserRepository().update(user.id,{termsVersion:env.TERMS_VERSION,termsAcceptedAt:new Date().toISOString()});
    let guardian:Awaited<ReturnType<typeof createTestUser>>|undefined;
    let guardianAuthorization:GuardianAuthorization|undefined;
    if(experience==='under_13'||experience==='teen_13_17'){
      guardian=await createTestUser(new UserRepository());ids.push(guardian.id);
      const thresholds:ThresholdAssertion[]=experience==='under_13'
        ?[{age:13,atLeast:false},{age:18,atLeast:false}]
        :[{age:13,atLeast:true},{age:18,atLeast:false}];
      guardianAuthorization={userId:user.id,id:randomUUID(),guardianUserId:guardian.id,guardianReference:'synthetic-guardian',
        issuer:'isolated-fixture',responsibilityReference:'synthetic-responsibility',status:'granted',purposes:['account_activation','social_contact'],
        noticeVersions:{account_activation:'activation-1',social_contact:'contact-1'},
        policyVersions:{'fixture-recipient':'fixture-1','fixture-operator':'fixture-1'},
        verifiedAt:new Date(now-1000).toISOString(),grantedAt:new Date(now-500).toISOString(),expiresAt:new Date(now+86_400_000).toISOString(),withdrawnAt:null};
      await createEligibilityFixture(user.id,{assessment:{id:randomUUID(),status:'verified',issuer:'isolated-fixture',method:'synthetic-thresholds',
        userId:user.id,experience,thresholds,territory:'ZZ',policyVersions:{'fixture-recipient':'fixture-1','fixture-operator':'fixture-1'},
        verifiedAt:new Date(now-1000).toISOString(),expiresAt:new Date(now+86_400_000).toISOString(),evidenceReference:'opaque-fixture-reference'},
        guardianAuthorizations:[guardianAuthorization]});
    }else await createEligibilityFixture(user.id);
    return {user,guardian,guardianAuthorization};
  };
  const users=new UserRepository(),conversations=new ConversationRepository(),messages=new MessageRepository();
  const eligibilityRepository=new EligibilityRepository();
  const eligibility=new EligibilityService(eligibilityRepository,{policies:()=>policies,operatorPolicyIds:['fixture-operator'],currentTermsVersion:env.TERMS_VERSION});
  const contacts=new ContactAuthorizationService(undefined,users,eligibility,eligibilityRepository);
  const messageService=new MessageService(conversations,messages,users,
    {moderate:async()=>({spam:false,toxicity:false,nsfw:false})} as never,undefined,contacts);
  return {add,users,conversations,messages,contacts,eligibilityRepository,messageService};
}

test('pending invitees see no group history and accepted membership is added only after consent',async t=>{
  const f=await fixture(t),creator=await f.add('adult_18_plus'),invitee=await f.add('adult_18_plus');
  const created=await f.messageService.createGroupChat(creator.user.id,[invitee.user.id],'Pending history');
  const conversation=created,invitation=created.invitations[0]!;
  await f.messageService.sendMessageToConversation(creator.user.id,conversation.id,'Visible only after joining');
  assert.deepEqual(await f.conversations.getMembers(conversation.id),[creator.user.id]);
  assert.deepEqual(await f.messageService.listConversation(conversation.id,invitee.user.id),[]);
  assert.equal((await f.messageService.getConversationsForUser(invitee.user.id)).some(value=>value.conversation.id===conversation.id),false);
  assert.equal(await f.messageService.previewMessage((await f.messages.lastMessageForConversation(conversation.id))!.id,invitee.user.id),undefined);
  await assert.rejects(()=>f.messageService.authorizeConversationDelivery(conversation.id,invitee.user.id),UnauthorizedError);
  const result=await f.messageService.acceptGroupInvitation(invitation.id,invitee.user.id,invitation.updatedAt);
  assert.equal(result.invitation.status,'accepted');
  assert.deepEqual(await f.conversations.getMembers(conversation.id),[creator.user.id,invitee.user.id].sort());
  assert.equal((await f.messageService.listConversation(conversation.id,invitee.user.id)).length,1);
});

test('a minor cannot add an adult until the guardian approves, and withdrawal revokes group access',async t=>{
  const f=await fixture(t),child=await f.add('under_13'),adult=await f.add('adult_18_plus');
  const created=await f.messageService.createGroupChat(child.user.id,[adult.user.id],'Guardian gated');
  const invitation=created.invitations[0]!;
  const acceptedByAdult=await f.messageService.acceptGroupInvitation(invitation.id,adult.user.id,invitation.updatedAt);
  assert.equal(acceptedByAdult.invitation.status,'pending');
  assert.deepEqual(await f.conversations.getMembers(created.id),[child.user.id]);
  const approved=await f.messageService.approveGroupInvitation(invitation.id,child.guardian!.id,acceptedByAdult.invitation.updatedAt);
  assert.equal(approved.invitation.status,'accepted');
  assert.deepEqual(await f.conversations.getMembers(created.id),[child.user.id,adult.user.id].sort());
  await f.messageService.sendMessageToConversation(child.user.id,created.id,'Child-approved group');
  await db.transaction(tx=>f.eligibilityRepository.withdrawGuardianAuthorization(child.guardianAuthorization!.id,child.guardian!.id,tx));
  assert.deepEqual(await f.messageService.listConversation(created.id,adult.user.id),[]);
  await assert.rejects(()=>f.messageService.sendMessageToConversation(adult.user.id,created.id,'After withdrawal'),UnauthorizedError);
});

test('a revoked pair contact cannot be reintroduced through a pending group invitation',async t=>{
  const f=await fixture(t),first=await f.add('adult_18_plus'),second=await f.add('adult_18_plus');
  const request=await f.contacts.requestContact(first.user.id,second.user.id);
  await f.contacts.acceptContact(request.id,second.user.id);
  const created=await f.messageService.createGroupChat(first.user.id,[second.user.id],'Revoked pair');
  await f.contacts.withdrawContact(request.id,first.user.id);
  await assert.rejects(()=>f.messageService.acceptGroupInvitation(created.invitations[0]!.id,second.user.id,created.invitations[0]!.updatedAt),UnauthorizedError);
  assert.deepEqual(await f.conversations.getMembers(created.id),[first.user.id]);
});

test('simultaneous accepts serialize and refresh the remaining invite before it can add another adult',async t=>{
  const f=await fixture(t),teen=await f.add('teen_13_17'),guardian=teen.guardian!,firstAdult=await f.add('adult_18_plus'),secondAdult=await f.add('adult_18_plus');
  const created=await f.messageService.createGroupChat(teen.user.id,[firstAdult.user.id,secondAdult.user.id],'Serialized accepts');
  for(const invitation of created.invitations)await f.messageService.approveGroupInvitation(invitation.id,guardian.id,invitation.updatedAt);
  const [first,second]=created.invitations;
  const results=await Promise.allSettled([
    f.messageService.acceptGroupInvitation(first!.id,firstAdult.user.id,first!.updatedAt),
    f.messageService.acceptGroupInvitation(second!.id,secondAdult.user.id,second!.updatedAt),
  ]);
  assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
  assert.equal(results.filter(result=>result.status==='rejected').length,1);
  const waitingUser=results[0]?.status==='fulfilled'?secondAdult:firstAdult;
  const refreshed=(await f.messageService.listGroupInvitations(waitingUser.user.id))[0]!;
  assert.notEqual(refreshed.updatedAt,results[0]?.status==='fulfilled'?second!.updatedAt:first!.updatedAt);
  await assert.rejects(()=>f.messageService.acceptGroupInvitation(refreshed.id,waitingUser.user.id,
    results[0]?.status==='fulfilled'?second!.updatedAt:first!.updatedAt),UnauthorizedError);
  const reapproved=await f.messageService.approveGroupInvitation(refreshed.id,guardian.id,refreshed.updatedAt);
  const completed=await f.messageService.acceptGroupInvitation(refreshed.id,waitingUser.user.id,reapproved.invitation.updatedAt);
  assert.equal(completed.invitation.status,'accepted');
});

test('legacy JSON group participants do not become accepted membership',async t=>{
  const f=await fixture(t),first=await f.add('adult_18_plus'),second=await f.add('adult_18_plus');
  const conversationId=randomUUID(),createdAt=new Date().toISOString();
  await pool.query(`INSERT INTO conversations (id,participant_a,participant_b,participant_ids,is_group,title,created_at,updated_at)
    VALUES ($1,$2,$2,$3::jsonb,true,'Legacy group',$4,$4)`,[conversationId,first.user.id,JSON.stringify([first.user.id,second.user.id]),createdAt]);
  await f.messages.create({id:randomUUID(),conversationId,senderId:first.user.id,recipientId:second.user.id,content:'Legacy history',createdAt,seenAt:null});
  assert.deepEqual(await f.conversations.getMembers(conversationId),[]);
  assert.equal((await f.conversations.listForUser(second.user.id)).some(value=>value.id===conversationId),false);
  assert.deepEqual(await f.messageService.listConversation(conversationId,second.user.id),[]);
});
