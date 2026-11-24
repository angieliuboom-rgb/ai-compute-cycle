(() => {
  const page = document.currentScript?.dataset.page;
  const publicSite = "https://ai-capex-cycle-lqj.chalkytrail12.chatgpt.site";
  const githubSite = "https://angieliuboom-rgb.github.io";
  // Offline copies have no tracker. Automated checks and browser privacy signals opt out.
  if (!["main", "coreweave"].includes(page) ||
      ![publicSite, githubSite].includes(location.origin) ||
      navigator.webdriver || navigator.onLine === false ||
      navigator.globalPrivacyControl === true ||
      [navigator.doNotTrack, window.doNotTrack].some(value => /^(1|yes)$/i.test(value))) {
    return;
  }

  const storageKey = "ai-compute-report.reader.v1";
  const uuid = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;
  const threshold = 30_000;

  function newId() {
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, n => n.toString(16).padStart(2, "0")).join("");
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16),
            hex.slice(16, 20), hex.slice(20)].join("-");
  }

  function getReaderId() {
    const fresh = newId();
    for (const name of ["localStorage", "sessionStorage"]) {
      try {
        const storage = window[name];
        const saved = storage.getItem(storageKey);
        if (uuid.test(saved)) return saved;
        storage.setItem(storageKey, fresh);
        return fresh;
      } catch {
        // Some browsers make persistent storage unavailable in private mode.
      }
    }
    return fresh;
  }

  function sourceCategory() {
    if (!document.referrer) return "direct";
    let from;
    try {
      from = new URL(document.referrer);
    } catch {
      return "direct";
    }
    if (from.origin === publicSite ||
        (from.origin === githubSite && (from.pathname === "/" ||
         from.pathname === "/ai-compute-cycle" ||
         from.pathname.startsWith("/ai-compute-cycle/")))) return "internal";
    const host = from.hostname;
    if (/(^|\.)(weixin\.qq\.com|wechat\.com)$/.test(host)) return "wechat";
    if (/(^|\.)(baidu\.com|bing\.com|duckduckgo\.com|so\.com|sogou\.com|google\.(com(\.[a-z]{2})?|co\.[a-z]{2}|[a-z]{2}))$/.test(host)) {
      return "search";
    }
    return "external";
  }

  let event;
  let engaged = false;
  let totalVisible = 0;
  let visibleSince = null;
  let timer;

  async function send(isEngaged, attempt = 0) {
    if (navigator.onLine === false) return;
    try {
      const response = await fetch(publicSite + "/api/analytics/visit", {
        method: "POST",
        credentials: "omit",
        referrerPolicy: "origin",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        keepalive: true,
        body: JSON.stringify({ ...event, engaged: isEngaged })
      });
      if (response.ok || response.status < 500) return;
    } catch {
      // A transient disconnect can occur after the server has already counted this view.
    }
    if (attempt < 2) setTimeout(() => send(isEngaged, attempt + 1), 1500 * (attempt + 1));
  }

  function markEngaged() {
    if (engaged) return;
    engaged = true;
    clearTimeout(timer);
    void send(true);
  }

  function checkTime() {
    if (document.visibilityState !== "visible" || visibleSince === null || engaged) return;
    const remaining = threshold - totalVisible - (performance.now() - visibleSince);
    if (remaining <= 0) markEngaged();
    else timer = setTimeout(checkTime, remaining);
  }

  function pause() {
    clearTimeout(timer);
    if (visibleSince === null) return;
    totalVisible += Math.max(0, performance.now() - visibleSince);
    visibleSince = null;
    if (totalVisible >= threshold) markEngaged();
  }

  function resume() {
    if (document.visibilityState !== "visible" || visibleSince !== null || engaged) return;
    if (!event) {
      event = { viewId: newId(), readerId: getReaderId(), page, source: sourceCategory() };
      void send(false);
    }
    visibleSince = performance.now();
    checkTime();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") resume();
    else pause();
  });
  window.addEventListener("pagehide", pause);
  window.addEventListener("pageshow", resume);
  resume();
})();
