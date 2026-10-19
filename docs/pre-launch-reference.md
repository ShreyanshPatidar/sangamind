# Pre-launch reference

Two things saved from X on 19 Oct 2026. Neither is a skill; this is a reference to read, not a
checklist to execute. Read the honest framing before the lists.

---

## 1. Openverse — free CC audio for video (acted on)

Source: Elliot Padfield (@ElliotPadfield), 15 Oct 2026.

> If you're using Claude to edit videos, you can give it a library of 5.2M+ audio files for $0 —
> sound effects, ambience, music. Openverse has a free API, no key needed. Give it
> `api.openverse.org` and ask: "whenever you need sound effects, search Openverse to find the best
> options and use them for tasteful sound design." No more downloading random clips or generating
> the audio.

**Status: done.** Built into the video skills on the same day:
- `sangamind/skills/explainer-video/tools/openverse.py` — searches Openverse, filters to
  commercial-OK licences (cc0/by/by-sa), downloads into a video's sfx folder, logs the credit to
  `credits.json` so the description carries it. Abstract hits (whoosh/pop/boom) stay synthesised;
  Openverse is for real recorded sound synthesis can't fake.
- `motion-design/harness.md` points at it for sound effects and ambience (the score stays original).

Caveat learned while building it: Openverse matches words **literally**, not by meaning — "rubber
stamp" returned people pronouncing the words. Always list and listen before grabbing a result.

---

## 2. The "vibe-coded over the weekend" list (reference only — NOT your checklist)

Source: Mark Ajzenstadt (@mardehaym), 15 Oct 2026. 738K views.

**Honest framing (Claude's, not the tweet's):** this is a viral *argument*, not a launch spec. Its
point is "vibe-coded over a weekend, don't need developers" is a fantasy — here's every piece of
real production engineering a weekend build skips. ~90% of it is **enterprise-SaaS scope**
(SSO/SAML/SCIM, SOC 2, HIPAA, PCI, multi-region, on-call rotations) and is **irrelevant** to
Shreyansh's apps:
- **Oric** (mandi/fruit-trading finance tool, sold locally B2B) — needs correct money math,
  reconciliation integrity, Supabase RLS/tenant isolation, backups + a *tested* restore, secrets out
  of the repo, server-side validation. It does **not** need SAML, SOC 2, or autoscaling.
- **Parallax / consumer apps** — need the basics below, plus a landing page and store listing.

Treat this as a gut-check to read once, then throw away the 150 lines that don't apply. Don't build
a "pre-launch skill" from it — if one is ever wanted, build it from the real shortlist, not this.

### The real shortlist that actually applies to Shreyansh's Supabase/Flutter apps

- Secrets out of the frontend, out of git, out of chat history; rotate anything ever committed.
- Supabase **RLS** on every table — a user can only read their own / their tenant's rows (the
  "change one number in the URL" check).
- Validate every input on the server, not just the form.
- Money as integers, never floats; correct rounding/tax for where it's sold.
- Nightly backups **and one restore you've actually tested**.
- Rate limit on login; spending cap on any AI/API provider; cost alerts.
- Errors don't leak stack traces; a 404 and 500 page that don't look broken.
- Works on a cheap Android phone; nothing over ~3s to load.
- Privacy policy + terms that match what the code does (run the `ship-audit` skill).
- Test signup, payment and password reset end to end before launch.
- Everything (domains, repos, store accounts) in the company's name, not a throwaway.

### Full original list (preserved verbatim, for the record)

Before it touches a paying customer, Mark's list says make sure it includes:

