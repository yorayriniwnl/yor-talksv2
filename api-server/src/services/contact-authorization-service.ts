import { randomUUID } from 'node:crypto';
import { db } from '@workspace/db';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { conversationInvitationApprovalsTable, conversationInvitationsTable } from '@workspace/db/schema';
import { EligibilityRepository } from '../repositories/eligibility-repository.js';
import { ContactAuthorizationRepository, type ContactAuthorizationRecord } from '../repositories/contact-authorization-repository.js';
import { UserRepository } from '../repositories/user-repository.js';
import { EligibilityService } from './eligibility-service.js';
import type { EligibilityDecision, EligibilityFacts } from '../eligibility/types.js';

export type SafeContactRequest = {
  id:string; initiatorId:string; recipientId:string; status:ContactAuthorizationRecord['state']; createdAt:string;
  updatedAt:string; requiresYourAcceptance:boolean; guardianApprovalRequired:boolean;
};
export type GroupInvitationState='pending'|'accepted'|'rejected'|'revoked';
export type GroupInvitationAuthorityRecord={id:string;conversationId:string;inviterId:string;inviteeId:string;state:GroupInvitationState;
  memberIdsAtInvite:string[];guardianRequiredUserIds:string[];policyVersions:Record<string,string>;recipientAcceptedAt:string|null};
export type GroupInvitationApproval={childUserId:string;guardianUserId:string;guardianAuthorizationId:string;policyVersions:Record<string,string>};
export type GroupInvitationPolicy={policyVersions:Record<string,string>;guardianRequiredUserIds:string[]};
export class ContactAuthorizationDeniedError extends Error { readonly code='contact_authorization_denied'; }
type ContactRules=Awaited<ReturnType<EligibilityService['contactRulesFor']>>;
type PairAuthority={ decisions:Map<string,EligibilityDecision>; rules:Map<string,ContactRules>; snapshot:Record<string,string>; guardianContactsRequired:boolean };
const denied=(message='This contact is not authorized')=>new ContactAuthorizationDeniedError(message);
const canonical=(value:Record<string,string>)=>Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)));
const pair= (a:string,b:string)=>[a,b].sort();

/** Current, explicit contact authority. Follow state and old conversation membership never grant access. */
export class ContactAuthorizationService {
  constructor(private readonly repository=new ContactAuthorizationRepository(),private readonly users=new UserRepository(),
    private readonly eligibility=new EligibilityService(),private readonly eligibilityRepository=new EligibilityRepository()){}

  private authorityFrom(aId:string,bId:string,a:Awaited<ReturnType<UserRepository['findById']>>,
    b:Awaited<ReturnType<UserRepository['findById']>>,aRules:ContactRules,bRules:ContactRules):PairAuthority{
    if(!aId||!bId||aId===bId)throw denied();
    if(!a||!b||(a.accountStatus??'active')!=='active'||(b.accountStatus??'active')!=='active'
      ||a.blockedUsers?.includes(bId)||b.blockedUsers?.includes(aId))throw denied();
    const rules=new Map([[aId,aRules],[bId,bRules]]);
    const decisions=new Map([[aId,aRules.decision],[bId,bRules.decision]]);
    for(const decision of decisions.values())if(!decision.activated||!decision.capabilities.social||decision.experience==='unknown')throw denied();
    const snapshot:Record<string,string>={};
    for(const id of [aId,bId].sort())snapshot[`account:${id}`]=decisions.get(id)!.revision;
    const policyVersions=[...new Set([...decisions.values()].flatMap(decision=>decision.policyVersions))].sort();
    policyVersions.forEach((version,index)=>{snapshot[`policy:${String(index).padStart(3,'0')}`]=version;});
    return {decisions,rules,snapshot:canonical(snapshot),guardianContactsRequired:aRules.guardianContactsRequired||bRules.guardianContactsRequired};
  }
  private async authorityFor(aId:string,bId:string):Promise<PairAuthority>{
    const [a,b,aRules,bRules]=await Promise.all([this.users.findById(aId),this.users.findById(bId),
      this.eligibility.contactRulesFor(aId),this.eligibility.contactRulesFor(bId)]);
    return this.authorityFrom(aId,bId,a,b,aRules,bRules);
  }

