# Operator release inputs

Prepared 2026-10-19. These are facts and approval evidence required by the existing Yor Talks public-beta build and its notices. This is a handoff template, not a declaration that any information or legal approval exists. Do not place passwords, API secrets or private identity documents in this report.

## Public identity and contacts

| Build input | Exact fact to supply | Evidence / owner to record |
| --- | --- | --- |
| `VITE_LEGAL_OPERATOR_NAME` | Verified name of the person or legal entity operating the service | Operator confirmation and appropriate identity/business record reference |
| `VITE_LEGAL_OPERATOR_ADDRESS` | Approved public contact/business address for that operator | Operator confirmation that publication is authorized and the address is correct |
| `VITE_SUPPORT_EMAIL` | Functioning support mailbox | Mailbox owner and a successful delivery/response check |
| `VITE_PRIVACY_CONTACT_EMAIL` | Functioning privacy-request mailbox | Responsible owner, delivery/response check and rights-request workflow |
| `VITE_GRIEVANCE_OFFICER_NAME` | Actual appointed grievance contact's approved public name | Appointment/role confirmation and authority to publish the name |
| `VITE_GRIEVANCE_CONTACT_EMAIL` | Functioning grievance mailbox | Responsible owner, delivery/response check and queue/escalation ownership |

The frontend must not replace missing values with synthetic names, addresses or fixture mailboxes. A `.test` address in a browser fixture does not demonstrate real mailbox operation.

## Versioned legal content

| Input / decision | Information needed |
| --- | --- |
| `VITE_TERMS_VERSION` | Approved immutable document version. Coordinate the same release value with backend `TERMS_VERSION`; the currently available API does not bind acceptance to a version sent by the browser. |
| `VITE_LEGAL_EFFECTIVE_DATE` | Approved effective date in `YYYY-MM-DD` form. Do not infer it from the audit or execution date. |
| `VITE_LEGAL_GOVERNING_LAW` | Reviewed governing-law and dispute wording appropriate to the operator and release. Engineering should not choose a jurisdiction. |
| `VITE_LEGAL_CONTENT_REVIEWED` | Keep false until the designated reviewer has approved the actual notices, eligibility/privacy approach and grievance content. Record reviewer, approval date, document versions and approval reference before setting true. |
| Document history | Approved Terms, Privacy Notice, Cookies/Browser Storage notice and Community Guidelines; stable version references, and an approved method for retrieving past notices where required. |
| Policy assertions | Confirm or correct the privacy notice's non-sale statement, content-use permission, provider disclosures, retention wording and rights handling. Source inspection cannot certify these business facts. |

## Data handling facts and operational approval

For each configured provider, supply its legal name, purpose, data categories received, processing/storage regions, relevant contract/transfer safeguards, retention/deletion behavior, configuration owner and evidence reference. Confirm the actual deployed providers rather than treating every optional integration in source as active.

Supply approved retention and deletion rules for account/profile/content records, authentication/session records, security/moderation evidence, guest grievance reports, unbound verification/enrollment records, payment/accounting records where applicable, external-media cleanup queues, provider logs and backups. Include deletion triggers, any exceptions/holds, backup expiry, the responsible owner and evidence that configured jobs/processes implement the approved rule. No durations are filled in here because they require actual operational and legal approval.

Confirm who handles privacy access/correction/deletion requests, how request ownership is verified without collecting unnecessary documents, how guest reports and unbound verification records are located, what escalation applies, and what approved response policy is used. Account exports intentionally exclude unrelated private evidence and unbound guest records; an email string alone must not join those records to an account.

Optional navigation/performance analytics remain off, with no new opt-in. A future activation additionally needs reviewed purposes/providers/retention and a real backend consent record enforced at ingestion. An existing local browser marker is insufficient evidence for that activation.

## Sign-off record to complete

| Field | Operator / reviewer entry |
| --- | --- |
| Release/build reference | |
| Verified operator information reference | |
| Support/privacy/grievance mailbox check reference | |
| Approved legal document versions and effective date | |
| Legal reviewer and approval reference | |
| Provider/region/contract inventory reference | |
| Retention/backups/deletion verification reference | |
| Rights/grievance operations owner and workflow reference | |
| Frontend/server terms version coordination evidence | |
| Remaining exceptions and explicit release decision | |

No public deployment, feature activation or payment enablement is authorized by completing this template. Release approval and deployment remain separate actions under the user's instructions.
