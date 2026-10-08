# The Strongpoint Firm

**Target: strongpointops.com** — the parent homepage. C-suite advisory, with the
operating companies that deliver the work.

Plain HTML/CSS/JS. **No build step, no framework, no npm dependencies.** Every
page is self-contained.

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
forwards invoices.

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
- family colour `#6f8fa8` for links that leave the property, with `↗`
- Barlow Condensed 600 / Barlow / IBM Plex Mono
- blueprint corner marks on framed panels

## Placeholders

`[surname]`, `[EMAIL]`, `[PHONE]`, `[CCB #]`, `[registry #]`. Confirm COBID /
DBE / SDVOSB before claiming any of it — the copy says only *veteran-owned*,
which is the safe version. The contact form has no backend.

## Local

```bash
cd site && python3 -m http.server 8899
```
