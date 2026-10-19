---
name: ship-audit
description: Audit an app or website before it ships to real users - legal/privacy (policies, cookies, consent, claims, Indian + GDPR law), accessibility (WCAG 2.2 AA with Next.js/Radix/DataGrid fixes), security and shipping readiness (Supabase RLS, secrets, tested restore, money-as-integers, rate limits, backups), and consumer marketing/store-listing basics. Use before launch or when asked "is this ready to ship", "is my site legal", "add a privacy policy", "accessibility audit", "pre-launch check", "can I get sued".
when_to_use: Any pre-launch or pre-ship review of a site or app - "is it ready", "is my site legal", "privacy policy", "cookie consent", "accessibility / a11y / WCAG", "RLS", "secrets check", "pre-launch", "can I get sued", "store listing", "landing page" - for any of Shreyansh's apps (Oric, Parallax, the websites) or a client's.
---

# Ship audit

One pre-launch audit, four areas. **Do not run all four blindly** — pick the ones that fit what's
shipping, because a local B2B tool and a consumer website need different things. Say which areas you
ran and why.

## Step 1 — decide which areas apply

| Area | Reference | Run it when… |
|---|---|---|
| **Security & shipping** | `references/security-shipping.md` | Always. Every app that touches a real user. |
| **Legal / privacy** | `references/legal.md` | It's a public website/web app, collects any personal data, or sells anything. |
| **Accessibility** | `references/accessibility.md` | It has a UI real users operate — especially the Next.js apps (Estimo, Oric, indas-ui). |
| **Marketing / store** | `references/marketing-store.md` | It's a **consumer** app going on the stores. **Skip for Oric** (sold face-to-face, not via search). |

Quick calls for Shreyansh's apps:
- **Oric** (mandi finance, B2B local) → security+shipping + accessibility + legal. **Not** marketing/store.
- **Parallax / consumer app** → all four.
- **A website** (Balaji Fruit Co, personal) → legal + accessibility + the security basics; marketing if it's for growth.

## Step 2 — read before you judge

Read the thing first: pages, forms, scripts, embeds, tables, auth. List what it actually does and
what data it actually collects. **Nothing assumed** — this is an audit, not a guess. For a codebase,
grep for the real state (RLS policies, env usage, hardcoded secrets) rather than trusting the README.

## Step 3 — run each applicable reference

Open the reference file for each area you chose and work its checklist. Each one says how to run it
and what "pass" means. For accessibility on a Next.js app, use its code examples directly — they're
written for this stack (Radix, Tailwind, the Indas DataGrid).

## Step 4 — report

One table across all areas run: each item as **Pass / Fixed / Needs owner / Not applicable**, and the
risk of every open item in one line. Fix what's fixable in code; list what needs Shreyansh's facts
(business address, GSTIN, refund terms, grievance officer). State which laws/standards you applied and
mark anything unverified.

## Rules

- **Evidence before "done."** Actually run the check — grep the code, open the page, try the RLS
  bypass — before calling anything Pass. Pairs with the `verify` skill.
- **Never write a policy that claims something the app doesn't do.** Say what's missing instead.
- Not legal advice. For anything high-risk, say a lawyer should confirm it.
- Don't bolt on enterprise scope (SSO, SOC 2, multi-region) unless a real contract demands it — the
  security reference keeps that list in an appendix for exactly that reason.
