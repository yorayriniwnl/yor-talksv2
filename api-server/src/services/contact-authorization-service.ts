import { randomUUID } from 'node:crypto';
import { db } from '@workspace/db';
import { sql } from 'drizzle-orm';
import { EligibilityRepository } from '../repositories/eligibility-repository.js';
import { ContactAuthorizationRepository, type ContactAuthorizationRecord } from '../repositories/contact-authorization-repository.js';
import { UserRepository } from '../repositories/user-repository.js';
import { EligibilityService } from './eligibility-service.js';
import type { EligibilityDecision, EligibilityFacts } from '../eligibility/types.js';

export type SafeContactRequest = {
  id:string; initiatorId:string; recipientId:string; status:ContactAuthorizationRecord['state']; createdAt:string;
  updatedAt:string; requiresYourAcceptance:boolean; guardianApprovalRequired:boolean;
};
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
  async lockCurrentPairwiseContacts(userIds:string[],action:'read'|'send'|'deliver'):Promise<void>{
    const members=[...new Set(userIds)].sort();
    if(members.length<2)return;
    await db.execute(sql`SELECT id FROM users WHERE id IN (${sql.join(members.map(id=>sql`${id}::uuid`),sql`, `)}) ORDER BY id FOR SHARE`);
    await db.execute(sql`SELECT id FROM contact_authorizations WHERE user_a_id=ANY(${members}::uuid[]) AND user_b_id=ANY(${members}::uuid[])
      AND state IN ('pending','accepted') ORDER BY user_a_id,user_b_id FOR SHARE`);
    await this.requirePairwiseContacts(members,action);
  }
}
