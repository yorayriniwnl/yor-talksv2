import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { db, pool } from '@workspace/db';
import { env } from '../config/env.js';
import type { ApprovedTerritoryPolicy, Experience, GuardianAuthorization, ThresholdAssertion } from '../eligibility/types.js';
import { EligibilityRepository } from '../repositories/eligibility-repository.js';
import { ContactAuthorizationDeniedError, ContactAuthorizationService } from '../services/contact-authorization-service.js';
import { EligibilityService } from '../services/eligibility-service.js';
import { MessageService, UnauthorizedError } from '../services/message-service.js';
import { ConversationRepository, MessageRepository } from '../repositories/message-repository.js';
import { UserRepository } from '../repositories/user-repository.js';
import { createEligibilityFixture } from './eligibility-fixtures.js';
import { createTestUser } from './test-helpers.js';

const users=new UserRepository();
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

after(async()=>{await pool.end();});

async function fixture(t:{after(fn:()=>Promise<void>):void}) {
  const ids:string[]=[];
  t.after(async()=>{if(ids.length)await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[ids]);});
  const add=async(experience?:Experience)=>{
    const user=await createTestUser(users);ids.push(user.id);
    await users.update(user.id,{termsVersion:env.TERMS_VERSION,termsAcceptedAt:new Date().toISOString()});
    let guardian:Awaited<ReturnType<typeof createTestUser>>|undefined;
    const guardianAuthorizations:GuardianAuthorization[]=[];
    if(experience==='under_13'||experience==='teen_13_17'){
      guardian=await createTestUser(users);ids.push(guardian.id);
      const thresholds:ThresholdAssertion[]=experience==='under_13'
        ?[{age:13,atLeast:false},{age:18,atLeast:false}]
        :[{age:13,atLeast:true},{age:18,atLeast:false}];
      guardianAuthorizations.push({userId:user.id,id:randomUUID(),guardianUserId:guardian.id,guardianReference:'synthetic-guardian',
        issuer:'isolated-fixture',responsibilityReference:'synthetic-responsibility',status:'granted',purposes:['account_activation','social_contact'],
        noticeVersions:{account_activation:'activation-1',social_contact:'contact-1'},
        policyVersions:{'fixture-recipient':'fixture-1','fixture-operator':'fixture-1'},
        verifiedAt:new Date(now-1000).toISOString(),grantedAt:new Date(now-500).toISOString(),expiresAt:new Date(now+86_400_000).toISOString(),withdrawnAt:null});
      await createEligibilityFixture(user.id,{assessment:{id:randomUUID(),status:'verified',issuer:'isolated-fixture',method:'synthetic-thresholds',
        userId:user.id,experience,thresholds,territory:'ZZ',policyVersions:{'fixture-recipient':'fixture-1','fixture-operator':'fixture-1'},
        verifiedAt:new Date(now-1000).toISOString(),expiresAt:new Date(now+86_400_000).toISOString(),evidenceReference:'opaque-fixture-reference'},guardianAuthorizations});
    }else if(experience==='adult_18_plus'){
      await createEligibilityFixture(user.id);
    }else{
      await createEligibilityFixture(user.id,{assessment:undefined});
    }
    return {user,guardian,guardianAuthorization:guardianAuthorizations[0]};
  };
  const eligibilityRepository=new EligibilityRepository();
  const eligibility=new EligibilityService(eligibilityRepository,{policies:()=>policies,operatorPolicyIds:['fixture-operator'],currentTermsVersion:env.TERMS_VERSION});
  const contacts=new ContactAuthorizationService(undefined,users,eligibility,eligibilityRepository);
  return {add,contacts,eligibilityRepository};
}

test('adult-initiated minor requests and follow-only contact are denied',async t=>{
  const f=await fixture(t),adult=await f.add('adult_18_plus'),teen=await f.add('teen_13_17'),otherTeen=await f.add('teen_13_17');
  await assert.rejects(()=>f.contacts.requestContact(adult.user.id,teen.user.id),ContactAuthorizationDeniedError);
  await users.followUser(teen.user.id,otherTeen.user.id);
  assert.equal(await users.isFollowing(teen.user.id,otherTeen.user.id),true);
  await assert.rejects(()=>f.contacts.requireContact(teen.user.id,otherTeen.user.id,'send'),ContactAuthorizationDeniedError);
  const unknown=await f.add();
  await assert.rejects(()=>f.contacts.requestContact(teen.user.id,unknown.user.id),ContactAuthorizationDeniedError);
});

test('teen contact becomes active only after both teenagers accept',async t=>{
  const f=await fixture(t),initiator=await f.add('teen_13_17'),recipient=await f.add('teen_13_17');
  const request=await f.contacts.requestContact(initiator.user.id,recipient.user.id);
  assert.equal(request.status,'pending');
  assert.equal((await f.contacts.acceptContact(request.id,recipient.user.id)).status,'accepted');
  await f.contacts.requireContact(initiator.user.id,recipient.user.id,'read');
});

