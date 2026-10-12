/* ==========================================================================
   Medny – Internationalisierung (i18n)
   Lädt data/i18n/<lang>.json und ersetzt alle Elemente mit data-i18n-Attributen.

   Verwendung im HTML:
     <h1 data-i18n="home.hero.title">Deutscher Standardtext</h1>
     <input data-i18n-attr="placeholder:devices.searchPlaceholder;aria-label:devices.searchLabel">
     <p data-i18n-html="…">  (nur für vertrauenswürdige Übersetzungen mit HTML)

   Sprachwahl: ?lang=xx in der URL > localStorage > Browsersprache > Deutsch
   ========================================================================== */
(function (window, document) {
  "use strict";

  var SUPPORTED = ["de", "en", "ar"];
  var DEFAULT_LANG = "de";
  var RTL_LANGS = ["ar"];
  var STORAGE_KEY = "medny.lang";

  var cache = {};
  var current = DEFAULT_LANG;
  var dict = null;
  var fallback = null;
  var ready = null;
  var requestId = 0;

  function detectLanguage() {
    try {
      var param = new URLSearchParams(window.location.search).get("lang");
      if (param && SUPPORTED.indexOf(param) !== -1) return param;
    } catch (e) {
      /* ignore */
    }
    try {
      var stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored && SUPPORTED.indexOf(stored) !== -1) return stored;
    } catch (e) {
      /* localStorage nicht verfügbar */
    }
    var nav = (navigator.language || "").slice(0, 2).toLowerCase();
    if (SUPPORTED.indexOf(nav) !== -1) return nav;
    return DEFAULT_LANG;
  }

  function fetchJSON(path) {
    return fetch(path, { cache: "no-cache" }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status + " for " + path);
      return res.json();
    });
  }

  function load(lang) {
    if (cache[lang]) return Promise.resolve(cache[lang]);
    return fetchJSON("data/i18n/" + lang + ".json").then(function (json) {
      cache[lang] = json;
      return json;
    });
  }

  function resolve(obj, path) {
    if (!obj) return undefined;
    var parts = path.split(".");
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur === null || cur === undefined) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  function interpolate(str, vars) {
    if (typeof str !== "string") return str;
    var all = Object.assign({ year: new Date().getFullYear() }, vars || {});
    return str.replace(/\{(\w+)\}/g, function (m, key) {
      return all[key] !== undefined && all[key] !== null ? String(all[key]) : m;
    });
  }

  /** Übersetzung für einen Schlüssel holen (mit Fallback auf Deutsch). */
  function t(key, vars) {
    var val = resolve(dict, key);
    if (val === undefined) val = resolve(fallback, key);
    if (val === undefined) {
      if (window.console && console.warn) console.warn("[i18n] Fehlender Schlüssel: " + key);
      return key;
    }
    return typeof val === "string" ? interpolate(val, vars) : val;
  }

  function isRTL(lang) {
    return RTL_LANGS.indexOf(lang || current) !== -1;
  }

  function applyTo(root) {
    root = root || document;
    var nodes = root.querySelectorAll("[data-i18n]");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var key = el.getAttribute("data-i18n");
      var val = t(key);
      if (typeof val === "string") el.textContent = val;
    }
    var htmlNodes = root.querySelectorAll("[data-i18n-html]");
    for (var j = 0; j < htmlNodes.length; j++) {
      var hel = htmlNodes[j];
      var hval = t(hel.getAttribute("data-i18n-html"));
      if (typeof hval === "string") hel.innerHTML = hval;
    }
    var attrNodes = root.querySelectorAll("[data-i18n-attr]");
    for (var k = 0; k < attrNodes.length; k++) {
      var ael = attrNodes[k];
      var pairs = ael.getAttribute("data-i18n-attr").split(";");
      for (var p = 0; p < pairs.length; p++) {
        var pair = pairs[p].trim();
        if (!pair) continue;
        var idx = pair.indexOf(":");
        if (idx === -1) continue;
        var attr = pair.slice(0, idx).trim();
        var akey = pair.slice(idx + 1).trim();
        var aval = t(akey);
        if (typeof aval === "string") ael.setAttribute(attr, aval);
      }
    }
  }

  function applyDocument() {
    var html = document.documentElement;
    html.setAttribute("lang", current);
    html.setAttribute("dir", isRTL() ? "rtl" : "ltr");

    var page = document.body ? document.body.getAttribute("data-page") : null;
    if (page) {
      var title = resolve(dict, "meta.pages." + page + ".title") || resolve(fallback, "meta.pages." + page + ".title");
      var desc = resolve(dict, "meta.pages." + page + ".description") || resolve(fallback, "meta.pages." + page + ".description");
      if (title && page !== "device") document.title = title;
      var metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc && desc && page !== "device") metaDesc.setAttribute("content", desc);
    }

    var buttons = document.querySelectorAll("[data-lang]");
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      b.setAttribute("aria-pressed", b.getAttribute("data-lang") === current ? "true" : "false");
    }

    applyTo(document);
  }

  function updateUrl(lang) {
    try {
      var url = new URL(window.location.href);
      if (lang === DEFAULT_LANG) url.searchParams.delete("lang");
      else url.searchParams.set("lang", lang);
      window.history.replaceState(null, "", url.toString());
    } catch (e) {
      /* ignore */
    }
  }

  /** Sprache wechseln, Übersetzungen anwenden und Event auslösen. */
  function setLanguage(lang, options) {
    options = options || {};
    if (SUPPORTED.indexOf(lang) === -1) lang = DEFAULT_LANG;
    var reqId = ++requestId;
    return Promise.all([load(lang), load(DEFAULT_LANG)]).then(function (res) {
      // Ein neuerer Aufruf hat diesen überholt: Ergebnis verwerfen, sonst gewinnt die langsamere Antwort.
      if (reqId !== requestId) return current;
      dict = res[0];
      fallback = res[1];
      current = lang;
      try {
        window.localStorage.setItem(STORAGE_KEY, lang);
      } catch (e) {
        /* ignore */
      }
      if (options.updateUrl !== false) updateUrl(lang);
      applyDocument();
      document.dispatchEvent(new CustomEvent("i18n:change", { detail: { lang: lang } }));
      return lang;
    });
  }

  /** Lokalisierten Wert aus einem { de, en, ar }-Objekt holen. */
  function pick(obj) {
    if (!obj) return undefined;
    return obj[current] !== undefined ? obj[current] : obj[DEFAULT_LANG];
  }

  /** Hilfsfunktion: lokalisierte URL (hängt ?lang= an, außer bei Deutsch). */
  function withLang(href) {
    if (current === DEFAULT_LANG) return href;
    var sep = href.indexOf("?") === -1 ? "?" : "&";
    return href + sep + "lang=" + current;
  }

  function init() {
    var lang = detectLanguage();
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", isRTL(lang) ? "rtl" : "ltr");
    ready = setLanguage(lang, { updateUrl: false }).catch(function (err) {
      if (window.console) console.error("[i18n] Übersetzungen konnten nicht geladen werden:", err);
      current = DEFAULT_LANG;
      return DEFAULT_LANG;
    });
    return ready;
  }

  window.MednyI18n = {
    init: init,
    t: t,
    pick: pick,
    setLanguage: setLanguage,
    withLang: withLang,
    isRTL: isRTL,
    applyTo: applyTo,
    fetchJSON: fetchJSON,
    get lang() {
      return current;
    },
    get ready() {
      return ready || Promise.resolve(current);
    },
    SUPPORTED: SUPPORTED,
    DEFAULT_LANG: DEFAULT_LANG
  };
})(window, document);
