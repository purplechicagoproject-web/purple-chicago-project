// Shared Instagram embed helper — blockquote.instagram-media + embed.js,
// used by any page that embeds a single Instagram post (no oEmbed API call
// needed). process() is safe to call repeatedly; it only converts
// blockquotes it hasn't already turned into an iframe.
let scriptPromise = null;

export function loadInstagramEmbedScript() {
  if (window.instgrm) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://www.instagram.com/embed.js";
    script.async = true;
    script.onload = resolve;
    document.body.appendChild(script);
  });
  return scriptPromise;
}

export function processInstagramEmbeds() {
  window.instgrm?.Embeds?.process();
}

// The fallback link inside is Instagram's own placeholder markup (shown
// only until embed.js processes it), not a caption we're adding.
export function renderInstagramBlockquote(url, escapeHtml) {
  return `
    <blockquote
      class="instagram-media"
      data-instgrm-permalink="${escapeHtml(url)}"
      data-instgrm-version="14"
      style="background:#FFF; border:0; border-radius:3px; margin: 1px auto; max-width:540px; min-width:326px; padding:0; width:99.375%;"
    >
      <a href="${escapeHtml(url)}" target="_blank" rel="noopener"></a>
    </blockquote>
  `;
}