  private guardianRequiredUsers(initiatorId:string,recipientId:string,authority:PairAuthority):string[]{
    const initiator=authority.decisions.get(initiatorId)!,recipient=authority.decisions.get(recipientId)!;
    if(initiator.experience==='adult_18_plus'&&recipient.experience!=='adult_18_plus')throw denied('An adult cannot initiate a contact request to a minor');
    const required=new Set<string>();
    if(initiator.experience==='under_13')required.add(initiatorId);
    if(recipient.experience==='under_13')required.add(recipientId);
    if(initiator.experience==='teen_13_17'&&recipient.experience==='adult_18_plus'&&authority.guardianContactsRequired)required.add(initiatorId);
    return [...required].sort();
  }

  private assertSnapshot(record:ContactAuthorizationRecord,authority:PairAuthority,required:string[]):void{
    if(JSON.stringify(canonical(record.policyVersions))!==JSON.stringify(authority.snapshot)
      ||JSON.stringify([...record.guardianRequiredUserIds].sort())!==JSON.stringify(required))throw denied('Eligibility or contact policy changed; submit a new request');
  }

  private safe(record:ContactAuthorizationRecord,actorId:string):SafeContactRequest{
    return {id:record.id,initiatorId:record.initiatorId,recipientId:record.initiatorId===record.userAId?record.userBId:record.userAId,
      status:record.state,createdAt:record.createdAt,updatedAt:record.updatedAt,
      requiresYourAcceptance:record.state==='pending'&&record.initiatorId!==actorId
        &&(record.initiatorId===record.userAId?record.userBId:record.userAId)===actorId&&!record.recipientAcceptedAt,
      guardianApprovalRequired:record.state==='pending'&&record.guardianRequiredUserIds.length>0};
  }

  async requestContact(initiatorId:string,recipientId:string):Promise<SafeContactRequest>{
    const authority=await this.authorityFor(initiatorId,recipientId),required=this.guardianRequiredUsers(initiatorId,recipientId,authority);
    const existing=await this.repository.findLivePair(initiatorId,recipientId);
    if(existing){
      try{
        this.assertSnapshot(existing,authority,required);
        if(existing.state==='accepted'){await this.requireContact(initiatorId,recipientId,'read');return this.safe(existing,initiatorId);}
        return this.safe(existing,initiatorId);
      } catch(error) {
        if(!(error instanceof ContactAuthorizationDeniedError))throw error;
        await this.repository.revoke(existing.id,initiatorId);
      }
    }
    try{
      const created=await this.repository.create({id:randomUUID(),initiatorId,recipientId,guardianRequiredUserIds:required,policyVersions:authority.snapshot},async()=>{
        const currentAuthority=await this.authorityFor(initiatorId,recipientId);
        const currentRequired=this.guardianRequiredUsers(initiatorId,recipientId,currentAuthority);
        if(JSON.stringify(currentAuthority.snapshot)!==JSON.stringify(authority.snapshot)
          ||JSON.stringify(currentRequired)!==JSON.stringify(required))throw denied('Eligibility or contact policy changed; submit a new request');
      });
      return this.safe(created,initiatorId);
    }catch(error){
      if((error as {code?:unknown})?.code==='23505'){
        const raced=await this.repository.findLivePair(initiatorId,recipientId);
        if(raced){
          try{
            const currentAuthority=await this.authorityFor(initiatorId,recipientId);
            this.assertSnapshot(raced,currentAuthority,this.guardianRequiredUsers(initiatorId,recipientId,currentAuthority));
            return this.safe(raced,initiatorId);
          }catch(validationError){
            if(!(validationError instanceof ContactAuthorizationDeniedError))throw validationError;
            await this.repository.revoke(raced.id,initiatorId);
          }
        }
      }
      throw error;
    }
  }