test('teen to adult contact requires current guardian approval and withdrawal revokes access',async t=>{
  const f=await fixture(t),teen=await f.add('teen_13_17'),adult=await f.add('adult_18_plus');
  const request=await f.contacts.requestContact(teen.user.id,adult.user.id);
  assert.equal((await f.contacts.acceptContact(request.id,adult.user.id)).status,'pending');
  assert.equal((await f.contacts.approveChildContact(request.id,teen.guardian!.id)).status,'accepted');
  await f.contacts.requireContact(teen.user.id,adult.user.id,'send');
  await db.transaction(tx=>f.eligibilityRepository.withdrawGuardianAuthorization(teen.guardianAuthorization!.id,teen.guardian!.id,tx));
  await assert.rejects(()=>f.contacts.requireContact(teen.user.id,adult.user.id,'deliver'),ContactAuthorizationDeniedError);
});

test('under-13 contact needs recipient acceptance and that child’s guardian approval',async t=>{
  const f=await fixture(t),child=await f.add('under_13'),adult=await f.add('adult_18_plus');
  const request=await f.contacts.requestContact(child.user.id,adult.user.id);
  assert.equal((await f.contacts.acceptContact(request.id,adult.user.id)).status,'pending');
  assert.equal((await f.contacts.approveChildContact(request.id,child.guardian!.id)).status,'accepted');
  await f.contacts.requireContact(child.user.id,adult.user.id,'send');
});

test('two under-13 users each require their own guardian approval',async t=>{
  const f=await fixture(t),initiator=await f.add('under_13'),recipient=await f.add('under_13');
  const request=await f.contacts.requestContact(initiator.user.id,recipient.user.id);
  assert.equal((await f.contacts.acceptContact(request.id,recipient.user.id)).status,'pending');
  assert.equal((await f.contacts.approveChildContact(request.id,initiator.guardian!.id)).status,'pending');
  assert.equal((await f.contacts.approveChildContact(request.id,recipient.guardian!.id)).status,'accepted');
  await f.contacts.requireContact(initiator.user.id,recipient.user.id,'deliver');
});

test('blocking revokes accepted contact permanently, including after unblock',async t=>{
  const f=await fixture(t),a=await f.add('adult_18_plus'),b=await f.add('adult_18_plus');
  const request=await f.contacts.requestContact(a.user.id,b.user.id);
  await f.contacts.acceptContact(request.id,b.user.id);
  await f.contacts.requireContact(a.user.id,b.user.id,'read');
  await users.setSafetyRelationship(a.user.id,b.user.id,'blockedUsers',true);
  await assert.rejects(()=>f.contacts.requireContact(a.user.id,b.user.id,'read'),ContactAuthorizationDeniedError);
  await users.setSafetyRelationship(a.user.id,b.user.id,'blockedUsers',false);
  await assert.rejects(()=>f.contacts.requireContact(a.user.id,b.user.id,'send'),ContactAuthorizationDeniedError);
});

test('an unapproved legacy conversation cannot expose history or accept a message',async t=>{
  const f=await fixture(t),a=await f.add('adult_18_plus'),b=await f.add('adult_18_plus');
  const conversations=new ConversationRepository(),messages=new MessageRepository();
  const conversation=await conversations.findOrCreateDirect(a.user.id,b.user.id);
  await messages.create({id:randomUUID(),conversationId:conversation.id,senderId:a.user.id,recipientId:b.user.id,content:'Legacy private history',
    createdAt:new Date().toISOString(),seenAt:null});
  const service=new MessageService(conversations,messages,users,undefined,undefined,f.contacts);
  assert.deepEqual(await service.listConversation(conversation.id,b.user.id),[]);
  await assert.rejects(()=>service.sendMessageToConversation(b.user.id,conversation.id,'New message'),UnauthorizedError);
});

test('contact withdrawal while a message is staged prevents the database write',async t=>{
  const f=await fixture(t),sender=await f.add('adult_18_plus'),recipient=await f.add('adult_18_plus');
  const request=await f.contacts.requestContact(sender.user.id,recipient.user.id);
  await f.contacts.acceptContact(request.id,recipient.user.id);
  const conversations=new ConversationRepository(),storedMessages=new MessageRepository();
  const allowedService=new MessageService(conversations,storedMessages,users,undefined,undefined,f.contacts);
  const conversation=await allowedService.createConversation(sender.user.id,recipient.user.id);
  let beginWrite!:()=>void,continueWrite!:()=>void;
  const staged=new Promise<void>(resolve=>{beginWrite=resolve;}),wait=new Promise<void>(resolve=>{continueWrite=resolve;});
  const delayedRepository={
    findById:(id:string)=>storedMessages.findById(id),
    findStoredMetadataById:(id:string)=>storedMessages.findStoredMetadataById(id),
    createWithResult:async(message:Parameters<MessageRepository['createWithResult']>[0],authorize?:()=>Promise<void>)=>{
      beginWrite();await wait;return storedMessages.createWithResult(message,authorize);
    },
  } as unknown as MessageRepository;
  const service=new MessageService(conversations,delayedRepository,users,
    {moderate:async()=>({spam:false,toxicity:false,nsfw:false})} as never,undefined,f.contacts);
  const messageId=randomUUID();
  const sending=service.sendMessageToConversation(sender.user.id,conversation.id,'Must not persist',{idempotencyKey:messageId});
  await staged;
  await f.contacts.withdrawContact(request.id,sender.user.id);
  continueWrite();
  await assert.rejects(sending,UnauthorizedError);
  assert.equal(await storedMessages.findById(messageId),undefined);
});
