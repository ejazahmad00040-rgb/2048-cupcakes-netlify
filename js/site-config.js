/**
 * Site config — Netlify deploy — SITE_URL empty = auto from current domain after go-live.
 *
 * Paste your IDs below (leave empty to disable):
 * - GA_MEASUREMENT_ID: Google Analytics 4 → Admin → Data streams → Measurement ID (G-XXXXXXXX)
 * - GOOGLE_SITE_VERIFICATION: Search Console → HTML tag method → content="...." value only
 */
window.SiteConfig = {
  SITE_URL: "https://2048cupcakess.netlify.app" /* primary Netlify host */,

  SITE_NAME: "2048 Cupcakes",
  CONTACT_EMAIL: "",
  GITHUB_ISSUES: "https://github.com/cadejay/2048cupcakes/issues",

  /** e.g. "G-XXXXXXXXXX" */
  GA_MEASUREMENT_ID: "G-RS8KM84Z2W",

  /** Search Console meta verification content only (not the full tag) */
  GOOGLE_SITE_VERIFICATION: "qAim0I8sXkeaXlj5JqkbFQKEiRjQhgf1XsA63uEkpdU"
};

window.SiteConfig.getBaseUrl = function () {
  if (this.SITE_URL) {
    return this.SITE_URL.replace(/\/$/, "");
  }
  if (typeof location !== "undefined" && location.origin && /^https?:/.test(location.protocol)) {
    var path = location.pathname || "/";
    if (path.indexOf(".html") !== -1) {
      path = path.replace(/\/[^/]*\.html$/, "/");
    }
    if (path.slice(-1) !== "/") path += "/";
    return (location.origin + path).replace(/\/$/, "") || location.origin;
  }
  return "";
};

window.SiteConfig.absolute = function (path) {
  var base = this.getBaseUrl();
  path = String(path || "").replace(/^\//, "");
  if (!base) return path || "./";
  return base + (path ? "/" + path : "");
};

/** Apply absolute canonical + social meta as early as possible */
window.SiteConfig.applySeoMeta = function (opts) {
  opts = opts || {};
  var base = this.getBaseUrl();
  if (!base) return;
  var page = (opts.pagePath || "").replace(/^\//, "");
  var url = page ? base + "/" + page : base + "/";
  var image = opts.image || "style/img/2048.jpg";
  if (image.indexOf("http") !== 0) {
    image = base + "/" + image.replace(/^\.\//, "");
  }

  var canon = document.getElementById("canonical-link") || document.querySelector('link[rel="canonical"]');
  if (canon) canon.setAttribute("href", url);

  function setContent(sel, val) {
    var el = document.querySelector(sel);
    if (el) el.setAttribute("content", val);
  }
  setContent("#og-url", url);
  setContent("meta[property='og:url']", url);
  setContent("#og-image", image);
  setContent("meta[property='og:image']", image);
  setContent("#twitter-image", image);
  setContent("meta[name='twitter:image']", image);

  // Upgrade relative URLs inside JSON-LD blocks
  var scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (var i = 0; i < scripts.length; i++) {
    try {
      var data = JSON.parse(scripts[i].textContent);
      var changed = false;
      function abs(v) {
        if (typeof v !== "string") return v;
        if (/^https?:\/\//i.test(v)) return v;
        if (v === "./" || v === ".") return base + "/";
        if (v.indexOf("./") === 0) return base + "/" + v.slice(2);
        if (v.indexOf("style/") === 0 || v.indexOf("css/") === 0) return base + "/" + v;
        return v;
      }
      if (data.url) { data.url = abs(data.url); changed = true; }
      if (data.image) { data.image = abs(data.image); changed = true; }
      if (data.itemListElement && data.itemListElement[0] && data.itemListElement[0].item) {
        data.itemListElement[0].item = abs(data.itemListElement[0].item);
        changed = true;
      }
      if (changed) scripts[i].textContent = JSON.stringify(data);
    } catch (e) { /* ignore */ }
  }
};

/** Google Search Console HTML-tag verification */
window.SiteConfig.applySiteVerification = function () {
  var code = String(this.GOOGLE_SITE_VERIFICATION || "").trim();
  if (!code) return;
  var existing = document.querySelector('meta[name="google-site-verification"]');
  if (existing) {
    existing.setAttribute("content", code);
    return;
  }
  var meta = document.createElement("meta");
  meta.setAttribute("name", "google-site-verification");
  meta.setAttribute("content", code);
  document.head.appendChild(meta);
};

/** Google Analytics 4 (gtag) — delayed so Lighthouse/TBT is not blocked */
window.SiteConfig.applyAnalytics = function () {
  var id = String(this.GA_MEASUREMENT_ID || "").trim();
  if (!id || !/^G-[A-Z0-9]+$/i.test(id)) return;
  if (document.getElementById("ga4-gtag") || typeof window.gtag === "function") return;

  function loadGa() {
    if (document.getElementById("ga4-gtag")) return;
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag("js", new Date());
    gtag("config", id, { anonymize_ip: true });

    var s = document.createElement("script");
    s.async = true;
    s.id = "ga4-gtag";
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
    document.head.appendChild(s);
  }

  var loaded = false;
  function loadOnce() {
    if (loaded) return;
    loaded = true;
    loadGa();
    ["scroll", "pointerdown", "keydown", "touchstart"].forEach(function (ev) {
      window.removeEventListener(ev, loadOnce, true);
    });
  }
  ["scroll", "pointerdown", "keydown", "touchstart"].forEach(function (ev) {
    window.addEventListener(ev, loadOnce, { once: true, passive: true, capture: true });
  });
  // Fallback if user never interacts (still after idle)
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(function () { setTimeout(loadOnce, 5000); }, { timeout: 8000 });
  } else {
    window.addEventListener("load", function () { setTimeout(loadOnce, 6000); });
  }
};

window.SiteConfig.bootTracking = function () {
  this.applySiteVerification();
  this.applyAnalytics();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    window.SiteConfig.bootTracking();
  });
} else {
  window.SiteConfig.bootTracking();
}