  async acceptContact(requestId:string,actorId:string):Promise<SafeContactRequest>{
    const existing=await this.repository.findById(requestId);if(!existing||existing.state!=='pending')throw denied();
    const recipientId=existing.initiatorId===existing.userAId?existing.userBId:existing.userAId;
    if(actorId!==recipientId)throw denied();
    const authority=await this.authorityFor(existing.userAId,existing.userBId);
    const required=this.guardianRequiredUsers(existing.initiatorId,recipientId,authority);this.assertSnapshot(existing,authority,required);
    const updated=await this.repository.acceptAndMaybeAuthorize(requestId,actorId,authority.snapshot);if(!updated)throw denied();
    return this.safe(updated,actorId);
  }

  async rejectContact(requestId:string,actorId:string):Promise<SafeContactRequest>{
    const record=await this.repository.reject(requestId,actorId);if(!record)throw denied();return this.safe(record,actorId);
  }

  private currentGuardian(facts:EligibilityFacts|undefined,childId:string,rules:ContactRules|undefined){
    const authorizations=(facts?.guardianAuthorizations??[]).filter(value=>value.userId===childId&&value.purposes.includes('social_contact'));
    if(authorizations.some(value=>!/^[1-9]\d*$/.test(value.subjectRevision??'')))return undefined;
    authorizations.sort((a,b)=>BigInt(a.subjectRevision!)>BigInt(b.subjectRevision!)?-1:BigInt(a.subjectRevision!)<BigInt(b.subjectRevision!)?1:0);
    if(!authorizations.length||authorizations[1]?.subjectRevision===authorizations[0]?.subjectRevision)return undefined;
    const current=authorizations[0]!,now=Date.now();
    const verifiedAt=Date.parse(current.verifiedAt),grantedAt=Date.parse(current.grantedAt),expiresAt=Date.parse(current.expiresAt);
    if(current.status!=='granted'||current.withdrawnAt||!current.guardianUserId||current.guardianUserId===childId
      ||!current.guardianReference||!current.responsibilityReference||!rules
      ||Object.entries(rules.guardianPolicyVersions).some(([id,version])=>current.policyVersions[id]!==version)
      ||Object.entries(rules.guardianNoticeVersions).some(([id,version])=>!version||current.noticeVersions.social_contact!==version)
      ||!Number.isFinite(verifiedAt)||!Number.isFinite(grantedAt)||!Number.isFinite(expiresAt)
      ||grantedAt<verifiedAt||verifiedAt>now||grantedAt>now||expiresAt<=now)return undefined;
    return current;
  }

  private async groupInvitationAuthority(inviterId:string,memberIds:string[],inviteeId:string){
    const members=[...new Set(memberIds)].sort();
    if(!members.includes(inviterId)||members.includes(inviteeId)||!inviteeId)throw denied();
    const allIds=[...new Set([...members,inviteeId])].sort();
    const [users,ruleRows]=await Promise.all([this.users.findByIds(allIds),
      Promise.all(allIds.map(async id=>[id,await this.eligibility.contactRulesFor(id)] as const))]);
    const usersById=new Map(users.map(user=>[user.id,user])),rulesById=new Map(ruleRows);
    if(allIds.some(id=>!usersById.has(id)||!rulesById.get(id)))throw denied();
    const decisions=new Map(allIds.map(id=>[id,rulesById.get(id)!.decision]));
    for(const id of allIds){
      const user=usersById.get(id)!,decision=decisions.get(id)!;
      if((user.accountStatus??'active')!=='active'||!decision.activated||!decision.capabilities.social||decision.experience==='unknown')throw denied();
    }
    const inviterExperience=decisions.get(inviterId)!.experience,inviteeExperience=decisions.get(inviteeId)!.experience;
    if(inviterExperience==='adult_18_plus'&&inviteeExperience!=='adult_18_plus')throw denied('An adult cannot invite a minor to a group');
    const guardianRequired=new Set<string>();
    for(const memberId of members){
      const authority=this.authorityFrom(memberId,inviteeId,usersById.get(memberId),usersById.get(inviteeId),rulesById.get(memberId)!,rulesById.get(inviteeId)!);
      const a=authority.decisions.get(memberId)!,b=authority.decisions.get(inviteeId)!;
      if(a.experience==='under_13')guardianRequired.add(memberId);
      if(b.experience==='under_13')guardianRequired.add(inviteeId);
      if(a.experience==='teen_13_17'&&b.experience==='adult_18_plus'&&authority.guardianContactsRequired)guardianRequired.add(memberId);
      if(b.experience==='teen_13_17'&&a.experience==='adult_18_plus'&&authority.guardianContactsRequired)guardianRequired.add(inviteeId);
    }
    const snapshot:Record<string,string>={};
    for(const id of allIds.sort())snapshot[`account:${id}`]=decisions.get(id)!.revision;
    const policyVersions=[...new Set([...decisions.values()].flatMap(decision=>decision.policyVersions))].sort();
    policyVersions.forEach((version,index)=>{snapshot[`policy:${String(index).padStart(3,'0')}`]=version;});
    return {policyVersions:canonical(snapshot),guardianRequiredUserIds:[...guardianRequired].sort(),rulesById,usersById};
  }

