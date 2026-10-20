# Production readiness review: 2026-10-07

This review is a staged acceptance record, not a launch approval. Local repository checks can reduce risk but do not establish public production validity.

## Staging acceptance checklist

1. DNS/TLS
   - Confirm each public hostname resolves to the correct ingress.
   - Verify certificate expiry, renewal, and HTTPS redirect behavior.

2. Google OAuth
   - Validate the production client ID, callback URI, and domain allowlist in a staging environment.
   - Confirm real user sign-in and account-linking behavior with the live provider.

3. Resend email
   - Verify reset, verification, and OTP message delivery and retry semantics.
   - Confirm secrets remain outside the repository and logs.

4. Cloudinary/storage and moderation
   - Validate signed upload flows, object URLs, retention, and moderation review actions.
   - Confirm the storage lifecycle is consistent with real provider policy.

5. Alertmanager delivery
   - Check a real webhook receiver, authenticated POSTs, and alert routing from Prometheus.
   - Validate the rendered configuration and secret-file handling in the deployment host.

6. Encrypted off-host backup/restore
   - Run an encrypted backup to the real remote target.
   - Verify integrity and perform an isolated restore or dry-run before any live cutover.

## Explicit gating

- Age assurance is not enabled in production territory until a real provider and legal acceptance are complete.
- Payments, RTC/live rooms, Web Push, and media upload/HLS remain disabled until their real provider integrations and product security checks pass.

## Evidence boundary

The repository may contain local automation and config validation, but external-provider success claims require a deployed staging environment and evidence from the provider or receiver itself. Do not mark any integration as accepted without the corresponding live signal.
