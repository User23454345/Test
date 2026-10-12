/* ==========================================================================
   Medny – Allgemeine Seitenlogik
   - Initialisiert i18n und den Sprachumschalter
   - Mobile Navigation
   - Setzt Stammdaten aus data/site.json ein (data-site-Attribute)
   - Hält Links sprachbewusst (?lang=) und markiert die aktive Seite
   ========================================================================== */
(function (window, document) {
  "use strict";

  var I18N = window.MednyI18n;
  var sitePromise = null;

  function loadSite() {
    if (!sitePromise) {
      sitePromise = I18N.fetchJSON("data/site.json").catch(function (err) {
        if (window.console) console.error("[site] data/site.json konnte nicht geladen werden:", err);
        return {};
      });
    }
    return sitePromise;
  }

  function get(obj, path) {
    var parts = path.split(".");
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur === null || cur === undefined) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }

  /** Stammdaten (Name, E-Mail, Telefon, Adresse) in die Seite einsetzen. */
  function applySiteData(site) {
    var textNodes = document.querySelectorAll("[data-site]");
    for (var i = 0; i < textNodes.length; i++) {
      var val = get(site, textNodes[i].getAttribute("data-site"));
      if (val !== undefined && val !== null) textNodes[i].textContent = val;
    }
    var hrefNodes = document.querySelectorAll("[data-site-href]");
    for (var j = 0; j < hrefNodes.length; j++) {
      var spec = hrefNodes[j].getAttribute("data-site-href"); // z. B. "mailto:owner.email"
      var idx = spec.indexOf(":");
      var scheme = spec.slice(0, idx);
      var path = spec.slice(idx + 1);
      var v = get(site, path);
      if (!v) continue;
      if (scheme === "tel") v = String(v).replace(/[^+\d]/g, "");
      hrefNodes[j].setAttribute("href", scheme + ":" + v);
    }
    var srcNodes = document.querySelectorAll("[data-site-src]");
    for (var k = 0; k < srcNodes.length; k++) {
      var sv = get(site, srcNodes[k].getAttribute("data-site-src"));
      if (sv) srcNodes[k].setAttribute("src", sv);
    }
  }

  /** Interne Links mit ?lang= versehen, damit die Sprache beim Navigieren erhalten bleibt. */
  function localizeLinks() {
    var links = document.querySelectorAll('a[href]:not([data-no-lang])');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      var href = a.getAttribute("href");
      if (!href || /^(https?:|mailto:|tel:|#|javascript:)/i.test(href)) continue;
      if (!/\.html(\?|#|$)/.test(href)) continue;
      var clean = href.replace(/([?&])lang=[a-z]{2}(&|$)/, function (m, p1, p2) {
        return p2 ? p1 : "";
      }).replace(/\?$/, "");
      var hashIdx = clean.indexOf("#");
      var hash = "";
      if (hashIdx !== -1) {
        hash = clean.slice(hashIdx);
        clean = clean.slice(0, hashIdx);
      }
      a.setAttribute("href", I18N.withLang(clean) + hash);
    }
  }

  function markActiveNav() {
    var file = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
    if (file === "") file = "index.html";
    var links = document.querySelectorAll(".site-nav__list a");
    for (var i = 0; i < links.length; i++) {
      var target = (links[i].getAttribute("href") || "").split("?")[0].split("#")[0].toLowerCase();
      var isActive = target === file || (file === "geraet.html" && target === "geraete.html");
      if (isActive) links[i].setAttribute("aria-current", "page");
      else links[i].removeAttribute("aria-current");
    }
  }

  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("site-nav");
    if (!toggle || !nav) return;

    function close() {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", I18N.t("nav.menuOpen"));
    }
    function open() {
      nav.classList.add("is-open");
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", I18N.t("nav.menuClose"));
    }

    toggle.addEventListener("click", function () {
      if (nav.classList.contains("is-open")) close();
      else open();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        close();
        toggle.focus();
      }
    });
    document.addEventListener("click", function (e) {
      if (!nav.classList.contains("is-open")) return;
      if (nav.contains(e.target) || toggle.contains(e.target)) return;
      close();
    });
    // Tastatur: verlässt der Fokus das geöffnete Menü, schließen (sonst liegt es über dem fokussierten Inhalt)
    nav.addEventListener("focusout", function (e) {
      if (!nav.classList.contains("is-open")) return;
      var next = e.relatedTarget;
      if (!next || nav.contains(next) || toggle.contains(next)) return;
      close();
    });
    var mq = window.matchMedia("(min-width: 1024px)");
    var onChange = function () {
      if (mq.matches) close();
    };
    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else if (mq.addListener) mq.addListener(onChange);
  }

  function initLangSwitch() {
    var buttons = document.querySelectorAll("[data-lang]");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener("click", function (e) {
        var lang = e.currentTarget.getAttribute("data-lang");
        I18N.setLanguage(lang).then(function () {
          localizeLinks();
        }).catch(function (err) {
          if (window.console) console.error("[i18n] Sprachwechsel fehlgeschlagen:", err);
        });
      });
    }
  }

  function initYear() {
    var nodes = document.querySelectorAll("[data-year]");
    for (var i = 0; i < nodes.length; i++) nodes[i].textContent = String(new Date().getFullYear());
  }

  function updateToggleLabel() {
    var toggle = document.querySelector(".nav-toggle");
    if (!toggle) return;
    toggle.setAttribute("aria-label", I18N.t(toggle.getAttribute("aria-expanded") === "true" ? "nav.menuClose" : "nav.menuOpen"));
  }

  document.addEventListener("DOMContentLoaded", function () {
    markActiveNav();
    initNav();
    initLangSwitch();
    initYear();
    loadSite().then(applySiteData);
    I18N.init().then(function () {
      localizeLinks();
      updateToggleLabel();
    });
    document.addEventListener("i18n:change", updateToggleLabel);
  });

  window.MednySite = { load: loadSite, applySiteData: applySiteData, localizeLinks: localizeLinks };
})(window, document);
