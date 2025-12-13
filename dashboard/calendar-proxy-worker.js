export default {
  async fetch(request, env, ctx) {
    try {
      const u = new URL(request.url);
      const target = u.searchParams.get("url");

      if (!target) {
        return new Response("Missing ?url=", { status: 400, headers: cors() });
      }

      // Accept webcal:// and https://
      let fetchUrl = target.trim();

      if (fetchUrl.startsWith("webcal://")) {
        fetchUrl = "https://" + fetchUrl.slice("webcal://".length);
      }

      if (!fetchUrl.startsWith("https://")) {
        return new Response("Only webcal:// or https:// allowed", { status: 400, headers: cors() });
      }

      // Fetch ICS server-side (no browser CORS issues)
      const res = await fetch(fetchUrl, {
        headers: {
          "User-Agent": "Dashboard-ICS-Proxy/1.0",
          "Accept": "text/calendar,text/plain,*/*"
        }
      });

      if (!res.ok) {
        return new Response(`Upstream HTTP ${res.status}`, { status: 502, headers: cors() });
      }

      const text = await res.text();

      // Basic validation: should contain VCALENDAR
      if (!text.includes("BEGIN:VCALENDAR")) {
        return new Response("Upstream did not return ICS (BEGIN:VCALENDAR missing)", { status: 502, headers: cors() });
      }

      return new Response(text, {
        status: 200,
        headers: {
          ...cors(),
          "Content-Type": "text/calendar; charset=utf-8",
          "Cache-Control": "no-store"
        }
      });

    } catch (e) {
      return new Response("Proxy error: " + (e?.message || String(e)), { status: 500, headers: cors() });
    }
  }
};

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}