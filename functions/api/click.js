// Cloudflare Pages Function: POST /api/click  { slug: "soul-burger-grill" }
// Increments a per-vendor click counter in KV. Requires a KV namespace
// bound to `PCHIP_CLICKS` (Pages dashboard -> Settings -> Functions ->
// KV namespace bindings). See DEPLOY.md.

const SLUG_PATTERN = /^[a-z0-9-]{1,80}$/;

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.PCHIP_CLICKS) {
    return new Response(JSON.stringify({ error: "KV binding PCHIP_CLICKS not configured" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const slug = typeof body.slug === "string" ? body.slug : "";
  if (!SLUG_PATTERN.test(slug)) {
    return new Response(JSON.stringify({ error: "invalid slug" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const key = `clicks:${slug}`;
  const current = parseInt((await env.PCHIP_CLICKS.get(key)) || "0", 10);
  await env.PCHIP_CLICKS.put(key, String(current + 1));

  return new Response(JSON.stringify({ ok: true, slug, count: current + 1 }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
