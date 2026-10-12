#!/usr/bin/env node
/*
 * Prüft die Übersetzungsdateien:
 *  - Alle data-i18n / data-i18n-attr / data-i18n-html-Schlüssel in den HTML-Seiten existieren in de.json
 *  - en.json und ar.json haben exakt die gleiche Struktur wie de.json (Schlüssel, Arrays, Platzhalter)
 *  - data/devices.json ist vollständig (alle Geräte in allen Sprachen, alle Pflichtfelder)
 *
 * Aufruf:  node tools/check-i18n.js
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const LANGS = ["de", "en", "ar"];
let errors = 0;

function fail(msg) {
  errors++;
  console.error("✗ " + msg);
}

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function resolve(obj, key) {
  return key.split(".").reduce((cur, k) => (cur === undefined || cur === null ? undefined : cur[k]), obj);
}

// 1. HTML-Schlüssel gegen de.json
const dicts = {};
LANGS.forEach((l) => (dicts[l] = readJSON(path.join(root, "data/i18n", l + ".json"))));

const htmlFiles = fs.readdirSync(root).filter((f) => f.endsWith(".html"));
const keyRe = /data-i18n(?:-html)?="([^"]+)"/g;
const attrRe = /data-i18n-attr="([^"]+)"/g;
const usedKeys = new Set();
htmlFiles.forEach((file) => {
  const html = fs.readFileSync(path.join(root, file), "utf8");
  let m;
  while ((m = keyRe.exec(html))) usedKeys.add(m[1]);
  while ((m = attrRe.exec(html))) {
    m[1].split(";").forEach((pair) => {
      const idx = pair.indexOf(":");
      if (idx !== -1) usedKeys.add(pair.slice(idx + 1).trim());
    });
  }
});
// Schlüssel, die nur per JavaScript verwendet werden
const jsKeys = [];
fs.readdirSync(path.join(root, "js")).forEach((f) => {
  const src = fs.readFileSync(path.join(root, "js", f), "utf8");
  const re = /I18N\.t\(\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(src))) jsKeys.push(m[1]);
});
jsKeys.forEach((k) => usedKeys.add(k));

usedKeys.forEach((key) => {
  LANGS.forEach((l) => {
    const v = resolve(dicts[l], key);
    if (typeof v !== "string") fail(`Schlüssel "${key}" fehlt in ${l}.json`);
  });
});
console.log(`✓ ${usedKeys.size} verwendete Schlüssel in HTML/JS geprüft`);

// 2. Strukturvergleich
function walk(a, b, p, lang) {
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return fail(`${lang}.json: Array-Länge weicht ab bei ${p}`);
    a.forEach((v, i) => walk(v, b[i], `${p}.${i}`, lang));
  } else if (a && typeof a === "object") {
    if (!b || typeof b !== "object") return fail(`${lang}.json: Objekt fehlt bei ${p}`);
    Object.keys(a).forEach((k) => {
      if (!(k in b)) fail(`${lang}.json: Schlüssel fehlt: ${p}.${k}`);
      else walk(a[k], b[k], `${p}.${k}`, lang);
    });
    Object.keys(b).forEach((k) => {
      if (!(k in a)) fail(`${lang}.json: überzähliger Schlüssel: ${p}.${k}`);
    });
  } else if (typeof a === "string") {
    if (typeof b !== "string") return fail(`${lang}.json: kein String bei ${p}`);
    const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join(",");
    if (ph(a) !== ph(b)) fail(`${lang}.json: Platzhalter weichen ab bei ${p}`);
    if (!b.trim()) fail(`${lang}.json: leerer String bei ${p}`);
  }
}
["en", "ar"].forEach((l) => walk(dicts.de, dicts[l], "", l));
console.log("✓ Struktur von en.json und ar.json entspricht de.json");

// 3. devices.json
const devPath = path.join(root, "data/devices.json");
if (fs.existsSync(devPath)) {
  const data = readJSON(devPath);
  const catIds = new Set(data.categories.map((c) => c.id));
  data.categories.forEach((c) => {
    LANGS.forEach((l) => {
      const t = c.i18n && c.i18n[l];
      if (!t) return fail(`Kategorie ${c.id}: Sprache ${l} fehlt`);
      ["name", "short", "description"].forEach((f) => {
        if (typeof t[f] !== "string" || !t[f].trim()) fail(`Kategorie ${c.id} (${l}): Feld ${f} fehlt`);
      });
    });
    if (!fs.existsSync(path.join(root, c.icon))) fail(`Kategorie ${c.id}: Icon fehlt (${c.icon})`);
  });
  const ids = new Set();
  data.devices.forEach((d) => {
    if (ids.has(d.id)) fail(`Doppelte Geräte-ID: ${d.id}`);
    ids.add(d.id);
    if (!catIds.has(d.category)) fail(`Gerät ${d.id}: unbekannte Kategorie ${d.category}`);
    if (!fs.existsSync(path.join(root, d.image))) fail(`Gerät ${d.id}: Bild fehlt (${d.image})`);
    LANGS.forEach((l) => {
      const t = d.i18n && d.i18n[l];
      if (!t) return fail(`Gerät ${d.id}: Sprache ${l} fehlt`);
      ["name", "subtitle", "short"].forEach((f) => {
        if (typeof t[f] !== "string" || !t[f].trim()) fail(`Gerät ${d.id} (${l}): Feld ${f} fehlt`);
      });
      const arr = (f, min, max) => {
        if (!Array.isArray(t[f]) || t[f].length < min || t[f].length > max) fail(`Gerät ${d.id} (${l}): ${f} muss ${min}–${max} Einträge haben`);
      };
      arr("how", 2, 3);
      arr("use", 3, 5);
      arr("facts", 3, 4);
      arr("procurement", 4, 5);
      arr("glossary", 2, 3);
      arr("keywords", 3, 6);
      (t.facts || []).forEach((f) => {
        if (!f.label || !f.value) fail(`Gerät ${d.id} (${l}): facts-Eintrag unvollständig`);
      });
      (t.glossary || []).forEach((g) => {
        if (!g.term || !g.text) fail(`Gerät ${d.id} (${l}): glossary-Eintrag unvollständig`);
      });
    });
  });
  const perCat = {};
  data.devices.forEach((d) => (perCat[d.category] = (perCat[d.category] || 0) + 1));
  Object.keys(perCat).forEach((c) => {
    if (perCat[c] < 3) fail(`Kategorie ${c} hat nur ${perCat[c]} Geräte (mindestens 3)`);
  });
  console.log(`✓ devices.json: ${data.categories.length} Kategorien, ${data.devices.length} Geräte geprüft`);
} else {
  console.log("ℹ data/devices.json noch nicht vorhanden – übersprungen");
}

if (errors) {
  console.error(`\n${errors} Problem(e) gefunden.`);
  process.exit(1);
}
console.log("\nAlles in Ordnung.");
