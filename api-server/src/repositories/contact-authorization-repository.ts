import { db, pool, runInDatabaseTransaction } from '@workspace/db';
import { sql } from 'drizzle-orm';
import type { PoolClient } from 'pg';

export type ContactAuthorizationRecord = {
  id: string; userAId: string; userBId: string; initiatorId: string; state: 'pending'|'accepted'|'rejected'|'revoked';
  guardianRequiredUserIds: string[]; policyVersions: Record<string,string>; initiatorAcceptedAt: string;
  recipientAcceptedAt: string|null; rejectedAt: string|null; revokedAt: string|null; createdAt: string; updatedAt: string;
};
type Row = Record<string, unknown>;
const iso = (value: unknown) => value == null ? null : new Date(String(value)).toISOString();
const canonicalVersions = (value:Record<string,string>) => Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)));
function fromRow(row: Row): ContactAuthorizationRecord {
  return { id:String(row.id),userAId:String(row.user_a_id),userBId:String(row.user_b_id),initiatorId:String(row.initiator_id),
    state:row.state as ContactAuthorizationRecord['state'],guardianRequiredUserIds:row.guardian_required_user_ids as string[],
    policyVersions:row.policy_versions as Record<string,string>,initiatorAcceptedAt:iso(row.initiator_accepted_at)!,
    recipientAcceptedAt:iso(row.recipient_accepted_at),rejectedAt:iso(row.rejected_at),revokedAt:iso(row.revoked_at),
    createdAt:iso(row.created_at)!,updatedAt:iso(row.updated_at)! };
}

export class ContactAuthorizationRepository {
  private async markAccepted(client: PoolClient, requestId: string, policyVersions: Record<string,string>): Promise<void> {
    await client.query(`UPDATE contact_authorizations ca SET state='accepted',updated_at=clock_timestamp()
      WHERE ca.id=$1 AND ca.state='pending' AND ca.recipient_accepted_at IS NOT NULL AND ca.policy_versions=$2::jsonb
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(ca.guardian_required_user_ids) required(child_id)
        LEFT JOIN LATERAL (
          SELECT ga.id,ga.status,ga.withdrawn_at,ga.expires_at,ga.guardian_user_id
          FROM guardian_authorizations ga WHERE ga.user_id=required.child_id::uuid AND ga.purposes ? 'social_contact'
          ORDER BY ga.subject_revision DESC,ga.created_at DESC,ga.id DESC LIMIT 1
        ) current_authority ON true
        WHERE current_authority.id IS NULL OR current_authority.status<>'granted' OR current_authority.withdrawn_at IS NOT NULL
          OR current_authority.expires_at<=clock_timestamp() OR current_authority.guardian_user_id IS NULL
          OR NOT EXISTS (SELECT 1 FROM contact_authorization_approvals approval
            WHERE approval.contact_authorization_id=ca.id AND approval.child_user_id=required.child_id::uuid
              AND approval.guardian_authorization_id=current_authority.id AND approval.guardian_user_id=current_authority.guardian_user_id
              AND approval.policy_versions=ca.policy_versions)
      )`,[requestId,JSON.stringify(policyVersions)]);
  }