  async groupInvitationPolicy(inviterId:string,memberIds:string[],inviteeId:string):Promise<GroupInvitationPolicy>{
    const value=await this.groupInvitationAuthority(inviterId,memberIds,inviteeId);
    return {policyVersions:value.policyVersions,guardianRequiredUserIds:value.guardianRequiredUserIds};
  }

  async lockGroupInvitationPairs(memberIds:string[],inviteeId:string,conversationId?:string):Promise<void>{
    const members=[...new Set(memberIds)].sort(),allIds=[...new Set([...members,inviteeId])].sort();
    if(allIds.length<2)throw denied();
    if(conversationId)await db.execute(sql`SELECT id FROM conversations WHERE id=${conversationId}::uuid FOR SHARE`);
    await db.execute(sql`SELECT id FROM users WHERE id IN (${sql.join(allIds.map(id=>sql`${id}::uuid`),sql`, `)}) ORDER BY id FOR SHARE`);
    await db.execute(sql`SELECT user_id FROM eligibility_revisions WHERE user_id=ANY(${allIds}::uuid[]) ORDER BY user_id FOR SHARE`);
    await db.execute(sql`SELECT id FROM contact_authorizations WHERE user_a_id=ANY(${allIds}::uuid[]) AND user_b_id=ANY(${allIds}::uuid[])
      ORDER BY user_a_id,user_b_id,created_at DESC FOR SHARE`);
    await db.execute(sql`SELECT id FROM guardian_authorizations WHERE user_id=ANY(${allIds}::uuid[])
      AND purposes ? 'social_contact' ORDER BY user_id,subject_revision DESC,id FOR SHARE`);
  }

  async groupGuardianApprovals(invitationId:string,inviterId:string,memberIds:string[],inviteeId:string,guardianId:string):Promise<GroupInvitationApproval[]>{
    const authority=await this.groupInvitationAuthority(inviterId,memberIds,inviteeId);
    if(!authority.guardianRequiredUserIds.length)throw denied('No guardian approval is required');
    const guardian=await this.users.findById(guardianId);if(!guardian||(guardian.accountStatus??'active')!=='active')throw denied();
    const selected:GroupInvitationApproval[]=[];
    for(const childId of authority.guardianRequiredUserIds){
      const facts=await this.eligibilityRepository.readFacts(childId);
      const current=this.currentGuardian(facts,childId,authority.rulesById.get(childId));
      if(current?.guardianUserId===guardianId)selected.push({childUserId:childId,guardianUserId:guardianId,
        guardianAuthorizationId:current.id,policyVersions:authority.policyVersions});
    }
    if(!selected.length)throw denied('Verified guardian authorization is required');
    return selected.map(approval=>({...approval, invitationId} as GroupInvitationApproval));
  }

