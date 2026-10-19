# Security & shipping audit

Before an app touches a real user or a paying customer. Scoped to Shreyansh's actual stack
(Supabase + Flutter/Next.js, solo-built), **not** enterprise SaaS. Skip the enterprise appendix
unless a specific contract demands it.

## The shortlist that actually applies

- **Secrets** out of the frontend, out of git, out of AI chat history. Rotate anything ever
  committed. No service-role keys in client code.
- **Supabase RLS on every table** — a user can only read their own / their tenant's rows. The classic
  break is "change one id in the URL and see someone else's data." Test it by trying.
- **Validate every input on the server**, not just in the form.
- **Money as integers** (paise/cents), never floats. Correct rounding and tax for where it's sold.
  (Oric is a finance tool — this is non-negotiable there.)
- **Nightly backups AND one restore you've actually performed.** A backup you've never restored is a
  hope, not a backup.
- **Rate limit on login**; a **spending cap** on any AI/API provider; **cost alerts** so a runaway
  loop shows up the same day, not on the invoice.
- **Errors don't leak stack traces.** A 404 and 500 page that don't look broken.
- **Works on a cheap Android phone**; nothing over ~3s to load.
- **Privacy policy + terms that match what the code does** — run `legal.md`.
- **Test signup, payment and password reset end to end** before launch. Emails don't land in spam
  (SPF/DKIM/DMARC).
- **A way for users to contact you**, and a one-line rollback plan for launch day.
- **Every account, domain and repo in the right name** (for Shreyansh: personal repos under
  ShreyanshPatidar, not the Indas account — see memory).

Report each as Pass / Fixed / Needs owner / Not applicable, with the risk of each open item in a line.
Evidence before claiming any of these is done — actually run the check (there's a
`verify` skill for exactly this).

## Enterprise appendix (reference only — almost never applies here)

Preserved from Mark Ajzenstadt's viral "vibe-coded over a weekend" list (@mardehaym, 15 Oct 2026).
It's an argument that a weekend build isn't production-ready, not a checklist for a solo B2C/local-B2B
app. Reach for an item here **only** when a real contract or customer forces it — otherwise it's scope
you don't need and will drown the shortlist above.

> SSO / SAML / SCIM · MFA with a recovery path · session kill-switch per user · roles beyond
> admin/everyone · tenant isolation · admin "log in as user" with audit trail · account lockouts tuned
> so they don't lock out the CFO · forward+rollback migrations that don't lock tables at 2pm · indexes
> for 5M rows · connection pooling · point-in-time recovery · soft deletes · timezones stored right ·
> apostrophes/emoji/RTL in every field · currency/tax per country · idempotency keys so a retried
> payment doesn't double-charge · submit-dedup · pagination that works on page 400 · exports/imports ·
> retention rules · dependency scanning · OWASP (SQLi/XSS/CSRF) · scanned/size-limited file uploads ·
> CORS that isn't allow-all · security headers · encryption at rest and in transit · least-privilege
> including the AI agent holding prod creds · logs of who-did-what minus secrets · a pen test ·
> security-questionnaire answers with evidence · a vuln disclosure process · a stolen-laptop plan ·
> SOC 2 · HIPAA + a BAA with every vendor incl. the AI provider · view-level audit trails · PCI scope
> · GDPR deletion reaching every table/backup/log · data residency · quarterly access reviews ·
> matching dev/staging/prod · infra as code · a test-gated deploy pipeline · one-click rollbacks ·
> zero-downtime deploys · feature flags · autoscaling · a CDN · DNS/SSL renewals that don't expire on
> a Sunday · job queues · retries with backoff · a dead-letter queue · cron that doesn't double-run ·
> caching with invalidation · bounce/complaint handling · storage lifecycle rules · a tested DR plan ·
> a second region · structured logs · grouped error tracking · external uptime checks · alerts that
> page a human, tuned · latency/error/throughput dashboards · request tracing · an on-call rotation ·
> runbooks · postmortems that change something · a status page · unit/integration/e2e tests ·
> load testing · production-like (not production) test data · regression tests · testing on an old
> laptop · accessibility compliance · subscriptions/proration/dunning · invoices with PO numbers ·
> sales tax/VAT · refunds/credits · usage metering matching billing · reconcilable revenue reports ·
> signed+retried webhooks · a versioned API · revocable API keys · API rate limits · a plan for a
> third-party API changing format · OAuth token refresh · an integration sandbox · prompt-injection
> protection on every field reaching the model · customer data kept out of prompts that leave the
> network · a per-customer model spend cap · evals · a provider-outage fallback · a model-deprecation
> migration plan · prompt/output logs minus what you can't keep · a human approval step for anything
> the AI can't undo · empty/loading/error states on every screen · actionable error messages · forms
> that keep what was typed · emails that render everywhere · toggleable notifications · undo ·
> keyboard nav + screen reader support · local" + the reminder that it still needs real engineers:
> a senior reading every line, a backend engineer owning the data model, DevOps for deploys and the
> bill, someone on the 3am page, security for patches and audits, QA, a tech lead who says no, an
> architect, and someone who remembers why it's built this way a year later.
