---
name: website-legal-check
description: Check a website so it doesn't get its owner sued - privacy policy, terms, cookie policy and consent, refund policy, form consent, data minimisation, analytics and third-party embeds, accessibility (alt text, contrast, keyboard forms, clear labels), no fake reviews or unsupported claims, business details, image copyright, and the local laws that apply. Use for any website or web app before launch or when asked "is my site legal", "add a privacy policy", "cookie consent", "legal pages", "compliance check".
when_to_use: Any request about a website's legal pages, privacy, cookies, consent, terms, refunds, accessibility compliance or "can I get sued for this site", for any of Shreyansh's sites (Balaji Fruit Company, his personal site) or apps.
---

# Website legal check

Saved from Shreyansh's own prompt:

> I do not want my vibe-coded website to get sued. So, please add a privacy policy page, a terms and
> conditions page, and add a cookie policy. Check if I need cookie consent and add a refund policy and
> add form consent. Only collect necessary data, check analytics tracking, check third party embeds,
> make the site accessible, add alt text, check color contrast, and make forms keyboard friendly. Use
> clear button labels, remove fake reviews, remove unsupported claims, add business details, and check
> copyright on images. Check applicable local laws and flag any other risks and make no mistakes.

## How to run it

1. **Read the site first**: every page, form, script and embed. List what personal data it actually
   collects (forms, analytics, cookies, embeds, chat widgets) and where it goes. Nothing is assumed.
2. **Work out which laws apply** from where the business is and who the site serves. For an Indian
   business that's at least the Digital Personal Data Protection Act 2023 (and its Rules), the IT Act
   2000 and its rules, and the Consumer Protection Act 2019 (incl. E-Commerce Rules if it sells
   online). Add GDPR / UK GDPR only if it targets EU/UK visitors, and US state laws only if it targets
   the US. Say which you applied and why; mark anything unverified.
3. **Go through the checklist** below, then fix what can be fixed in code and list what needs the
   owner's facts (registered address, GSTIN, grievance officer, refund terms).
4. **Report**: a table of each item with Pass / Fixed / Needs owner / Not applicable, and the risk of
   each open item in one line.

## Checklist

- **Pages:** privacy policy, terms and conditions, cookie policy, refund/cancellation policy (if
  anything is sold), contact and business details (legal name, address, email, phone, GSTIN if
  applicable), grievance officer where the law requires one.
- **Consent:** cookie consent only where non-essential cookies or trackers run, and nothing loads
  before consent; form consent with a clear purpose next to each form; no pre-ticked boxes.
- **Data minimisation:** every form field justified; drop the ones that aren't needed.
- **Analytics and embeds:** what each one collects, whether it sets cookies, whether it's disclosed.
- **Accessibility:** alt text on meaningful images, colour contrast (WCAG AA), keyboard-usable forms
  and menus, visible focus, clear button and link labels.
- **Claims and content:** no fake or unverifiable reviews, no unsupported claims ("No. 1", "best",
  certifications not held), image and font licences checked.
- **Other risks:** trademarks in the name or logo, third-party brand names, outdated legal pages.

Policies must describe what the site actually does. Never generate boilerplate that claims practices
the site doesn't follow; say what's missing instead. This is a checklist, not legal advice: for
anything high-risk, say a lawyer should confirm it.