  async authorizeGroupInvitation(record:GroupInvitationAuthorityRecord,approvals:GroupInvitationApproval[]):Promise<boolean>{
    if(record.state!=='accepted'||!record.recipientAcceptedAt)throw denied();
    const current=await this.groupInvitationAuthority(record.inviterId,record.memberIdsAtInvite,record.inviteeId);
    if(JSON.stringify(current.policyVersions)!==JSON.stringify(canonical(record.policyVersions))
      ||JSON.stringify(current.guardianRequiredUserIds)!==JSON.stringify([...record.guardianRequiredUserIds].sort()))throw denied('Group policy changed; invite again');
    const pairRecords=await this.repository.listLatestForMembers([...record.memberIdsAtInvite,record.inviteeId]);
    const acceptedRecords=pairRecords.filter(value=>value.state==='accepted');
    const approvalMap=await this.repository.guardianApprovalsForRequests(acceptedRecords.map(value=>value.id));
    const factCache=new Map<string,Promise<EligibilityFacts|undefined>>();
    for(const memberId of record.memberIdsAtInvite){
      const pairRecord=pairRecords.find(value=>value.userAId===pair(memberId,record.inviteeId)[0]&&value.userBId===pair(memberId,record.inviteeId)[1]);
      if(pairRecord&&pairRecord.state!=='accepted')throw denied('A rejected or withdrawn contact cannot be added through a group');
      if(pairRecord?.state==='accepted')await this.assertAcceptedContact(pairRecord,
        this.authorityFrom(memberId,record.inviteeId,current.usersById.get(memberId),current.usersById.get(record.inviteeId),
          current.rulesById.get(memberId)!,current.rulesById.get(record.inviteeId)!),'read',approvalMap,factCache);
    }
    for(const childId of current.guardianRequiredUserIds){
      const facts=await this.eligibilityRepository.readFacts(childId),guardian=this.currentGuardian(facts,childId,current.rulesById.get(childId));
      if(!guardian)throw denied('Current guardian authority is required');
      if(!approvals.some(approval=>approval.childUserId===childId&&approval.guardianUserId===guardian.guardianUserId
        &&approval.guardianAuthorizationId===guardian.id&&JSON.stringify(canonical(approval.policyVersions))===JSON.stringify(current.policyVersions)))return false;
    }
    return true;
  }

  async requirePairwiseGroupContacts(userIds:string[],conversationId:string,action:'read'|'send'|'deliver'):Promise<void>{
    const members=[...new Set(userIds)].sort();if(!members.length)return;
    const invitations=await db.select().from(conversationInvitationsTable).where(and(
      eq(conversationInvitationsTable.conversationId,conversationId),eq(conversationInvitationsTable.state,'accepted')));
    const invitationIds=invitations.map(value=>value.id);
    const approvals=invitationIds.length?await db.select().from(conversationInvitationApprovalsTable)
      .where(inArray(conversationInvitationApprovalsTable.invitationId,invitationIds)):[];
    const approvalsByInvitation=new Map<string,GroupInvitationApproval[]>();
    for(const approval of approvals){const rows=approvalsByInvitation.get(approval.invitationId)??[];rows.push({
      childUserId:approval.childUserId,guardianUserId:approval.guardianUserId,guardianAuthorizationId:approval.guardianAuthorizationId,
      policyVersions:approval.policyVersions as Record<string,string>});approvalsByInvitation.set(approval.invitationId,rows);}
    const invitationCache=new Map<string,Promise<boolean>>();
    const userRows=await this.users.findByIds(members),usersById=new Map(userRows.map(user=>[user.id,user]));
    const ruleRows=await Promise.all(members.map(async id=>[id,await this.eligibility.contactRulesFor(id)] as const)),rulesById=new Map(ruleRows);
    for(const id of members){
      const user=usersById.get(id),decision=rulesById.get(id)?.decision;
      if(!user||(user.accountStatus??'active')!=='active'||!decision?.activated||!decision.capabilities.social||decision.experience==='unknown')throw denied();
    }
    if(members.length<2)return;
    const latestRecords=await this.repository.listLatestForMembers(members);
    const recordsByPair=new Map(latestRecords.map(record=>[pair(record.userAId,record.userBId).join(':'),record]));
    const acceptedRecords=latestRecords.filter(record=>record.state==='accepted');
    const contactApprovalMap=await this.repository.guardianApprovalsForRequests(acceptedRecords.map(record=>record.id));
    const factCache=new Map<string,Promise<EligibilityFacts|undefined>>();
    for(let i=0;i<members.length;i++)for(let j=i+1;j<members.length;j++){
      const aId=members[i]!,bId=members[j]!,authority=this.authorityFrom(aId,bId,usersById.get(aId),usersById.get(bId),rulesById.get(aId)!,rulesById.get(bId)!);
      const key=pair(aId,bId).join(':'),record=recordsByPair.get(key);
      if(record?.state==='accepted'){
        await this.assertAcceptedContact(record,authority,action,contactApprovalMap,factCache);
        continue;
      }
      if(record)throw denied();
      const matching=invitations.filter(invitation=>{
        const groupMembers=invitation.memberIdsAtInvite as string[];
        return (invitation.inviteeId===aId&&groupMembers.includes(bId))
          ||(invitation.inviteeId===bId&&groupMembers.includes(aId));
      });
      let permitted=false;
      for(const invitation of matching){
        let validation=invitationCache.get(invitation.id);
        if(!validation){
          validation=this.authorizeGroupInvitation({id:invitation.id,conversationId:invitation.conversationId,
            inviterId:invitation.inviterId,inviteeId:invitation.inviteeId,state:invitation.state as GroupInvitationState,
            memberIdsAtInvite:invitation.memberIdsAtInvite as string[],guardianRequiredUserIds:invitation.guardianRequiredUserIds as string[],
            policyVersions:invitation.policyVersions as Record<string,string>,recipientAcceptedAt:invitation.recipientAcceptedAt??null},
          approvalsByInvitation.get(invitation.id)??[]);
          invitationCache.set(invitation.id,validation);
        }
        try{permitted=await validation;if(permitted)break;}catch(error){if(!(error instanceof ContactAuthorizationDeniedError))throw error;}
      }
      if(!permitted)throw denied(`Current group contact permission is required to ${action} messages`);
    }
  }

