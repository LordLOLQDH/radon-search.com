import { createClient } from "npm:@supabase/supabase-js@2";

// GitHub Pages sends the origin without the repository path. Keep the response
// origin fixed, and normalize the secret so either the host or full Pages URL works.
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://lordlolqdh.github.io",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const publicKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
const authClient = createClient(supabaseUrl, publicKey, { auth: { persistSession: false } });

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}


function cleanHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;|&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function parseDuckDuckGo(html: string): Array<{title:string; url:string; snippet:string; source:string}> {
  const results: Array<{title:string; url:string; snippet:string; source:string}> = [];
  const regex = /<a\b(?=[^>]*\bclass="[^"]*\bresult__a\b[^"]*")([^>]*)>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(regex)) {
    const href = (match[1] ?? "").match(/\bhref="([^"]+)"/i)?.[1];
    if (!href) continue;
    let url = cleanHtml(href);
    try {
      const parsed = new URL(url, "https://html.duckduckgo.com");
      const redirected = parsed.searchParams.get("uddg");
      if (redirected) url = redirected;
      if (!/^https?:\/\//i.test(url)) continue;
      const host = new URL(url).hostname.toLowerCase();
      if (host === "duckduckgo.com" || host.endsWith(".duckduckgo.com")) continue;
    } catch { continue; }
    const title = cleanHtml(match[2] ?? "") || url;
    const after = html.slice((match.index ?? 0) + match[0].length, (match.index ?? 0) + match[0].length + 1800);
    const snippetMatch = after.match(/class="[^"]*\bresult__snippet\b[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/i);
    let source = "Web";
    try { source = new URL(url).hostname; } catch { /* ignore */ }
    results.push({ title, url, snippet: snippetMatch ? cleanHtml(snippetMatch[1]) : "Website öffnen, um weitere Informationen zu lesen.", source });
    if (results.length >= 10) break;
  }
  return results;
}
function parseSearchHtml(html: string, provider: "Google" | "Bing"): Array<{title:string; url:string; snippet:string; source:string}> {
  const results: Array<{title:string; url:string; snippet:string; source:string}> = [];
  const patterns = provider === "Google"
    ? [
        /<a\b[^>]*href="(https?:\/\/[^"]+)"[^>]*>\s*<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<\/a>/gi,
        /<a\b[^>]*href="\/url\?q=([^&"]+)[^"]*"[^>]*>\s*<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<\/a>/gi,
      ]
    : [
        /<li\b[^>]*class="[^"]*b_algo[^"]*"[^>]*>[\s\S]*?<h2[^>]*>\s*<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/h2>([\s\S]*?)<\/li>/gi,
      ];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      try {
        let url = match[1];
        if (provider === "Google" && url.startsWith("/url?")) {
          url = new URL(url, "https://www.google.com").searchParams.get("q") ?? "";
        } else if (provider === "Google") {
          url = decodeURIComponent(url.replace(/&amp;/g, "&"));
        }
        url = url.replace(/&amp;/g, "&");
        if (!/^https?:\/\//i.test(url)) continue;
        const host = new URL(url).hostname.toLowerCase();
        if (provider === "Google" && (host === "google.com" || host.endsWith(".google.com"))) continue;
        if (provider === "Bing" && (host === "bing.com" || host.endsWith(".bing.com"))) continue;
        const title = cleanHtml(match[2] ?? "") || url;
        const snippet = provider === "Bing"
          ? cleanHtml((match[3] ?? "").match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? "")
          : "";
        if (!results.some((r) => r.url === url)) {
          results.push({ title, url, snippet: snippet || "Website öffnen, um weitere Informationen zu lesen.", source: host });
        }
        if (results.length >= 10) return results;
      } catch { /* skip malformed result */ }
    }
  }
  return results;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Methode nicht erlaubt." }, 405);
  if (!supabaseUrl || !serviceKey || !publicKey) return json({ error: "Backend ist noch nicht konfiguriert." }, 503);

  const origin = req.headers.get("origin");
  const configuredOrigin = Deno.env.get("RADON_ALLOWED_ORIGIN") ?? "https://lordlolqdh.github.io";
  let allowedOrigin = "https://lordlolqdh.github.io";
  try { allowedOrigin = new URL(configuredOrigin).origin; } catch { /* use the safe default */ }
  if (origin && origin !== allowedOrigin) return json({ error: "Ungueltiger Ursprung." }, 403);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Ungueltige Anfrage." }, 400);
  }

  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipHash = await sha256((Deno.env.get("RATE_LIMIT_SECRET") ?? serviceKey) + ":" + forwarded);
  const now = Date.now();
  const { data: limit } = await db.from("request_limits").select("*").eq("ip_hash", ipHash).maybeSingle();
  if (!limit || now - new Date(limit.window_started_at).getTime() > 60_000) {
    await db.from("request_limits").upsert({ ip_hash: ipHash, window_started_at: new Date().toISOString(), request_count: 1 });
  } else if (limit.request_count >= 30) {
    await db.from("security_events").insert({ event_type: "rate_limited", reason: "Mehr als 30 Anfragen pro Minute", ip_hash: ipHash });
    return json({ error: "Zu viele Anfragen. Bitte warte eine Minute." }, 429);
  } else {
    await db.from("request_limits").update({ request_count: limit.request_count + 1 }).eq("ip_hash", ipHash);
  }

  const action = String(body.action ?? "");
  if (action === "search") {
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const visitorId = typeof body.visitorId === "string" && /^[0-9a-f-]{36}$/i.test(body.visitorId) ? body.visitorId : null;
    const saveHistory = body.saveHistory === true;
    const suspicious = query.length > 300 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(query) || /(.)\1{80,}/.test(query);
    if (!query || suspicious) {
      await db.from("security_events").insert({
        event_type: "blocked_query",
        reason: !query ? "Leere Suchanfrage" : "Ungueltiges oder auffaelliges Eingabeformat",
        ip_hash: ipHash,
        query_excerpt: query.slice(0, 80),
      });
      return json({ error: "Diese Suchanfrage wurde aus Sicherheitsgruenden abgelehnt." }, 400);
    }

    // Search history is saved only after the user explicitly enables this setting.
    if (saveHistory) {
      await db.from("search_history").insert({
        query_text: query.slice(0, 300),
        visitor_id: visitorId,
        consent_version: "v1",
        result_count: 0,
      });
    }

    // Try several hidden HTML search providers, then public SearXNG JSON instances.
    // Providers are used only server-side; Radon Search remains the visible interface.
    let results: Array<{title:string; url:string; snippet:string; source:string}> = [];
    let providerUsed = "";
    const htmlProviders: Array<{name:"Google"|"Bing"|"DuckDuckGo"; url:string; build:(q:string)=>string}> = [
      { name: "Google", url: "https://www.google.com/search", build: (q) => "https://www.google.com/search?num=10&q=" + encodeURIComponent(q) },
      { name: "Bing", url: "https://www.bing.com/search", build: (q) => "https://www.bing.com/search?count=10&q=" + encodeURIComponent(q) },
      { name: "DuckDuckGo", url: "https://html.duckduckgo.com/html/", build: (q) => "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(q) },
    ];
    for (const provider of htmlProviders) {
      try {
        const upstream = await fetch(provider.build(query), {
          headers: {
            "Accept": "text/html,application/xhtml+xml",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
          },
          signal: AbortSignal.timeout(4500),
        });
        if (!upstream.ok) continue;
        const html = await upstream.text();
        if (provider.name === "DuckDuckGo") results = parseDuckDuckGo(html);
        else results = parseSearchHtml(html, provider.name);
        if (results.length) {
          providerUsed = provider.name;
          break;
        }
      } catch {
        // Continue to the next server-side provider.
      }
    }
    if (!results.length) {
      const providers = [
        "https://searx.tiekoetter.com/search",
        "https://searx.be/search",
        "https://search.sapti.me/search",
      ];
      for (const provider of providers) {
        try {
          const endpoint = new URL(provider);
          endpoint.searchParams.set("q", query);
          endpoint.searchParams.set("format", "json");
          endpoint.searchParams.set("language", "all");
          endpoint.searchParams.set("safesearch", "0");
          const upstream = await fetch(endpoint.toString(), {
            headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0 (compatible; RadonSearch/0.6)" },
            signal: AbortSignal.timeout(3500),
          });
          if (!upstream.ok) continue;
          const payload = await upstream.json();
          const items = Array.isArray(payload?.results) ? payload.results : [];
          const mapped = items
            .filter((item: Record<string, unknown>) => typeof item.url === "string" && /^https?:\/\//i.test(item.url as string))
            .slice(0, 10)
            .map((item: Record<string, unknown>) => ({
              title: String(item.title ?? item.url ?? "Website"),
              url: String(item.url),
              snippet: cleanHtml(String(item.content ?? item.snippet ?? "Website öffnen, um weitere Informationen zu lesen.")),
              source: (() => { try { return new URL(String(item.url)).hostname; } catch { return "Web"; } })(),
            }));
          if (mapped.length) { results = mapped; providerUsed = new URL(provider).hostname; break; }
        } catch { /* Continue to next instance. */ }
      }
    }
    if (saveHistory && visitorId) {
      await db.from("search_history").update({ result_count: results.length })
        .eq("visitor_id", visitorId).eq("query_text", query.slice(0, 300))
        .order("created_at", { ascending: false }).limit(1);
    }
    return json({
      ok: true,
      indexed: false,
      provider: providerUsed || "Websuche",
      results,
      message: results.length
        ? "Web-Treffer aus mehreren Suchmaschinen. Die Ergebnisse können je nach Verfügbarkeit der öffentlichen Suchdienste variieren; Radons eigener Webindex ist noch im Aufbau."
        : "Die externen Suchdienste haben keine Ergebnisse geliefert. Bitte versuche eine andere Suchanfrage.",
    });
  }

  if (action.startsWith("admin-")) {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Anmeldung erforderlich." }, 401);
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "Anmeldung ungueltig." }, 401);
    const adminEmail = (Deno.env.get("RADON_ADMIN_EMAIL") ?? "").toLowerCase();
    if (!adminEmail || (authData.user.email ?? "").toLowerCase() !== adminEmail) {
      return json({ error: "Keine Admin-Berechtigung." }, 403);
    }

    if (action === "admin-summary") {
      const [searches, events] = await Promise.all([
        db.from("search_history").select("id,created_at,query_text,visitor_id,result_count").order("created_at", { ascending: false }).limit(200),
        db.from("security_events").select("id,created_at,event_type,reason,query_excerpt").order("created_at", { ascending: false }).limit(100),
      ]);
      return json({ searches: searches.data ?? [], events: events.data ?? [] });
    }
    if (action === "admin-delete-search") {
      const id = Number(body.id);
      if (!Number.isSafeInteger(id) || id < 1) return json({ error: "Ungueltige ID." }, 400);
      const { error } = await db.from("search_history").delete().eq("id", id);
      if (error) return json({ error: "Loeschen fehlgeschlagen." }, 500);
      return json({ ok: true });
    }
    return json({ error: "Unbekannte Admin-Aktion." }, 400);
  }

  return json({ error: "Unbekannte Aktion." }, 400);
});