  async findById(requestId: string): Promise<ContactAuthorizationRecord|undefined> {
    const result=await pool.query('SELECT * FROM contact_authorizations WHERE id=$1',[requestId]);
    return result.rows[0]?fromRow(result.rows[0]):undefined;
  }
  async findLivePair(aId: string,bId: string): Promise<ContactAuthorizationRecord|undefined> {
    const [userA,userB]=[aId,bId].sort();
    const result=await pool.query(`SELECT * FROM contact_authorizations WHERE user_a_id=$1 AND user_b_id=$2
      AND state IN ('pending','accepted') ORDER BY created_at DESC,id DESC LIMIT 1`,[userA,userB]);
    return result.rows[0]?fromRow(result.rows[0]):undefined;
  }
  async listLiveForMembers(userIds:string[]):Promise<ContactAuthorizationRecord[]> {
    const ids=[...new Set(userIds)];if(ids.length<2)return [];
    const result=await pool.query(`SELECT * FROM contact_authorizations
      WHERE user_a_id=ANY($1::uuid[]) AND user_b_id=ANY($1::uuid[]) AND state IN ('pending','accepted')
      ORDER BY user_a_id,user_b_id`,[ids]);
    return result.rows.map(fromRow);
  }
  async listLatestForMembers(userIds:string[]):Promise<ContactAuthorizationRecord[]> {
    const ids=[...new Set(userIds)];if(ids.length<2)return [];
    const result=await pool.query(`SELECT DISTINCT ON (user_a_id,user_b_id) * FROM contact_authorizations
      WHERE user_a_id=ANY($1::uuid[]) AND user_b_id=ANY($1::uuid[])
      ORDER BY user_a_id,user_b_id,created_at DESC,id DESC`,[ids]);
    return result.rows.map(fromRow);
  }
  async listForUser(userId: string): Promise<ContactAuthorizationRecord[]> {
    const result=await pool.query('SELECT * FROM contact_authorizations WHERE user_a_id=$1 OR user_b_id=$1 ORDER BY created_at DESC,id DESC LIMIT 200',[userId]);
    return result.rows.map(fromRow);
  }
  async create(value: { id:string; initiatorId:string; recipientId:string; guardianRequiredUserIds:string[]; policyVersions:Record<string,string> },authorize?:()=>Promise<void>): Promise<ContactAuthorizationRecord> {
    const [userA,userB]=[value.initiatorId,value.recipientId].sort();
    return runInDatabaseTransaction(async tx=>{
      await tx.execute(sql`SELECT id FROM users WHERE id IN (${userA}::uuid,${userB}::uuid) ORDER BY id FOR SHARE`);
      await authorize?.();
      const result=await tx.execute(sql`INSERT INTO contact_authorizations(id,user_a_id,user_b_id,initiator_id,state,guardian_required_user_ids,policy_versions,initiator_accepted_at)
        VALUES(${value.id}::uuid,${userA}::uuid,${userB}::uuid,${value.initiatorId}::uuid,'pending',${JSON.stringify(value.guardianRequiredUserIds)}::jsonb,
          ${JSON.stringify(value.policyVersions)}::jsonb,clock_timestamp()) RETURNING *`);
      return fromRow(result.rows[0]!);
    });
  }
  async acceptAndMaybeAuthorize(requestId: string,actorId: string,policyVersions:Record<string,string>): Promise<ContactAuthorizationRecord|undefined> {
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`UPDATE contact_authorizations SET recipient_accepted_at=coalesce(recipient_accepted_at,clock_timestamp()),updated_at=clock_timestamp()
        WHERE id=$1 AND initiator_id<>$2 AND $2 IN (user_a_id,user_b_id) AND state='pending'`,[requestId,actorId]);
      await this.markAccepted(client,requestId,policyVersions);
      const result=await client.query('SELECT * FROM contact_authorizations WHERE id=$1',[requestId]);
      await client.query('COMMIT');
      return result.rows[0]?fromRow(result.rows[0]):undefined;
    } catch(error) {
      await client.query('ROLLBACK');throw error;
    } finally { client.release(); }
  }
  async reject(requestId: string,actorId: string): Promise<ContactAuthorizationRecord|undefined> {
    const result=await pool.query(`UPDATE contact_authorizations SET state='rejected',rejected_at=clock_timestamp(),updated_at=clock_timestamp()
      WHERE id=$1 AND initiator_id<>$2 AND $2 IN (user_a_id,user_b_id) AND state='pending' RETURNING *`,[requestId,actorId]);
    return result.rows[0]?fromRow(result.rows[0]):undefined;
  }
  async revoke(requestId: string,actorId: string): Promise<boolean> {
    const result=await pool.query(`UPDATE contact_authorizations SET state='revoked',revoked_at=clock_timestamp(),updated_at=clock_timestamp()
      WHERE id=$1 AND $2 IN (user_a_id,user_b_id) AND state IN ('pending','accepted') RETURNING id`,[requestId,actorId]);
    return Boolean(result.rowCount);
  }
  async addGuardianApprovalsAndMaybeAuthorize(values: Array<{ id:string; requestId:string; childUserId:string; guardianUserId:string; guardianAuthorizationId:string; policyVersions:Record<string,string> }>): Promise<ContactAuthorizationRecord|undefined> {
    const first=values[0];if(!first)return undefined;
    const client=await pool.connect();
    try {
      await client.query('BEGIN');
      for(const value of values){
        if(value.requestId!==first.requestId||JSON.stringify(canonicalVersions(value.policyVersions))!==JSON.stringify(canonicalVersions(first.policyVersions)))
          throw new Error('Guardian approvals must belong to the same current contact request');
        await client.query(`INSERT INTO contact_authorization_approvals(id,contact_authorization_id,child_user_id,guardian_user_id,guardian_authorization_id,policy_versions)
          VALUES($1,$2,$3,$4,$5,$6::jsonb) ON CONFLICT(contact_authorization_id,guardian_authorization_id) DO NOTHING`,
          [value.id,value.requestId,value.childUserId,value.guardianUserId,value.guardianAuthorizationId,JSON.stringify(value.policyVersions)]);
      }
      await this.markAccepted(client,first.requestId,first.policyVersions);
      const result=await client.query('SELECT * FROM contact_authorizations WHERE id=$1',[first.requestId]);
      await client.query('COMMIT');
      return result.rows[0]?fromRow(result.rows[0]):undefined;
    } catch(error) {
      await client.query('ROLLBACK');throw error;
    } finally { client.release(); }
  }
  async guardianApprovals(requestId: string): Promise<Array<{childUserId:string;guardianUserId:string;guardianAuthorizationId:string;policyVersions:Record<string,string>}>> {
    const result=await pool.query(`SELECT child_user_id,guardian_user_id,guardian_authorization_id,policy_versions
      FROM contact_authorization_approvals WHERE contact_authorization_id=$1`,[requestId]);
    return result.rows.map(row=>({childUserId:String(row.child_user_id),guardianUserId:String(row.guardian_user_id),
      guardianAuthorizationId:String(row.guardian_authorization_id),policyVersions:row.policy_versions as Record<string,string>}));
  }
  async guardianApprovalsForRequests(requestIds:string[]):Promise<Map<string,Array<{childUserId:string;guardianUserId:string;guardianAuthorizationId:string;policyVersions:Record<string,string>}>>> {
    const ids=[...new Set(requestIds)];if(!ids.length)return new Map();
    const result=await pool.query(`SELECT contact_authorization_id,child_user_id,guardian_user_id,guardian_authorization_id,policy_versions
      FROM contact_authorization_approvals WHERE contact_authorization_id=ANY($1::uuid[])`,[ids]);
    const approvals=new Map<string,Array<{childUserId:string;guardianUserId:string;guardianAuthorizationId:string;policyVersions:Record<string,string>}>>();
    for(const row of result.rows){
      const requestId=String(row.contact_authorization_id),items=approvals.get(requestId)??[];
      items.push({childUserId:String(row.child_user_id),guardianUserId:String(row.guardian_user_id),
        guardianAuthorizationId:String(row.guardian_authorization_id),policyVersions:row.policy_versions as Record<string,string>});
      approvals.set(requestId,items);
    }
    return approvals;
  }
}