  async approveChildContact(requestId:string,verifiedGuardianId:string):Promise<SafeContactRequest>{
    const record=await this.repository.findById(requestId);if(!record||record.state!=='pending')throw denied();
    if(!record.guardianRequiredUserIds.length)throw denied();
    const recipientId=record.initiatorId===record.userAId?record.userBId:record.userAId;
    const authority=await this.authorityFor(record.userAId,record.userBId);
    const required=this.guardianRequiredUsers(record.initiatorId,recipientId,authority);this.assertSnapshot(record,authority,required);
    // Guardian identity is resolved only against a current private child authority record.
    const selected:Array<{childId:string;authorityId:string}>=[];
    for(const childId of required){
      const childFacts=await this.eligibilityRepository.readFacts(childId);
      const current=this.currentGuardian(childFacts,childId,authority.rules.get(childId));
      if(current?.guardianUserId===verifiedGuardianId)selected.push({childId,authorityId:current.id});
    }
    if(!selected.length)throw denied('Verified guardian authorization is required');
    const guardian=await this.users.findById(verifiedGuardianId);if(!guardian||(guardian.accountStatus??'active')!=='active')throw denied();
    const updated=await this.repository.addGuardianApprovalsAndMaybeAuthorize(selected.map(value=>({id:randomUUID(),requestId,childUserId:value.childId,guardianUserId:verifiedGuardianId,
      guardianAuthorizationId:value.authorityId,policyVersions:authority.snapshot})));
    if(!updated)throw denied();
    return this.safe(updated,verifiedGuardianId);
  }

  async withdrawContact(requestId:string,actorId:string):Promise<void>{
    if(!await this.repository.revoke(requestId,actorId))throw denied();
  }
  async blockPair(blockerId:string,targetId:string){
    if(blockerId===targetId)throw new Error('Cannot block yourself');
    const target=await this.users.findById(targetId);if(!target)return undefined;
    return this.users.setSafetyRelationship(blockerId,targetId,'blockedUsers',true);
  }
  async listContactRequests(userId:string):Promise<SafeContactRequest[]>{return (await this.repository.listForUser(userId)).map(record=>this.safe(record,userId));}

