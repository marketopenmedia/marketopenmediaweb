// The GoHighLevel calendar already records the booking; this only has to acknowledge the page's ping.
export function onRequestPost() {
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
