// Backend for the /claim funnel. Everything else on the site is served as static assets;
// only /api/* reaches this Worker (see assets.run_worker_first in wrangler.jsonc).
import F from '../claim/funnel.js';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
const clip = (v, n) => String(v == null ? '' : v).trim().slice(0, n);

// The test is over: arm "b" (/claim) won and is the only live arm.
const liveArm = () => F.liveArms()[0] || 'b';

function describeLead(answers, gate, d) {
  const lines = ['HVAC free trial funnel (marketopenmedia.com/claim)'];
  const why = { gbp: 'no Google Business Profile', site: 'no website', incomplete: 'quiz not finished' };
  lines.push(gate.ok ? 'Status: QUALIFIED' : 'Status: NOT QUALIFIED (' + (why[gate.reason] || gate.reason) + ')');
  for (const q of F.questions) {
    const opt = q.options.find((o) => o.v === answers[q.id]);
    if (opt) lines.push(q.q + ' ' + opt.t);
  }
  const src = [d.utm_source, d.utm_medium, d.utm_campaign, d.utm_content, d.utm_term].filter(Boolean).join(' / ');
  if (src) lines.push('Source: ' + src);
  return lines.join('\n');
}

async function sendToHubSpot(env, request, lead, message) {
  if (!env.HUBSPOT_FORM_GUID) {
    console.log('lead received but HUBSPOT_FORM_GUID is not set');
    return false;
  }
  const url = 'https://api.hsforms.com/submissions/v3/integration/submit/' + env.HUBSPOT_PORTAL_ID + '/' + env.HUBSPOT_FORM_GUID;
  const field = (name, value) => ({ objectTypeId: '0-1', name, value });
  const body = {
    submittedAt: String(Date.now()),
    fields: [
      field('firstname', lead.first_name),
      field('company', lead.company),
      field('email', lead.email),
      field('phone', lead.phone),
      field('message', message),
    ],
    context: {
      pageUri: 'https://marketopenmedia.com/claim/',
      pageName: 'Claim funnel - HVAC free trial',
      ipAddress: request.headers.get('cf-connecting-ip') || undefined,
    },
  };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 5000);
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal });
    if (!r.ok) {
      let types = '';
      try { types = ((await r.json()).errors || []).map((e) => e.errorType).join(','); } catch {}
      console.log('hubspot rejected the lead', r.status, types);
      return false;
    }
    return true;
  } catch {
    console.log('hubspot request failed');
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function handleLead(request, env) {
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) return json({ ok: false }, 403);
  const raw = await request.text();
  if (raw.length > 8192) return json({ ok: false }, 413);
  let d;
  try { d = JSON.parse(raw); } catch { return json({ ok: false }, 400); }

  const lead = { first_name: clip(d.first_name, 80), company: clip(d.company, 120), email: clip(d.email, 160), phone: clip(d.phone, 40) };
  if (!lead.first_name) return json({ ok: false, field: 'first_name', reason: 'Fill this in.' }, 422);
  if (!lead.company) return json({ ok: false, field: 'company', reason: 'Fill this in.' }, 422);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lead.email)) return json({ ok: false, field: 'email', reason: 'Check your email address.' }, 422);
  const digits = lead.phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return json({ ok: false, field: 'phone', reason: 'Enter a phone number with area code.' }, 422);

  const answers = d.answers && typeof d.answers === 'object' ? d.answers : {};
  const gate = F.gate(answers);
  if (d.dry === true) return json({ ok: true, dry: true, qualified: gate.ok });

  await sendToHubSpot(env, request, lead, describeLead(answers, gate, d));
  return json({ ok: true, qualified: gate.ok });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    const method = request.method;
    if (pathname === '/api/arm' && method === 'GET') return json({ arm: liveArm() });
    if (pathname === '/api/ev' && method === 'POST') return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
    if (pathname === '/api/booked' && method === 'POST') return json({ ok: true });
    if (pathname === '/api/lead' && method === 'POST') return handleLead(request, env);
    if (pathname.startsWith('/api/')) return json({ ok: false }, method === 'GET' || method === 'POST' ? 404 : 405);
    return env.ASSETS.fetch(request);
  },
};
