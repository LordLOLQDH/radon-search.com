(() => {
  const config = window.RADON_CONFIG || {};
  const CONSENT_KEY = "radon-search-history-consent-v1";
  const visitorKey = "radon-search-visitor-id";
  const getVisitorId = () => {
    let id = localStorage.getItem(visitorKey);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(visitorKey, id);
    }
    return id;
  };
  window.RadonSearch = {
    historyEnabled: () => localStorage.getItem(CONSENT_KEY) === "yes",
    setHistoryEnabled: (enabled) => localStorage.setItem(CONSENT_KEY, enabled ? "yes" : "no"),
    async search(query) {
      if (!config.apiUrl) return { configured: false, results: [] };
      const response = await fetch(config.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.supabaseAnonKey ? { "apikey": config.supabaseAnonKey } : {})
        },
        body: JSON.stringify({
          action: "search",
          query,
          saveHistory: this.historyEnabled(),
          visitorId: this.historyEnabled() ? getVisitorId() : null
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Die Suche ist momentan nicht verfügbar.");
      return { configured: true, ...data };
    }
  };
  document.querySelectorAll("[data-history-consent]").forEach((control) => {
    control.checked = window.RadonSearch.historyEnabled();
    control.addEventListener("change", () => window.RadonSearch.setHistoryEnabled(control.checked));
  });
  document.querySelectorAll("[data-cookie-status]").forEach((node) => {
    node.textContent = window.RadonSearch.historyEnabled()
      ? "Suchverlauf ist aktiviert. Suchbegriffe werden bei angeschlossenem Backend serverseitig gespeichert."
      : "Suchverlauf ist ausgeschaltet. Es werden keine Suchbegriffe über diese Funktion gespeichert.";
  });
})();
