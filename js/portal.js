/* ==========================================================================
   Medny – Geräte-Wissen (Lernportal)
   - Lädt data/devices.json (Kategorien + Geräte, alle Sprachen inline)
   - Übersichtsseite (geraete.html): Suche, Kategorie-Filter, Lernfortschritt
   - Detailseite (geraet.html?id=...): Inhalte, Seitenleiste, Vor/Zurück
   - Startseite (index.html): Kennzahlen und Kategorie-Links
   ========================================================================== */
(function (window, document) {
  "use strict";

  var I18N = window.MednyI18n;
  var ICONS = window.MednyIcons;
  var DATA_URL = "data/devices.json";
  var LEARNED_KEY = "medny.learned";

  /* ---------- Daten ---------- */
  var dataPromise = null;

  function loadData() {
    if (!dataPromise) {
      dataPromise = I18N.fetchJSON(DATA_URL).then(function (json) {
        var categories = (json.categories || []).slice().sort(function (a, b) {
          return (a.order || 0) - (b.order || 0);
        });
        var devices = (json.devices || []).slice();
        var catOrder = {};
        categories.forEach(function (c, i) {
          catOrder[c.id] = i;
        });
        devices.sort(function (a, b) {
          var ca = catOrder[a.category] !== undefined ? catOrder[a.category] : 99;
          var cb = catOrder[b.category] !== undefined ? catOrder[b.category] : 99;
          if (ca !== cb) return ca - cb;
          return (a.order || 0) - (b.order || 0);
        });
        return { categories: categories, devices: devices };
      });
    }
    return dataPromise;
  }

  function loc(item) {
    return I18N.pick(item.i18n) || {};
  }

  function findCategory(data, id) {
    for (var i = 0; i < data.categories.length; i++) if (data.categories[i].id === id) return data.categories[i];
    return null;
  }

  /* ---------- Lernfortschritt (nur lokal im Browser) ---------- */
  var learned = {
    get: function () {
      try {
        var raw = window.localStorage.getItem(LEARNED_KEY);
        var arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      } catch (e) {
        return [];
      }
    },
    set: function (arr) {
      try {
        window.localStorage.setItem(LEARNED_KEY, JSON.stringify(arr));
      } catch (e) {
        /* ignore */
      }
    },
    has: function (id) {
      return learned.get().indexOf(id) !== -1;
    },
    toggle: function (id) {
      var arr = learned.get();
      var idx = arr.indexOf(id);
      if (idx === -1) arr.push(id);
      else arr.splice(idx, 1);
      learned.set(arr);
      return idx === -1;
    },
    reset: function () {
      learned.set([]);
    }
  };

  /* ---------- DOM-Helfer ---------- */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === "class") node.className = v;
        else if (k === "text") node.textContent = v;
        else if (k === "html") node.innerHTML = v;
        else if (k.indexOf("on") === 0 && typeof v === "function") node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? "" : v);
      });
    }
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function deviceHref(id) {
    return I18N.withLang("geraet.html?id=" + encodeURIComponent(id));
  }

  function categoryHref(id) {
    return I18N.withLang("geraete.html?cat=" + encodeURIComponent(id));
  }

  function categoryIcon(cat, cls) {
    var span = el("span", { class: cls || "card__icon", "aria-hidden": "true" });
    ICONS.inline(span, cat.icon);
    return span;
  }

  /* ---------- Suche ---------- */
  function normalize(str) {
    return String(str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[ً-ْـ]/g, "")
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/ß/g, "ss")
      .replace(/\s+/g, " ")
      .trim();
  }

  function searchIndex(device, data) {
    if (device._index) return device._index;
    var parts = [];
    var cat = findCategory(data, device.category);
    Object.keys(device.i18n || {}).forEach(function (lang) {
      var t = device.i18n[lang];
      parts.push(t.name, t.subtitle, t.short);
      (t.keywords || []).forEach(function (k) {
        parts.push(k);
      });
      (t.use || []).forEach(function (u) {
        parts.push(u);
      });
      if (cat && cat.i18n && cat.i18n[lang]) parts.push(cat.i18n[lang].name);
    });
    parts.push(device.id);
    device._index = normalize(parts.join(" | "));
    return device._index;
  }

  function matches(device, data, query) {
    if (!query) return true;
    var idx = searchIndex(device, data);
    var tokens = normalize(query).split(" ");
    for (var i = 0; i < tokens.length; i++) {
      if (tokens[i] && idx.indexOf(tokens[i]) === -1) return false;
    }
    return true;
  }

  /* ---------- Gerätekarte ---------- */
  function deviceCard(device, data) {
    var t = loc(device);
    var cat = findCategory(data, device.category);
    var isLearned = learned.has(device.id);
    var card = el("article", { class: "device-card" + (isLearned ? " device-card--learned" : "") }, [
      isLearned
        ? el("span", { class: "badge badge--success device-card__learned" }, [ICONS.icon("check"), " " + I18N.t("devices.detail.markedLearned")])
        : null,
      el("div", { class: "device-card__media" }, [
        el("img", { src: device.image, alt: t.name || device.id, loading: "lazy", width: "320", height: "240" })
      ]),
      el("div", { class: "device-card__body" }, [
        el("div", { class: "device-card__meta" }, [
          cat ? el("span", { class: "badge" }, [loc(cat).name || cat.id]) : null
        ]),
        el("h3", null, [el("a", { href: deviceHref(device.id) }, [t.name || device.id])]),
        t.subtitle ? el("p", { class: "muted", style: "font-weight:600" }, [t.subtitle]) : null,
        el("p", null, [t.short || ""]),
        el("span", { class: "device-card__link", "aria-hidden": "true" }, [
          I18N.t("devices.openDevice"),
          ICONS.icon("arrow-right", "icon--flip")
        ])
      ])
    ]);
    return card;
  }

  function deviceGrid(list, data) {
    var grid = el("div", { class: "device-grid" });
    list.forEach(function (d) {
      grid.appendChild(deviceCard(d, data));
    });
    return grid;
  }

  /* ======================================================================
     Übersichtsseite
     ====================================================================== */
  function initOverview() {
    var searchInput = document.getElementById("device-search");
    var clearBtn = document.getElementById("device-search-clear");
    var chipsWrap = document.getElementById("category-chips");
    var results = document.getElementById("device-results");
    var progressCard = document.getElementById("progress-card");
    var progressText = document.getElementById("progress-text");
    var progressFill = document.getElementById("progress-fill");
    var progressBar = document.getElementById("progress-bar");
    var progressReset = document.getElementById("progress-reset");
    var statusNode = document.getElementById("device-results-status");

    var state = { q: "", cat: "" };
    try {
      var params = new URLSearchParams(window.location.search);
      state.q = params.get("q") || "";
      state.cat = params.get("cat") || "";
    } catch (e) {
      /* ignore */
    }
    if (searchInput) searchInput.value = state.q;

    function syncUrl() {
      try {
        var url = new URL(window.location.href);
        if (state.q) url.searchParams.set("q", state.q);
        else url.searchParams.delete("q");
        if (state.cat) url.searchParams.set("cat", state.cat);
        else url.searchParams.delete("cat");
        window.history.replaceState(null, "", url.toString());
      } catch (e) {
        /* ignore */
      }
    }

    function renderChips(data) {
      clear(chipsWrap);
      var allChip = el(
        "button",
        {
          type: "button",
          class: "chip",
          "data-cat": "",
          "aria-pressed": state.cat ? "false" : "true",
          onclick: function () {
            state.cat = "";
            update(data);
          }
        },
        [ICONS.icon("grid"), el("span", null, [I18N.t("devices.allCategories")])]
      );
      chipsWrap.appendChild(allChip);
      data.categories.forEach(function (cat) {
        var count = data.devices.filter(function (d) {
          return d.category === cat.id;
        }).length;
        var iconSpan = el("span", { "aria-hidden": "true", style: "display:inline-flex" });
        ICONS.inline(iconSpan, cat.icon);
        var chip = el(
          "button",
          {
            type: "button",
            class: "chip",
            "data-cat": cat.id,
            "aria-pressed": state.cat === cat.id ? "true" : "false",
            onclick: function () {
              state.cat = state.cat === cat.id ? "" : cat.id;
              update(data);
            }
          },
          [iconSpan, el("span", null, [loc(cat).name || cat.id]), el("span", { class: "chip__count" }, [String(count)])]
        );
        chipsWrap.appendChild(chip);
      });
    }

    function updateChips() {
      var chips = chipsWrap.querySelectorAll(".chip");
      for (var i = 0; i < chips.length; i++) {
        chips[i].setAttribute("aria-pressed", chips[i].getAttribute("data-cat") === state.cat ? "true" : "false");
      }
    }

    function renderProgress(data) {
      if (!progressCard) return;
      var total = data.devices.length;
      var done = learned.get().filter(function (id) {
        return data.devices.some(function (d) {
          return d.id === id;
        });
      }).length;
      progressCard.hidden = false;
      progressText.textContent = I18N.t("devices.progress.text", { done: done, total: total });
      var pct = total ? Math.round((done / total) * 100) : 0;
      progressFill.style.width = pct + "%";
      progressBar.setAttribute("aria-valuenow", String(pct));
      progressBar.setAttribute("aria-label", I18N.t("devices.progress.title"));
    }

    function countLabel(n) {
      return n === 1 ? I18N.t("devices.resultsOne") : I18N.t("devices.resultsCount", { count: n });
    }

    function renderResults(data) {
      clear(results);
      var filtered = data.devices.filter(function (d) {
        return (!state.cat || d.category === state.cat) && matches(d, data, state.q);
      });
      // Nur die Trefferzahl wird für Screenreader angesagt (nicht die komplette Liste)
      if (statusNode) statusNode.textContent = filtered.length ? countLabel(filtered.length) : I18N.t("devices.noResults");

      if (!filtered.length) {
        results.appendChild(
          el("div", { class: "empty-state" }, [
            el("h2", null, [I18N.t("devices.noResults")]),
            el("p", null, [I18N.t("devices.noResultsHint")]),
            el(
              "button",
              {
                type: "button",
                class: "btn btn--secondary",
                onclick: function () {
                  state.q = "";
                  state.cat = "";
                  if (searchInput) searchInput.value = "";
                  update(data);
                }
              },
              [ICONS.icon("refresh"), I18N.t("devices.resetFilters")]
            )
          ])
        );
        return;
      }

      // Ohne Suchbegriff und ohne Filter: nach Kategorien gruppiert (Lernpfad-Ansicht)
      if (!state.q && !state.cat) {
        data.categories.forEach(function (cat) {
          var list = filtered.filter(function (d) {
            return d.category === cat.id;
          });
          if (!list.length) return;
          var ct = loc(cat);
          var block = el("section", { class: "category-block", id: "cat-" + cat.id, "aria-labelledby": "cat-title-" + cat.id }, [
            el("div", { class: "category-block__head" }, [
              categoryIcon(cat, "card__icon card__icon--primary"),
              el("div", null, [
                el("h2", { id: "cat-title-" + cat.id }, [ct.name || cat.id, " ", el("span", { class: "results-count", style: "font-size:0.95rem" }, [countLabel(list.length)])]),
                el("p", null, [ct.description || ct.short || ""])
              ])
            ]),
            deviceGrid(list, data)
          ]);
          results.appendChild(block);
        });
        return;
      }

      var heading = state.cat && findCategory(data, state.cat) ? loc(findCategory(data, state.cat)).name : I18N.t("devices.allCategories");
      var head = el("div", { class: "results-head" }, [
        el("h2", null, [heading]),
        el("span", { class: "results-count" }, [countLabel(filtered.length)])
      ]);
      results.appendChild(head);
      if (state.cat && findCategory(data, state.cat)) {
        var cd = loc(findCategory(data, state.cat)).description;
        if (cd) results.appendChild(el("p", { class: "lead", style: "max-width:760px;margin-bottom:1.5rem" }, [cd]));
      }
      results.appendChild(deviceGrid(filtered, data));
    }

    function update(data) {
      syncUrl();
      updateChips();
      renderProgress(data);
      renderResults(data);
      if (clearBtn) clearBtn.classList.toggle("is-visible", !!state.q);
    }

    var searchForm = document.getElementById("device-search-form");
    if (searchForm) {
      searchForm.addEventListener("submit", function (e) {
        e.preventDefault();
      });
    }

    var debounce = null;
    if (searchInput) {
      searchInput.addEventListener("input", function () {
        clearTimeout(debounce);
        debounce = setTimeout(function () {
          state.q = searchInput.value.trim();
          loadData().then(update);
        }, 120);
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        state.q = "";
        if (searchInput) {
          searchInput.value = "";
          searchInput.focus();
        }
        loadData().then(update);
      });
    }
    if (progressReset) {
      progressReset.addEventListener("click", function () {
        learned.reset();
        loadData().then(update);
      });
    }

    I18N.ready.then(loadData).then(
      function (data) {
        // Unbekannte Kategorie aus der URL (?cat=) ignorieren, sonst ist kein Chip aktiv
        if (state.cat && !findCategory(data, state.cat)) state.cat = "";
        renderChips(data);
        update(data);
        document.addEventListener("i18n:change", function () {
          renderChips(data);
          update(data);
        });
      },
      function (err) {
        clear(results);
        results.appendChild(el("div", { class: "notice notice--warning" }, [ICONS.icon("info"), el("p", null, [I18N.t("devices.loadError")])]));
        if (window.console) console.error(err);
      }
    );
  }

  /* ======================================================================
     Detailseite
     ====================================================================== */
  function initDetail() {
    var heroWrap = document.getElementById("device-hero");
    var contentWrap = document.getElementById("device-content");
    var pagerWrap = document.getElementById("device-pager");
    var breadcrumb = document.getElementById("breadcrumb");

    var id = "";
    try {
      id = new URLSearchParams(window.location.search).get("id") || "";
    } catch (e) {
      /* ignore */
    }

    function section(sid, iconName, titleKey, body) {
      return el("section", { class: "device-section", id: sid, "aria-labelledby": sid + "-title" }, [
        el("h2", { id: sid + "-title" }, [ICONS.icon(iconName), I18N.t(titleKey)]),
        body
      ]);
    }

    function renderNotFound() {
      clear(heroWrap);
      heroWrap.appendChild(
        el("div", null, [
          el("h1", { class: "hero__title" }, [I18N.t("devices.detail.notFoundTitle")]),
          el("p", { class: "hero__text" }, [I18N.t("devices.detail.notFoundText")]),
          el("p", null, [el("a", { class: "btn btn--primary", href: I18N.withLang("geraete.html") }, [I18N.t("devices.detail.backToOverview")])])
        ])
      );
      clear(contentWrap);
      clear(pagerWrap);
    }

    function render(data) {
      var device = null;
      for (var i = 0; i < data.devices.length; i++) if (data.devices[i].id === id) device = data.devices[i];
      if (!device) {
        document.title = I18N.t("devices.detail.notFoundTitle") + " – Medny";
        renderNotFound();
        return;
      }
      var t = loc(device);
      var cat = findCategory(data, device.category);
      var ct = cat ? loc(cat) : {};
      var siblings = data.devices.filter(function (d) {
        return d.category === device.category;
      });
      var pos = siblings.indexOf(device);
      var prev = pos > 0 ? siblings[pos - 1] : null;
      var next = pos < siblings.length - 1 ? siblings[pos + 1] : null;

      // Titel & Meta
      document.title = I18N.t("meta.pages.device.title", { name: t.name });
      var metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute("content", I18N.t("meta.pages.device.description", { short: t.short || "" }));

      // Breadcrumb
      clear(breadcrumb);
      breadcrumb.appendChild(el("li", null, [el("a", { href: I18N.withLang("geraete.html") }, [I18N.t("nav.devices")])]));
      if (cat) breadcrumb.appendChild(el("li", null, [el("a", { href: categoryHref(cat.id) }, [ct.name || cat.id])]));
      breadcrumb.appendChild(el("li", { "aria-current": "page" }, [t.name]));

      // Hero
      clear(heroWrap);
      var isLearned = learned.has(device.id);
      var learnBtn = el(
        "button",
        {
          type: "button",
          class: "btn " + (isLearned ? "btn--accent" : "btn--secondary"),
          "aria-pressed": isLearned ? "true" : "false",
          onclick: function () {
            var nowLearned = learned.toggle(device.id);
            learnBtn.className = "btn " + (nowLearned ? "btn--accent" : "btn--secondary");
            learnBtn.setAttribute("aria-pressed", nowLearned ? "true" : "false");
            clear(learnBtn);
            learnBtn.appendChild(ICONS.icon(nowLearned ? "bookmark-check" : "bookmark"));
            learnBtn.appendChild(document.createTextNode(I18N.t(nowLearned ? "devices.detail.markedLearned" : "devices.detail.markLearned")));
            learnBtn.setAttribute("title", I18N.t(nowLearned ? "devices.detail.unmark" : "devices.detail.markLearned"));
          }
        },
        [ICONS.icon(isLearned ? "bookmark-check" : "bookmark"), I18N.t(isLearned ? "devices.detail.markedLearned" : "devices.detail.markLearned")]
      );
      learnBtn.setAttribute("title", I18N.t(isLearned ? "devices.detail.unmark" : "devices.detail.markLearned"));

      heroWrap.appendChild(
        el("div", null, [
          cat ? el("a", { class: "eyebrow", href: categoryHref(cat.id), style: "text-decoration:none" }, [ct.name || cat.id]) : null,
          el("h1", { class: "hero__title" }, [t.name]),
          t.subtitle ? el("p", { class: "device-hero__subtitle" }, [t.subtitle]) : null,
          el("p", { class: "hero__text" }, [t.short || ""]),
          el("div", { class: "device-hero__actions" }, [
            learnBtn,
            el("a", { class: "btn btn--ghost", href: I18N.withLang("geraete.html") }, [ICONS.icon("arrow-left", "icon--flip"), I18N.t("devices.detail.backToOverview")])
          ])
        ])
      );
      heroWrap.appendChild(
        el("figure", { class: "device-hero__media", style: "margin:0" }, [
          el("img", { src: device.image, alt: t.name, width: "320", height: "240" }),
          el("figcaption", null, [I18N.t("devices.detail.imageNote")])
        ])
      );

      // Hauptinhalt
      clear(contentWrap);
      var main = el("div", null);

      var howBody = el("div", null);
      (t.how || []).forEach(function (p) {
        howBody.appendChild(el("p", null, [p]));
      });
      main.appendChild(section("funktionsweise", "cog", "devices.detail.how", howBody));

      var useBody = el("ul", { class: "check-list" });
      (t.use || []).forEach(function (u) {
        useBody.appendChild(el("li", null, [u]));
      });
      main.appendChild(section("einsatz", "target", "devices.detail.use", useBody));

      if (t.facts && t.facts.length) {
        var factsBody = el("dl", { class: "facts" });
        t.facts.forEach(function (f) {
          factsBody.appendChild(el("div", null, [el("dt", null, [f.label]), el("dd", null, [f.value])]));
        });
        main.appendChild(section("fakten", "list", "devices.detail.facts", factsBody));
      }

      if (t.procurement && t.procurement.length) {
        var procBody = el("ol", { class: "tip-list" });
        t.procurement.forEach(function (p) {
          procBody.appendChild(el("li", null, [p]));
        });
        main.appendChild(section("beschaffung", "cart", "devices.detail.procurement", procBody));
      }

      if (t.glossary && t.glossary.length) {
        var glBody = el("dl", { class: "glossary" });
        t.glossary.forEach(function (g) {
          glBody.appendChild(el("div", null, [el("dt", null, [g.term]), el("dd", null, [g.text])]));
        });
        main.appendChild(section("begriffe", "book", "devices.detail.glossary", glBody));
      }
      contentWrap.appendChild(main);

      // Seitenleiste
      var tocList = el("ul", null);
      var secs = main.querySelectorAll(".device-section");
      for (var s = 0; s < secs.length; s++) {
        var h = secs[s].querySelector("h2");
        tocList.appendChild(el("li", null, [el("a", { href: "#" + secs[s].id, "data-no-lang": "" }, [h ? h.textContent : secs[s].id])]));
      }
      var sibList = el("ul", null);
      siblings.forEach(function (d) {
        var dt = loc(d);
        sibList.appendChild(
          el("li", null, [
            el("a", { href: deviceHref(d.id), "aria-current": d.id === device.id ? "page" : null }, [
              dt.name,
              learned.has(d.id) ? el("span", { class: "badge badge--success badge--icon", "aria-label": I18N.t("devices.detail.markedLearned") }, [ICONS.icon("check")]) : null
            ])
          ])
        );
      });
      var aside = el("aside", { class: "device-aside" }, [
        el("div", { class: "aside-box" }, [el("h3", null, [I18N.t("devices.detail.onThisPage")]), tocList]),
        el("div", { class: "aside-box" }, [el("h3", null, [I18N.t("devices.detail.related")]), sibList]),
        el("div", { class: "aside-box aside-box--cta" }, [
          el("h3", null, [I18N.t("devices.detail.procurementCtaTitle")]),
          el("p", null, [I18N.t("devices.detail.procurementCtaText")]),
          el("a", { class: "btn btn--primary btn--sm", href: I18N.withLang("kontakt.html") }, [I18N.t("devices.detail.procurementCtaButton")])
        ])
      ]);
      contentWrap.appendChild(aside);

      // Vor / Zurück
      clear(pagerWrap);
      if (prev) {
        pagerWrap.appendChild(
          el("a", { class: "pager__prev", href: deviceHref(prev.id) }, [el("span", null, [I18N.t("devices.detail.prev")]), el("span", null, [loc(prev).name])])
        );
      }
      if (next) {
        pagerWrap.appendChild(
          el("a", { class: "pager__next", href: deviceHref(next.id) }, [el("span", null, [I18N.t("devices.detail.next")]), el("span", null, [loc(next).name])])
        );
      }
    }

    I18N.ready.then(loadData).then(
      function (data) {
        render(data);
        document.addEventListener("i18n:change", function () {
          render(data);
        });
      },
      function (err) {
        clear(heroWrap);
        heroWrap.appendChild(el("div", { class: "notice notice--warning" }, [ICONS.icon("info"), el("p", null, [I18N.t("devices.loadError")])]));
        if (window.console) console.error(err);
      }
    );
  }

  /* ======================================================================
     Startseite: Kennzahlen & Kategorie-Links
     ====================================================================== */
  function initHome() {
    var catWrap = document.getElementById("home-categories");
    I18N.ready.then(loadData).then(function (data) {
      var statCats = document.querySelector('[data-stat="categories"]');
      var statDevs = document.querySelector('[data-stat="devices"]');
      if (statCats) statCats.textContent = String(data.categories.length);
      if (statDevs) statDevs.textContent = String(data.devices.length);

      function renderCats() {
        if (!catWrap) return;
        clear(catWrap);
        data.categories.forEach(function (cat) {
          var count = data.devices.filter(function (d) {
            return d.category === cat.id;
          }).length;
          var iconSpan = el("span", { class: "card__icon card__icon--primary", style: "width:40px;height:40px;margin:0", "aria-hidden": "true" });
          ICONS.inline(iconSpan, cat.icon);
          catWrap.appendChild(
            el("a", { class: "card card--hover", href: categoryHref(cat.id), style: "flex-direction:row;align-items:center;gap:0.85rem;padding:0.85rem 1rem;text-decoration:none" }, [
              iconSpan,
              el("span", null, [
                el("strong", { style: "display:block" }, [loc(cat).name || cat.id]),
                el("span", { class: "muted", style: "font-size:0.85rem" }, [count === 1 ? I18N.t("devices.deviceCountOne") : I18N.t("devices.deviceCount", { count: count })])
              ])
            ])
          );
        });
      }
      renderCats();
      document.addEventListener("i18n:change", renderCats);
    }).catch(function (err) {
      if (window.console) console.warn("[portal] Startseiten-Kennzahlen nicht geladen:", err);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var page = document.body.getAttribute("data-page");
    if (page === "devices") initOverview();
    else if (page === "device") initDetail();
    else if (page === "home") initHome();
  });

  window.MednyPortal = { loadData: loadData, learned: learned };
})(window, document);
