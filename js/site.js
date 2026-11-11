/* ==========================================================================
   Medny – Skript der Webseite (eine Datei für alle Seiten)

   Die Seiten sind vollständig statisch und ohne JavaScript lesbar. Dieses Skript
   ergänzt nur Komfortfunktionen:
     1. Mobiles Menü
     2. Geräte-Wissen: Suche, Kategorie-Filter, Lernfortschritt (nur lokal im Browser)
     3. Geräte-Detailseite: "Als gelernt markieren"
     4. Glossar: Suche
     5. Kontaktformular: Prüfung der Eingaben, öffnet das E-Mail-Programm

   Texte für Meldungen stehen im JSON-Block #site-strings (wird beim Erzeugen der
   Seiten aus data/i18n/<sprache>.json gefüllt).
   ========================================================================== */
(function () {
  "use strict";

  /**
   * Text für die Suche vereinheitlichen: Kleinschreibung, ohne Akzente/Umlautpunkte,
   * arabische Buchstabenvarianten und Vokalzeichen angeglichen.
   * Wird auch vom Generator (tools/build.js) benutzt, damit Index und Eingabe gleich behandelt werden.
   */
  function normalize(str) {
    return String(str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}+/gu, "") // Akzente, Umlautpunkte, arabische Vokalzeichen; أ إ آ werden zu ا
      .replace(/ـ/g, "") // Tatweel (Dehnungsstrich)
      .replace(/ة/g, "ه") // ة → ه
      .replace(/ى/g, "ي") // ى → ي
      .replace(/ß/g, "ss")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  }

  // Im Generator (Node.js) wird nur normalize() benötigt.
  if (typeof document === "undefined") {
    if (typeof module !== "undefined") module.exports = { normalize: normalize };
    return;
  }

  var doc = document;
  var LEARNED_KEY = "medny.learned";

  /* ---------- Hilfen ---------- */
  var STRINGS = {};
  try {
    var stringsNode = doc.getElementById("site-strings");
    if (stringsNode) STRINGS = JSON.parse(stringsNode.textContent) || {};
  } catch (e) {
    STRINGS = {};
  }

  function str(key, vars) {
    var value = STRINGS[key] || "";
    return value.replace(/\{(\w+)\}/g, function (match, name) {
      return vars && vars[name] !== undefined && vars[name] !== null ? String(vars[name]) : match;
    });
  }

  function $(id) {
    return doc.getElementById(id);
  }

  function each(list, fn) {
    Array.prototype.forEach.call(list, fn);
  }

  function matchesQuery(haystack, query) {
    var tokens = normalize(query).split(" ");
    for (var i = 0; i < tokens.length; i++) {
      if (tokens[i] && haystack.indexOf(tokens[i]) === -1) return false;
    }
    return true;
  }

  function readParams() {
    try {
      return new URLSearchParams(window.location.search);
    } catch (e) {
      return null;
    }
  }

  /** Suchbegriff/Filter in der Adresse halten (teilbar, Zurück-Taste) und an die Sprachlinks weitergeben. */
  function syncUrl(values) {
    try {
      var url = new URL(window.location.href);
      Object.keys(values).forEach(function (key) {
        if (values[key]) url.searchParams.set(key, values[key]);
        else url.searchParams.delete(key);
      });
      window.history.replaceState(null, "", url.toString());
      each(doc.querySelectorAll(".lang-switch a"), function (a) {
        var base = a.getAttribute("href").split("?")[0].split("#")[0];
        a.setAttribute("href", base + url.search);
      });
    } catch (e) {
      /* z. B. in sehr alten Browsern: Filter funktioniert trotzdem */
    }
  }

  /* ---------- Lernfortschritt (localStorage, verlässt den Browser nie) ---------- */
  var learned = {
    get: function () {
      try {
        var list = JSON.parse(window.localStorage.getItem(LEARNED_KEY) || "[]");
        return Array.isArray(list) ? list : [];
      } catch (e) {
        return [];
      }
    },
    set: function (list) {
      try {
        window.localStorage.setItem(LEARNED_KEY, JSON.stringify(list));
      } catch (e) {
        /* privater Modus o. Ä.: Markierung gilt dann nur für die aktuelle Ansicht */
      }
    },
    has: function (id) {
      return learned.get().indexOf(id) !== -1;
    },
    toggle: function (id) {
      var list = learned.get();
      var index = list.indexOf(id);
      if (index === -1) list.push(id);
      else list.splice(index, 1);
      learned.set(list);
      return index === -1;
    }
  };

  /* ==========================================================================
     1. Mobiles Menü
     ========================================================================== */
  function initNav() {
    var toggle = doc.querySelector(".nav-toggle");
    var nav = $("site-nav");
    if (!toggle || !nav) return;

    function setOpen(open) {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", str(open ? "menuClose" : "menuOpen"));
    }

    toggle.addEventListener("click", function () {
      setOpen(!nav.classList.contains("is-open"));
    });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });
    doc.addEventListener("click", function (e) {
      if (nav.classList.contains("is-open") && !nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });
    // Verlässt der Tastaturfokus das geöffnete Menü, schließen (sonst verdeckt es den fokussierten Inhalt)
    nav.addEventListener("focusout", function (e) {
      var next = e.relatedTarget;
      if (nav.classList.contains("is-open") && next && !nav.contains(next) && !toggle.contains(next)) setOpen(false);
    });
    var wide = window.matchMedia("(min-width: 1024px)");
    var onChange = function () {
      if (wide.matches) setOpen(false);
    };
    if (wide.addEventListener) wide.addEventListener("change", onChange);
    else if (wide.addListener) wide.addListener(onChange);
  }

  /* ==========================================================================
     2. Geräte-Wissen: Übersicht
     ========================================================================== */
  function initOverview() {
    var results = $("device-results");
    if (!results) return;

    var input = $("device-search");
    var clearBtn = $("device-search-clear");
    var form = $("device-search-form");
    var chipsWrap = $("category-chips");
    var chips = chipsWrap ? chipsWrap.querySelectorAll(".chip") : [];
    var blocks = results.querySelectorAll(".category-block");
    var cards = results.querySelectorAll(".device-card");
    var summary = $("results-summary");
    var summaryCount = $("results-count");
    var status = $("device-results-status");
    var empty = $("empty-state");

    var known = {};
    each(blocks, function (b) {
      known[b.getAttribute("data-cat")] = true;
    });

    var state = { q: "", cat: "" };
    var params = readParams();
    if (params) {
      state.q = params.get("q") || "";
      state.cat = known[params.get("cat")] ? params.get("cat") : "";
    }
    if (input) input.value = state.q;

    function countLabel(n) {
      return n === 1 ? str("countOne") : str("countMany", { count: n });
    }

    function apply(announce) {
      var total = 0;
      var perCat = {};
      each(cards, function (card) {
        var cat = card.getAttribute("data-cat");
        var visible = (!state.cat || cat === state.cat) && (!state.q || matchesQuery(card.getAttribute("data-search") || "", state.q));
        card.hidden = !visible;
        if (visible) {
          total++;
          perCat[cat] = (perCat[cat] || 0) + 1;
        }
      });
      each(blocks, function (block) {
        var n = perCat[block.getAttribute("data-cat")] || 0;
        block.hidden = n === 0;
        var counter = block.querySelector("[data-count]");
        if (counter) counter.textContent = countLabel(n);
      });
      each(chips, function (chip) {
        chip.setAttribute("aria-pressed", chip.getAttribute("data-cat") === state.cat ? "true" : "false");
      });

      var filtered = !!(state.q || state.cat);
      if (summary) summary.hidden = !filtered || total === 0;
      if (summaryCount) summaryCount.textContent = countLabel(total);
      if (empty) empty.hidden = total !== 0;
      if (clearBtn) clearBtn.classList.toggle("is-visible", !!state.q);
      // Für Screenreader nur die Trefferzahl ansagen, nicht die ganze Liste
      if (status && announce) status.textContent = total ? countLabel(total) : str("noResults");
      syncUrl({ q: state.q, cat: state.cat });
    }

    function reset() {
      state.q = "";
      state.cat = "";
      if (input) input.value = "";
      apply(true);
    }

    each(chips, function (chip) {
      chip.addEventListener("click", function () {
        var cat = chip.getAttribute("data-cat");
        state.cat = state.cat === cat ? "" : cat;
        apply(true);
      });
    });

    var timer = null;
    if (input) {
      input.addEventListener("input", function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          state.q = input.value.trim();
          apply(true);
        }, 120);
      });
    }
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        clearTimeout(timer);
        state.q = input ? input.value.trim() : "";
        apply(true);
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        state.q = "";
        if (input) {
          input.value = "";
          input.focus();
        }
        apply(true);
      });
    }
    each(doc.querySelectorAll("[data-filter-reset]"), function (btn) {
      btn.addEventListener("click", function () {
        reset();
        if (input) input.focus();
      });
    });

    /* Lernfortschritt */
    var progressCard = $("progress-card");
    var progressText = $("progress-text");
    var progressFill = $("progress-fill");
    var progressBar = $("progress-bar");
    var progressReset = $("progress-reset");
    var progressContinue = $("progress-continue");

    function renderProgress() {
      var list = learned.get();
      var done = 0;
      var nextCard = null;
      each(cards, function (card) {
        var isLearned = list.indexOf(card.getAttribute("data-id")) !== -1;
        if (isLearned) done++;
        else if (!nextCard) nextCard = card;
        card.classList.toggle("device-card--learned", isLearned);
        var badge = card.querySelector(".device-card__learned");
        if (badge) badge.hidden = !isLearned;
      });
      var total = cards.length;
      if (progressText) progressText.textContent = str("progressText", { done: done, total: total });
      if (progressFill) progressFill.style.width = (total ? Math.round((done / total) * 100) : 0) + "%";
      if (progressBar) {
        progressBar.setAttribute("aria-valuenow", String(done));
        progressBar.setAttribute("aria-valuetext", str("progressText", { done: done, total: total }));
      }
      if (progressReset) progressReset.hidden = done === 0;
      if (progressContinue) {
        var link = nextCard ? nextCard.querySelector("h3 a") : null;
        if (link) {
          progressContinue.setAttribute("href", link.getAttribute("href"));
          progressContinue.firstChild.textContent = str("progressContinue", { name: link.textContent }) + " ";
          progressContinue.hidden = false;
        } else {
          progressContinue.hidden = true;
          if (progressText) progressText.textContent = str("progressDone");
        }
      }
    }

    if (progressCard) {
      if (progressReset) {
        progressReset.addEventListener("click", function () {
          learned.set([]);
          renderProgress();
        });
      }
      renderProgress();
      // Zurück aus einer Detailseite (bfcache) oder Änderung in einem anderen Tab
      window.addEventListener("pageshow", function (e) {
        if (e.persisted) renderProgress();
      });
      window.addEventListener("storage", function (e) {
        if (e.key === LEARNED_KEY) renderProgress();
      });
    }

    if (state.q || state.cat) apply(false);
  }

  /* ==========================================================================
     3. Geräte-Detailseite
     ========================================================================== */
  function initDetail() {
    var button = $("learn-toggle");
    if (!button) return;
    var id = button.getAttribute("data-device-id");

    function render() {
      var list = learned.get();
      var on = list.indexOf(id) !== -1;
      button.setAttribute("aria-pressed", on ? "true" : "false");
      button.classList.toggle("btn--secondary", !on);
      button.classList.toggle("btn--accent", on);
      each(doc.querySelectorAll(".device-aside a[data-device-id]"), function (a) {
        var badge = a.querySelector(".badge");
        if (badge) badge.hidden = list.indexOf(a.getAttribute("data-device-id")) === -1;
      });
    }

    button.addEventListener("click", function () {
      learned.toggle(id);
      render();
    });
    window.addEventListener("storage", function (e) {
      if (e.key === LEARNED_KEY) render();
    });
    render();
  }

  /* ==========================================================================
     4. Glossar
     ========================================================================== */
  function initGlossary() {
    var listNode = $("glossary-list");
    var input = $("glossary-search");
    if (!listNode || !input) return;
    var entries = listNode.querySelectorAll(".glossary-entry");
    var clearBtn = $("glossary-search-clear");
    var form = $("glossary-search-form");
    var empty = $("glossary-empty");
    var status = $("glossary-status");

    function apply(announce) {
      var q = input.value.trim();
      var total = 0;
      each(entries, function (entry) {
        var visible = !q || matchesQuery(entry.getAttribute("data-search") || "", q);
        entry.hidden = !visible;
        if (visible) total++;
      });
      listNode.hidden = total === 0;
      if (empty) empty.hidden = total !== 0;
      if (clearBtn) clearBtn.classList.toggle("is-visible", !!q);
      if (status && announce) status.textContent = total === 0 ? str("glossaryNone") : total === 1 ? str("glossaryCountOne") : str("glossaryCount", { count: total });
      syncUrl({ q: q });
    }

    var timer = null;
    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        apply(true);
      }, 120);
    });
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        apply(true);
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        input.value = "";
        input.focus();
        apply(true);
      });
    }
    var params = readParams();
    if (params && params.get("q")) {
      input.value = params.get("q");
      apply(false);
    }
  }

  /* ==========================================================================
     5. Kontaktformular (nur Frontend: öffnet das E-Mail-Programm, keine Datenübertragung an einen Server)
        Anbindung an einen Formulardienst: siehe README.
     ========================================================================== */
  function initContact() {
    var form = $("contact-form");
    if (!form) return;
    var success = $("form-success");
    var again = $("form-again");
    var summary = $("form-summary");
    form.setAttribute("novalidate", "novalidate"); // eigene Prüfung; ohne JavaScript greift die des Browsers

    function fieldOf(input) {
      return input.closest ? input.closest(".field") : null;
    }

    function isEmail(value) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
    }

    function setError(input, messageKey) {
      var field = fieldOf(input);
      if (!field) return;
      var message = field.querySelector(".field__error");
      field.classList.toggle("is-invalid", !!messageKey);
      if (messageKey) {
        input.setAttribute("aria-invalid", "true");
        if (message) {
          message.textContent = str(messageKey);
          input.setAttribute("aria-describedby", message.id);
        }
      } else {
        input.removeAttribute("aria-invalid");
        input.removeAttribute("aria-describedby");
      }
    }

    function errorFor(input) {
      if (input.type === "checkbox") return input.required && !input.checked ? "errConsent" : null;
      var value = input.value.trim();
      if (input.required && !value) return "errRequired";
      if (input.type === "email" && value && !isEmail(value)) return "errEmail";
      return null;
    }

    function validate() {
      var firstInvalid = null;
      each(form.querySelectorAll("input, select, textarea"), function (input) {
        var error = errorFor(input);
        setError(input, error);
        if (error && !firstInvalid) firstInvalid = input;
      });
      if (summary) summary.hidden = !firstInvalid;
      if (firstInvalid) firstInvalid.focus();
      return !firstInvalid;
    }

    function buildMailto() {
      var f = form.elements;
      var topic = f.topic.options[f.topic.selectedIndex];
      var topicLabel = topic ? topic.textContent : "";
      var lines = [
        str("labelName") + ": " + f.name.value.trim(),
        str("labelOrganization") + ": " + f.organization.value.trim(),
        str("labelEmail") + ": " + f.email.value.trim(),
        str("labelPhone") + ": " + f.phone.value.trim(),
        str("labelTopic") + ": " + topicLabel,
        "",
        f.message.value.trim()
      ];
      var subject = str("mailSubject") + (topicLabel ? " – " + topicLabel : "");
      return "mailto:" + form.getAttribute("data-email") + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(lines.join("\n"));
    }

    // Fehlermarkierung entfernen, sobald das Feld gültig ist
    form.addEventListener("input", function (e) {
      var input = e.target;
      var field = input && fieldOf(input);
      if (field && field.classList.contains("is-invalid") && !errorFor(input)) setError(input, null);
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate()) return;
      var href = buildMailto();
      form.hidden = true;
      if (success) {
        success.hidden = false;
        success.focus();
      }
      window.location.href = href;
    });

    if (again) {
      again.addEventListener("click", function () {
        form.reset();
        form.hidden = false;
        if (success) success.hidden = true;
        if (summary) summary.hidden = true;
        var first = form.querySelector("input");
        if (first) first.focus();
      });
    }
  }

  /* ---------- Start ---------- */
  function init() {
    initNav();
    initOverview();
    initDetail();
    initGlossary();
    initContact();
    // Jahreszahl im Fuß aktuell halten, auch wenn die Seiten länger nicht neu erzeugt wurden
    each(doc.querySelectorAll("[data-year]"), function (node) {
      node.textContent = String(new Date().getFullYear());
    });
  }

  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init);
  else init();
})();
