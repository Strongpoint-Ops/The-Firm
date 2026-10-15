/*
 * The Strongpoint Firm — lead intake.
 *
 * One endpoint for every property. Build, Advisory and Principal all POST
 * here rather than each carrying its own backend, because the firm is the
 * contracting party: a lead belongs to it whichever site produced it.
 *
 * POST /api/lead   -> validate, store in D1, notify by email
 * everything else  -> static assets
 *
 * The form never opens a mail client and never calls a third party from the
 * browser. The page posts JSON, this Worker answers JSON, the page repaints.
 *
 * Mail is sent through Resend from the Worker. If RESEND_API_KEY is not set
 * the lead is still stored and the submitter still gets a success response —
 * losing a lead because a key is missing is the one outcome worth avoiding.
 * `npx wrangler d1 execute strongpoint-leads --command "SELECT * FROM leads"`
 * reads them back meanwhile.
 */

const BUILD = '2026-10-15-leads-1';

// Origins allowed to post. A lead can come from any property.
const ORIGINS = new Set([
  'https://strongpointops.com',
  'https://www.strongpointops.com',
  'https://build.strongpointops.com',
  'https://consult.strongpointops.com',
  'https://principal.strongpointops.com',
]);

// What each site is allowed to put in `need`. Anything else is stored as
// "Other" rather than rejected — a lead is worth more than a tidy enum.
const NEEDS = [
  'Advisory / consulting',
  'Estimating',
  'Project / construction management',
  'Not sure yet',
];

const LIMITS = { name: 120, email: 160, org: 160, where: 120, need: 80, msg: 4000 };

function cors(origin) {
  const h = {
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'origin',
  };
  if (origin && ORIGINS.has(origin)) h['access-control-allow-origin'] = origin;
  return h;
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...cors(origin) },
  });
}

function clean(v, max) {
  if (typeof v !== 'string') return '';
  // Strip control characters; they only ever arrive from a bot or a paste.
  return v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max);
}

// Deliberately permissive. Rejecting a real address costs a lead; letting a
// junk one through costs nothing, because the message still arrives.
function emailOk(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= LIMITS.email;
}

function esc(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

async function notify(env, lead) {
  const key = env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: 'no RESEND_API_KEY configured' };

  const to = env.LEAD_TO || 'info@strongpointops.com';
  const from = env.LEAD_FROM || 'Strongpoint leads <leads@strongpointops.com>';

  const lines = [
    `Name:     ${lead.name}`,
    `Email:    ${lead.email}`,
    lead.org ? `Company:  ${lead.org}` : null,
    lead.where ? `Location: ${lead.where}` : null,
    `Need:     ${lead.need}`,
    `Source:   ${lead.source}`,
    '',
    lead.msg || '(no message)',
  ].filter(Boolean);

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: lead.email,          // so replying goes straight to the lead
        subject: `${lead.need} — ${lead.name}${lead.org ? ' (' + lead.org + ')' : ''}`,
        text: lines.join('\n'),
        html:
          '<pre style="font:14px ui-monospace,Menlo,monospace;white-space:pre-wrap">' +
          esc(lines.join('\n')) +
          '</pre>',
      }),
    });
    if (!r.ok) return { sent: false, reason: `resend ${r.status}: ${(await r.text()).slice(0, 200)}` };
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: String(e).slice(0, 200) };
  }
}

async function handleLead(request, env, ctx) {
  const origin = request.headers.get('origin');
  if (origin && !ORIGINS.has(origin)) return json({ ok: false, error: 'origin' }, 403, origin);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Could not read that submission.' }, 400, origin);
  }

  // Honeypot. A real browser never fills a field it cannot see, so answer 200
  // and drop it — telling a bot it failed only teaches it to try again.
  if (clean(body.company_url, 200)) return json({ ok: true }, 200, origin);

  // Anything submitted within two seconds of the form rendering is automated.
  const elapsed = Number(body.elapsed);
  if (Number.isFinite(elapsed) && elapsed >= 0 && elapsed < 2000) {
    return json({ ok: true }, 200, origin);
  }

  const lead = {
    name: clean(body.name, LIMITS.name),
    email: clean(body.email, LIMITS.email).toLowerCase(),
    org: clean(body.org, LIMITS.org),
    where: clean(body.where, LIMITS.where),
    need: clean(body.need, LIMITS.need),
    msg: clean(body.msg, LIMITS.msg),
    source: clean(body.source, 80) || (origin || 'unknown'),
  };

  if (!lead.name) return json({ ok: false, error: 'Please add your name.' }, 400, origin);
  if (!emailOk(lead.email)) return json({ ok: false, error: 'That email does not look right.' }, 400, origin);
  if (!lead.msg) return json({ ok: false, error: 'Please tell us what you need.' }, 400, origin);
  if (!NEEDS.includes(lead.need)) lead.need = 'Other';

  // Nowhere to put it is not a success. Say so plainly rather than taking the
  // submission into a black hole and showing a confirmation for it.
  if (!env.DB && !env.RESEND_API_KEY) {
    console.error('lead endpoint has no sink configured', JSON.stringify(lead));
    return json({
      ok: false,
      error: 'Our intake is not finished being wired up. Please email info@strongpointops.com — it reaches the same place.',
    }, 503, origin);
  }

  const ip = request.headers.get('cf-connecting-ip') || '';
  const ua = (request.headers.get('user-agent') || '').slice(0, 300);

  if (env.DB) {
    try {
      // Five an hour from one address is far above any real use and well
      // below what it takes to be worth abusing.
      const since = Date.now() - 3600_000;
      const row = await env.DB.prepare(
        'SELECT COUNT(*) AS n FROM leads WHERE ip = ? AND created_ms > ?'
      ).bind(ip, since).first();
      if (row && row.n >= 5) {
        return json({ ok: false, error: 'That is a lot of submissions. Email info@strongpointops.com instead.' }, 429, origin);
      }

      await env.DB.prepare(
        `INSERT INTO leads (created_ms, created_at, source, name, email, org, place, need, msg, ip, ua)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`
      ).bind(
        Date.now(), new Date().toISOString(), lead.source,
        lead.name, lead.email, lead.org, lead.where, lead.need, lead.msg, ip, ua
      ).run();
    } catch (e) {
      // A storage failure must not lose the lead: fall through to email.
      console.error('d1 insert failed', String(e));
    }
  }

  // Send after responding — the submitter should not wait on an email API.
  ctx.waitUntil(
    notify(env, lead).then((r) => {
      if (!r.sent) console.error('lead email not sent:', r.reason, JSON.stringify(lead));
    })
  );

  return json({ ok: true }, 200, origin);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/lead') {
      const origin = request.headers.get('origin');
      if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
      if (request.method !== 'POST') return json({ ok: false, error: 'method' }, 405, origin);
      return handleLead(request, env, ctx);
    }

    if (url.pathname === '/api/version') {
      return json(
        { build: BUILD, db: Boolean(env.DB), mail: Boolean(env.RESEND_API_KEY) },
        200,
        request.headers.get('origin')
      );
    }

    return env.ASSETS.fetch(request);
  },
};
