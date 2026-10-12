/* ==========================================================================
   Medny – Icon-Helfer
   - Inline-SVG-Icons für dynamisch erzeugte Inhalte
   - Lädt Kategorie-Icons (assets/img/categories/*.svg) und fügt sie inline ein,
     damit sie über CSS (currentColor) eingefärbt werden können.
   ========================================================================== */
(function (window, document) {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  // Strich-Icons (24x24, currentColor)
  var PATHS = {
    "arrow-right": "M5 12h14M13 6l6 6-6 6",
    "arrow-left": "M19 12H5M11 6l-6 6 6 6",
    check: "M5 12l5 5L19 7",
    "check-circle": "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0zM8 12l3 3 5-6",
    info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01",
    search: "M21 21l-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z",
    x: "M18 6L6 18M6 6l12 12",
    book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z",
    cog: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
    target: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
    list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    cart: "M3 3h2l2.6 12.4a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 7H6M9 21h.01M18 21h.01",
    tag: "M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8zM7 7h.01",
    layers: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    bookmark: "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z",
    "bookmark-check": "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2zM9 10l2 2 4-4",
    mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 7l-10 6L2 7",
    phone: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z",
    "map-pin": "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2",
    grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
    refresh: "M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6"
  };

  function icon(name, cls) {
    var svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    if (cls) svg.setAttribute("class", cls);
    var path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", PATHS[name] || PATHS.info);
    svg.appendChild(path);
    return svg;
  }

  var svgCache = {};

  /** Lädt eine SVG-Datei und fügt sie als Inline-SVG in das Zielelement ein. */
  function inline(target, url) {
    if (!target || !url) return Promise.resolve(null);
    if (!svgCache[url]) {
      svgCache[url] = fetch(url)
        .then(function (res) {
          if (!res.ok) throw new Error("HTTP " + res.status);
          return res.text();
        })
        .then(function (text) {
          var doc = new DOMParser().parseFromString(text, "image/svg+xml");
          var svg = doc.querySelector("svg");
          if (!svg || doc.querySelector("parsererror")) throw new Error("Ungültiges SVG: " + url);
          // Sicherheitsnetz: keine Skripte / Event-Handler übernehmen
          var scripts = svg.querySelectorAll("script");
          for (var i = 0; i < scripts.length; i++) scripts[i].parentNode.removeChild(scripts[i]);
          return svg;
        })
        .catch(function (err) {
          if (window.console) console.warn("[icons]", err.message);
          return null;
        });
    }
    return svgCache[url].then(function (svg) {
      target.innerHTML = "";
      if (!svg) {
        target.appendChild(icon("grid"));
        return null;
      }
      var clone = document.importNode(svg, true);
      clone.setAttribute("aria-hidden", "true");
      clone.setAttribute("focusable", "false");
      clone.removeAttribute("width");
      clone.removeAttribute("height");
      target.appendChild(clone);
      return clone;
    });
  }

  function inlineAll(root) {
    var nodes = (root || document).querySelectorAll("[data-inline-svg]");
    for (var i = 0; i < nodes.length; i++) inline(nodes[i], nodes[i].getAttribute("data-inline-svg"));
  }

  document.addEventListener("DOMContentLoaded", function () {
    inlineAll(document);
  });

  window.MednyIcons = { icon: icon, inline: inline, inlineAll: inlineAll };
})(window, document);
