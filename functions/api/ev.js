// Funnel analytics beacons. Accepted and discarded: nothing reads them since the old /admin went away.
export function onRequestPost() {
  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
}