  async requireContact(aId:string,bId:string,action:'read'|'send'|'deliver'):Promise<void>{
    const authority=await this.authorityFor(aId,bId),record=await this.repository.findLivePair(aId,bId);
    await this.assertAcceptedContact(record,authority,action);
  }
  private async assertAcceptedContact(record:ContactAuthorizationRecord|undefined,authority:PairAuthority,
    action:'read'|'send'|'deliver',approvalMap?:Map<string,Array<{childUserId:string;guardianUserId:string;guardianAuthorizationId:string;policyVersions:Record<string,string>}>>,
    factCache?:Map<string,Promise<EligibilityFacts|undefined>>):Promise<void>{
    if(!record||record.state!=='accepted')throw denied(`Current contact permission is required to ${action} messages`);
    const required=this.guardianRequiredUsers(record.initiatorId,record.initiatorId===record.userAId?record.userBId:record.userAId,authority);
    this.assertSnapshot(record,authority,required);
    if(required.length){
      const approvals=approvalMap?.get(record.id)??await this.repository.guardianApprovals(record.id);
      for(const childId of required){
        const factPromise=factCache?.get(childId)??this.eligibilityRepository.readFacts(childId);
        if(factCache&&!factCache.has(childId))factCache.set(childId,factPromise);
        const facts=await factPromise,current=this.currentGuardian(facts,childId,authority.rules.get(childId));
        if(!current||!approvals.some(approval=>approval.childUserId===childId&&approval.guardianAuthorizationId===current.id
          &&approval.guardianUserId===current.guardianUserId&&JSON.stringify(canonical(approval.policyVersions))===JSON.stringify(authority.snapshot)))throw denied();
      }
    }
  }
  async requirePairwiseContacts(userIds:string[],action:'read'|'send'|'deliver'):Promise<void>{
    const members=[...new Set(userIds)].sort();if(members.length<2)return;
    const [userRows,ruleRows,records]=await Promise.all([this.users.findByIds(members),
      Promise.all(members.map(async id=>[id,await this.eligibility.contactRulesFor(id)] as const)),this.repository.listLiveForMembers(members)]);
    const usersById=new Map(userRows.map(user=>[user.id,user]));
    const rulesById=new Map(ruleRows);
    const recordByPair=new Map(records.map(record=>[pair(record.userAId,record.userBId).join(':'),record]));
    const approvalMap=await this.repository.guardianApprovalsForRequests(records.map(record=>record.id));
    const factCache=new Map<string,Promise<EligibilityFacts|undefined>>();
    for(let i=0;i<members.length;i++)for(let j=i+1;j<members.length;j++){
      const aId=members[i]!,bId=members[j]!;
      const authority=this.authorityFrom(aId,bId,usersById.get(aId),usersById.get(bId),rulesById.get(aId)!,rulesById.get(bId)!);
      await this.assertAcceptedContact(recordByPair.get(pair(aId,bId).join(':')),authority,action,approvalMap,factCache);
    }
  }
  /** Call from a DB transaction before a message write; block/withdraw cannot pass the held row locks. */
  async lockCurrentPairwiseContacts(userIds:string[],action:'read'|'send'|'deliver',conversationId?:string):Promise<void>{
    const members=[...new Set(userIds)].sort();
    if(!members.length||members.length<2&&!conversationId)return;
    if(conversationId){
      await db.execute(sql`SELECT id FROM conversations WHERE id=${conversationId}::uuid FOR SHARE`);
      await db.execute(sql`SELECT id FROM conversation_invitations WHERE conversation_id=${conversationId}::uuid
        AND state IN ('pending','accepted') ORDER BY id FOR SHARE`);
    }
    await db.execute(sql`SELECT id FROM users WHERE id IN (${sql.join(members.map(id=>sql`${id}::uuid`),sql`, `)}) ORDER BY id FOR SHARE`);
    await db.execute(sql`SELECT user_id FROM eligibility_revisions WHERE user_id=ANY(${members}::uuid[]) ORDER BY user_id FOR SHARE`);
    await db.execute(sql`SELECT id FROM guardian_authorizations WHERE user_id=ANY(${members}::uuid[])
      AND purposes ? 'social_contact' ORDER BY user_id,subject_revision DESC,id FOR SHARE`);
    await db.execute(sql`SELECT id FROM contact_authorizations WHERE user_a_id=ANY(${members}::uuid[]) AND user_b_id=ANY(${members}::uuid[])
      AND state IN ('pending','accepted') ORDER BY user_a_id,user_b_id FOR SHARE`);
    if(conversationId)await this.requirePairwiseGroupContacts(members,conversationId,action);
    else await this.requirePairwiseContacts(members,action);
  }
}
