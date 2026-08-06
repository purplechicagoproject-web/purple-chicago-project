// Fires a click-count ping at the Cloudflare Pages Function in
// functions/api/click.js. Non-blocking: the website link opens in a new tab
// regardless of whether the ping succeeds.
export function trackWebsiteClick(slug) {
  try {
    const body = JSON.stringify({ slug });
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/click", blob);
    } else {
      fetch("/api/click", { method: "POST", body, keepalive: true });
    }
  } catch {
    // tracking must never block or break the actual link
  }
}
