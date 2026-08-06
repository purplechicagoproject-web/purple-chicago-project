// Cloudflare Pages Function: GET /api/stats
// Returns { "vendor-slug": count, ... } for every tracked vendor.
//
// If a STATS_TOKEN environment variable is set (Pages dashboard -> Settings
// -> Environment variables), this requires a matching ?token= query param.
// If it's not set, the endpoint is open (click counts aren't sensitive, but
// you can lock it down this way whenever you'd rather not).

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.PCHIP_CLICKS) {
    return new Response(JSON.stringify({ error: "KV binding PCHIP_CLICKS not configured" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  if (env.STATS_TOKEN) {
    const url = new URL(request.url);
    if (url.searchParams.get("token") !== env.STATS_TOKEN) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }
  }

  const stats = {};
  let cursor;
  do {
    const page = await env.PCHIP_CLICKS.list({ prefix: "clicks:", cursor });
    for (const key of page.keys) {
      const slug = key.name.slice("clicks:".length);
      stats[slug] = parseInt((await env.PCHIP_CLICKS.get(key.name)) || "0", 10);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);

  return new Response(JSON.stringify(stats, null, 2), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