> a schema someone designed, instead of one the AI improvised table by table · login that still
> works when someone puts a plus sign in their email · password reset links that expire and work
> once · MFA, plus a recovery path for the user who lost their phone · sessions that time out, and a
> way to kill every session for one user · SSO for the enterprise customer who won't sign without it
> · SAML · SCIM, so a fired employee loses access the moment IT offboards them · roles and
> permissions deeper than "admin" and "everyone else" · checks that stop user A from reading user
> B's data by changing one number in the URL · tenant isolation · an admin "log in as this user"
> button with an audit trail · rate limits on login · lockouts that stop attackers without locking
> out your CFO · database migrations that run forward and roll back · migrations that don't lock the
> main table at 2pm on a Tuesday · indexes · connection pooling · backups every night · a restore
> from those backups, tested · point-in-time recovery · soft deletes · validation on the server ·
> timezones stored right · the customer with an apostrophe in their last name · emoji, accents and
> right-to-left text in every field · money stored as integers · currency, rounding and tax rules
> for every country · a data model that survives your second customer · idempotency keys · dedup for
> the user who clicks submit four times · pagination that works on page 400 · exports · imports that
> survive the CSV someone saved in 2009 · retention rules · secrets out of code/repo/AI chat ·
> rotating every key the AI pasted into config · confirming every package the AI installed exists ·
> dependency scanning · input sanitization · protection against SQL injection, XSS, CSRF and the
> rest of OWASP · file uploads scanned, size-limited, stored where they can't execute · CORS that
> isn't "allow everything" · security headers · encryption at rest and in transit · least-privilege
> access including the AI agent holding prod credentials · logs of who did what, minus passwords/
> tokens/cards · a penetration test · answers to the security questionnaire with evidence · a
> disclosure process · a plan for a stolen laptop with prod access · SOC 2 · HIPAA the moment a
> patient record touches your system · a BAA with every vendor including your AI provider · audit
> trails for who *viewed* a record · PCI scope · GDPR deletion that reaches every table, backup and
> log · data residency · quarterly access reviews · dev/staging/prod that match · infra as code · a
> deploy pipeline that runs tests first · one-click rollbacks · zero-downtime deploys · feature flags
> · autoscaling · a CDN · DNS/SSL/renewals that don't expire on a Sunday · background job queues ·
> retries with backoff · a dead-letter queue · cron jobs that don't run twice · caching, and
> clearing it when data changes · SPF/DKIM/DMARC · bounce and complaint handling · storage rules ·
> cost alerts (they learned this for $1,382.59) · a disaster recovery plan, tested yearly · a second
> region · structured logs · error tracking that groups bugs · uptime checks from outside your
> network · alerts that page a human, tuned · dashboards for latency/error/throughput · tracing · an
> on-call rotation · runbooks · postmortems that change something · a status page · unit tests by
> someone who knows the logic · integration tests for every third-party API · end-to-end tests for
> signup/checkout · load testing · production-like test data · regression tests · testing on the
> five-year-old laptop your biggest customer uses · accessibility compliance · subscriptions/
> upgrades/downgrades/proration · failed-payment retries and dunning · invoices with the PO number ·
> sales tax and VAT · refunds/credits/partial refunds · usage metering that matches billing ·
> annual contracts with custom terms · revenue reports finance can reconcile · webhooks that verify
> signatures · webhooks that retry with a log · a versioned API · customer-revocable API keys · API
> rate limits · a plan for when a third-party API changes format · OAuth token refresh · a sandbox
> for customer integrations · protection against prompt injection in every field that reaches the
> model · customer/patient data kept out of prompts that leave your network · a model spend cap per
> customer · evals · a fallback for when your model provider goes down · a migration plan for a
> deprecated model · prompt/output logs minus what you can't keep · a human approval step for
> anything the AI does that can't be undone · pages that load on hotel wifi · empty/loading/error
> states on every screen · actionable error messages · forms that keep what people typed · emails
> that render in every client · notifications people can turn off · undo · keyboard nav and screen
> reader support · translations with locale-formatted dates/numbers · a back button that behaves ·
> code a human can read · code review on every change · a branching strategy · monthly dependency
> upgrades · framework upgrades before security patches stop · deleting the AI's dead code ·
> splitting the 2,000-line file the AI kept appending to · architecture decisions written down · a
> README that gets a new engineer running in under an hour · documentation · an admin panel · support
> tooling · a changelog · terms and privacy policy that match the code · every account/domain/repo in
> the company's name · a bus factor higher than one.

And the people a vibe-coded app still needs: a senior engineer reading every line before it ships; a
backend engineer designing the data model; someone explaining why one fix created two bugs; a DevOps
engineer for deploys/rollbacks/the cloud bill; whoever answers the 3am page when payments stop;
security for patches and audits; QA; a tech lead who says no to the feature that breaks three others;
an architect; someone who remembers why it's built this way a year from now.

---

## 3. The low-effort marketing loop (consumer apps only, NOT Oric)

Also pasted 19 Oct 2026. Applies to **consumer** apps (Parallax etc.) — **not Oric**, which is B2B
sold face-to-face to mandi traders and does not grow through Google/SEO.

1. Landing page for the app.
2. Put that URL in the Play Store / App Store listing.
3. Submit the page to Google Search Console + Bing Webmaster to track performance.
4. Once impressions come in, build more pages around what's being searched, and optimise.
5. Localise to 10+ more languages.
6. Keep iterating. Track which pages send people to the store — that signals what to expand and
   translate first.
