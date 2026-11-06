// The A/B test is finished: arm "b" (the /claim page) is the winner and the only live arm.
export function onRequestGet() {
  return new Response(JSON.stringify({ arm: 'b' }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
