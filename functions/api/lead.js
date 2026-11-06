// Receives the /claim form, validates it, and forwards it to the webhook set in the Pages
// environment variable LEAD_WEBHOOK_URL (e.g. a GoHighLevel inbound webhook).
// The page always continues to the booking calendar, whatever this returns.
const reply = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

const clip = (v, n) => String(v == null ? '' : v).trim().slice(0, n);

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) return reply({ ok: false }, 403);

  const raw = await request.text();
  if (raw.length > 8192) return reply({ ok: false }, 413);
  let d;
  try { d = JSON.parse(raw); } catch { return reply({ ok: false }, 400); }

  const lead = {
    first_name: clip(d.first_name, 80),
    company: clip(d.company, 120),
    email: clip(d.email, 160),
    phone: clip(d.phone, 40),
  };
  if (!lead.first_name) return reply({ ok: false, field: 'first_name', reason: 'Fill this in.' }, 422);
  if (!lead.company) return reply({ ok: false, field: 'company', reason: 'Fill this in.' }, 422);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lead.email)) return reply({ ok: false, field: 'email', reason: 'Check your email address.' }, 422);
  const digits = lead.phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return reply({ ok: false, field: 'phone', reason: 'Enter a phone number with area code.' }, 422);

  if (d.dry === true) return reply({ ok: true, dry: true });

  if (env.LEAD_WEBHOOK_URL) {
    const payload = {
      source: 'marketopenmedia.com/claim',
      received_at: new Date().toISOString(),
      ...lead,
      answers: d.answers && typeof d.answers === 'object' ? d.answers : {},
      arm: clip(d.arm, 8),
      sid: clip(d.sid, 40),
      utm_source: clip(d.utm_source, 120), utm_medium: clip(d.utm_medium, 120), utm_campaign: clip(d.utm_campaign, 120),
      utm_content: clip(d.utm_content, 120), utm_term: clip(d.utm_term, 120), fbclid: clip(d.fbclid, 200),
    };
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 4000);
    try {
      const r = await fetch(env.LEAD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: ctl.signal,
      });
      if (!r.ok) console.log('lead webhook returned', r.status);
    } catch {
      console.log('lead webhook failed');
    } finally {
      clearTimeout(timer);
    }
  } else {
    console.log('lead received but LEAD_WEBHOOK_URL is not set');
  }
  return reply({ ok: true });
}
