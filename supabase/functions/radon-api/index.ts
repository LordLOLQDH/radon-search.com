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

    // Temporary live search provider: Wikimedia's public search API.
    // This returns real, clickable results while Radon's independent crawler/index is still being built.
    try {
      const endpoint = new URL("https://de.wikipedia.org/w/api.php");
      endpoint.searchParams.set("action", "query");
      endpoint.searchParams.set("list", "search");
      endpoint.searchParams.set("srsearch", query);
      endpoint.searchParams.set("format", "json");
      endpoint.searchParams.set("utf8", "1");
      endpoint.searchParams.set("srlimit", "10");
      endpoint.searchParams.set("srprop", "snippet|timestamp");
      const upstream = await fetch(endpoint.toString(), {
        headers: { "Accept": "application/json", "User-Agent": "RadonSearch/0.4 (public search prototype)" },
        signal: AbortSignal.timeout(8000),
      });
      if (!upstream.ok) throw new Error("Suchanbieter nicht erreichbar");
      const payload = await upstream.json();
      const results = (payload?.query?.search ?? []).map((item: Record<string, unknown>) => {
        const title = String(item.title ?? "");
        return {
          title,
          url: "https://de.wikipedia.org/wiki/" + encodeURIComponent(title.replace(/ /g, "_")),
          snippet: String(item.snippet ?? "").replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"),
          source: "Wikimedia",
        };
      });
      if (saveHistory && visitorId) {
        await db.from("search_history").update({ result_count: results.length })
          .eq("visitor_id", visitorId).eq("query_text", query.slice(0, 300))
          .order("created_at", { ascending: false }).limit(1);
      }
      return json({
        ok: true,
        indexed: false,
        provider: "Wikimedia",
        results,
        message: results.length
          ? "Live-Treffer aus der deutschsprachigen Wikipedia. Der eigene Radon-Webindex befindet sich noch im Aufbau."
          : "Keine Treffer in der deutschsprachigen Wikipedia. Der eigene Radon-Webindex befindet sich noch im Aufbau.",
      });
    } catch {
      return json({
        ok: true,
        indexed: false,
        results: [],
        message: "Die Live-Suche ist momentan nicht erreichbar. Der eigene Radon-Webindex befindet sich noch im Aufbau.",
      });
    }
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
