# The Strongpoint Firm

**Live: https://strongpointops.com** — the parent homepage, on the apex.

Every sibling site back-links to the apex. The domain moved off Squarespace to
Cloudflare on 2026-10-15; the zone is on Cloudflare nameservers, but the apex and
`www` records must be attached to this Worker as a custom domain in the dashboard
before they stop proxying to the Squarespace origin. Until then `curl -sI
https://strongpointops.com/` answers a Squarespace 301 to `www` (tell-tale:
a `crumb` cookie and an `x-contextid` header), not this site.

The firm holds the contracts, the payment processing, the recruitment and the
partner vetting. The operating companies deliver the work.

Plain HTML/CSS/JS. **No build step, no framework, no npm dependencies.** Every
page is self-contained.

## Open: email authentication (deferred 2026-10-15)

`info@strongpointops.com` runs on Google Workspace (`MX -> smtp.google.com`).
Done so far, in the zone:

- **SPF** — `v=spf1 include:_spf.google.com ~all`. Live and parsing.
- **DMARC** — `v=DMARC1; p=none; rua=...@dmarc-reports.cloudflare.net`
  via Cloudflare DMARC Management. **Monitoring only — it does not stop
  spoofing.** It reports what receivers see and delivers the mail anyway.

Still missing, in priority order:

1. **DKIM.** The gap that matters. Google Admin -> Apps -> Google Workspace ->
   Gmail -> Authenticate email -> Generate new record (2048-bit, selector
   `google`), then add the TXT at `google._domainkey` (DNS only) and click
   **Start authentication** back in Google.
   DMARC passes if SPF **or** DKIM passes with alignment, and forwarding
   breaks SPF while preserving DKIM — so without DKIM, mail an investor
   forwards to a partner fails, and `p=reject` can never be safe.
2. **Ramp DMARC.** 2-4 weeks at `p=none`, confirm every legitimate sender
   passes in the Cloudflare dashboard, then `p=quarantine` (optionally
   `pct=25` first), then `p=reject`.
3. **Before any newsletter goes out**, add that sender's `include:` to the
   SPF record. One SPF record per domain, ever — edit the existing TXT, never
   add a second. Two records is a permerror and breaks authentication
   outright. Keep `~all` until that include is in; `-all` would make the
   first market note vanish.

Until step 1 and 2 are done, anyone can still send mail that appears to come
from this domain.

```
wrangler.jsonc   Cloudflare config — static assets only, no Worker script
site/
  index.html     hero, the three lines of work, how an engagement runs, the firm
  contact.html   intake by line of work and stage; composes a mailto
  404.html       lists every real destination including the operating companies
```

## The three lines, and who delivers each

| Line | Delivered by | Billing |
| --- | --- | --- |
| Advisory & preconstruction — feasibility, capital planning, entitlement, diligence, white papers | Strongpoint Advisory (`advisory.` — standing up) | retainer or fixed fee per deliverable |
| Construction & contracting — owner's-rep PM and CM under one GC | Strongpoint Build (`build.`) | cost-plus; flat retainer over $2.5M |
| Digital & brand — SEO, web development, brand systems | a subsidiary in development | — |

**`dashboard.` is not a service line.** It is the client portal — invoices,
service KPIs and reports, included free with an active engagement. The page says
"not a product we sell" on purpose; don't let it drift back into the sales copy.

## What the parent itself does

Contracts, payment processing, recruitment and partner vetting all run through
the firm. That is the actual differentiator: one agreement and one accountable
party however many specialists a job takes. It is not a holding company that
forward invoices.

## The newsletter is the lead generator

Four qualifying selects — seat, what's in front of you, scale, timing — decide
whether a signup gets a call or just the newsletter. That is stated on the page
rather than hidden; the honesty is the reason people answer truthfully. **No list
backend yet:** the form composes a mailto carrying the answers instead of
silently dropping them.

The same block belongs on every subsidiary page.

## Theme

This is the parent theme from the brand playbook: the only light-grounded
property in the group, because the holding company is the one that is not an
operating console.

- ground `#f2f2f3` / surface `#e9e9ea`
- accent `#4c7094` (4.63:1 — the AA-corrected value, **not** the old `#5980a6`
  which measured 3.71:1 and failed for link text)
- family color `#6f8fa8` for links that leave the property, with `↗`
- Barlow Condensed 600 / Barlow / IBM Plex Mono
- blueprint corner marks on framed panels

## Placeholders

`[surname]`, `info@strongpointops.com`, `[PHONE]`, `[CCB #]`, `[registry #]`. Confirm COBID /
DBE / SDVOSB before claiming any of it — the copy says only *veteran-owned*,
which is the safe version. The contact form has no backend.

## Local

```bash
cd site && python3 -m http.server 8899
```
