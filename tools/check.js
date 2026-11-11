#!/usr/bin/env node
'use strict';
/*
 * Medny – Prüfungen (ohne Abhängigkeiten, nur Node.js)
 *
 *   1. Übersetzungen: en.json und ar.json haben dieselbe Struktur und dieselben {Platzhalter} wie de.json
 *   2. Geräte-Wissen: jedes Gerät ist in allen Sprachen vollständig
 *   3. Erzeugte Seiten sind aktuell (entspricht "node tools/build.js --check")
 *   4. Erzeugte Seiten: alle internen Links, Bilder und Sprungmarken existieren; keine Inline-Styles/-Skripte
 *
 * Aufruf:  node tools/check.js
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const config = require('../src/config');
const LANGS = config.langs.map((l) => l.code);
let errors = 0;

function fail(msg) {
  errors++;
  console.error('✗ ' + msg);
}
function ok(msg) {
  console.log('✓ ' + msg);
}
function readJSON(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  } catch (err) {
    fail(`${rel}: ${err.message}`);
    return null;
  }
}

/* 1. Übersetzungen */
const dicts = {};
LANGS.forEach((l) => (dicts[l] = readJSON(`data/i18n/${l}.json`)));
const placeholders = (s) => (s.match(/\{[\w.]+\}/g) || []).sort().join(',');

function compare(a, b, p, lang) {
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return fail(`${lang}.json: Liste hat andere Länge als in de.json: ${p}`);
    a.forEach((v, i) => compare(v, b[i], `${p}.${i}`, lang));
  } else if (a && typeof a === 'object') {
    if (!b || typeof b !== 'object') return fail(`${lang}.json: Abschnitt fehlt: ${p}`);
    Object.keys(a).forEach((k) => {
      if (!(k in b)) fail(`${lang}.json: Schlüssel fehlt: ${p ? p + '.' : ''}${k}`);
      else compare(a[k], b[k], p ? `${p}.${k}` : k, lang);
    });
    Object.keys(b).forEach((k) => {
      if (!(k in a)) fail(`${lang}.json: Schlüssel gibt es in de.json nicht: ${p ? p + '.' : ''}${k}`);
    });
  } else if (typeof a === 'string') {
    if (typeof b !== 'string') return fail(`${lang}.json: kein Text bei ${p}`);
    if (placeholders(a) !== placeholders(b)) fail(`${lang}.json: Platzhalter weichen von de.json ab: ${p}`);
    if (!b.trim()) fail(`${lang}.json: leerer Text bei ${p}`);
  }
}
if (LANGS.every((l) => dicts[l])) {
  LANGS.filter((l) => l !== config.defaultLang).forEach((l) => compare(dicts[config.defaultLang], dicts[l], '', l));
  if (!errors) ok(`Übersetzungen: ${LANGS.join(', ')} haben dieselbe Struktur`);
}

/* 2. Geräte-Wissen */
const data = readJSON('data/devices.json');
if (data) {
  const before = errors;
  const catIds = new Set((data.categories || []).map((c) => c.id));
  (data.categories || []).forEach((c) => {
    LANGS.forEach((l) => {
      const t = c.i18n && c.i18n[l];
      if (!t) return fail(`Kategorie ${c.id}: Sprache ${l} fehlt`);
      ['name', 'short', 'description'].forEach((f) => {
        if (typeof t[f] !== 'string' || !t[f].trim()) fail(`Kategorie ${c.id} (${l}): Feld "${f}" fehlt`);
      });
    });
    if (!c.icon || !fs.existsSync(path.join(ROOT, c.icon))) fail(`Kategorie ${c.id}: Icon fehlt (${c.icon})`);
  });
  const ids = new Set();
  const range = { how: [2, 3], use: [3, 5], facts: [3, 4], procurement: [3, 5], glossary: [2, 3], keywords: [3, 6] };
  (data.devices || []).forEach((d) => {
    if (ids.has(d.id)) fail(`Doppelte Geräte-ID: ${d.id}`);
    ids.add(d.id);
    if (!catIds.has(d.category)) fail(`Gerät ${d.id}: unbekannte Kategorie "${d.category}"`);
    if (!d.image || !fs.existsSync(path.join(ROOT, d.image))) fail(`Gerät ${d.id}: Bild fehlt (${d.image})`);
    LANGS.forEach((l) => {
      const t = d.i18n && d.i18n[l];
      if (!t) return fail(`Gerät ${d.id}: Sprache ${l} fehlt`);
      ['name', 'subtitle', 'short'].forEach((f) => {
        if (typeof t[f] !== 'string' || !t[f].trim()) fail(`Gerät ${d.id} (${l}): Feld "${f}" fehlt`);
      });
      Object.keys(range).forEach((f) => {
        const [min, max] = range[f];
        if (!Array.isArray(t[f]) || t[f].length < min || t[f].length > max) fail(`Gerät ${d.id} (${l}): "${f}" braucht ${min}–${max} Einträge`);
      });
      (t.facts || []).forEach((f) => {
        if (!f.label || !f.value) fail(`Gerät ${d.id} (${l}): Eintrag in "facts" unvollständig`);
      });
      (t.glossary || []).forEach((g) => {
        if (!g.term || !g.text) fail(`Gerät ${d.id} (${l}): Eintrag in "glossary" unvollständig`);
      });
      // Gleiche Anzahl Einträge wie im Deutschen, damit keine Sprache Inhalte auslässt
      const de = d.i18n[config.defaultLang];
      if (de) Object.keys(range).forEach((f) => {
        if (f !== 'keywords' && Array.isArray(t[f]) && Array.isArray(de[f]) && t[f].length !== de[f].length) fail(`Gerät ${d.id} (${l}): "${f}" hat ${t[f].length} Einträge, im Deutschen ${de[f].length}`);
      });
    });
  });
  if (errors === before) ok(`Geräte-Wissen: ${data.categories.length} Kategorien, ${data.devices.length} Geräte vollständig`);
}

/* 3. Erzeugte Seiten aktuell? */
const fresh = spawnSync(process.execPath, [path.join(__dirname, 'build.js'), '--check'], { encoding: 'utf8' });
if (fresh.status !== 0) {
  fail('Erzeugte Seiten sind nicht aktuell – bitte "node tools/build.js" ausführen.\n' + (fresh.stderr || fresh.stdout).trim().split('\n').map((l) => '    ' + l).join('\n'));
} else {
  ok('Erzeugte Seiten sind aktuell');
}

/* 4. Links, Sprungmarken und Inhaltsrichtlinie der erzeugten Seiten */
let manifest = null;
try {
  manifest = JSON.parse(fs.readFileSync(path.join(ROOT, '.build-manifest.json'), 'utf8'));
} catch (err) {
  fail('.build-manifest.json fehlt – bitte "node tools/build.js" ausführen.');
}
if (manifest) {
  const before = errors;
  const pages = manifest.files.filter((f) => /\.html$/.test(f));
  const idCache = {};
  const idsOf = (file) => {
    if (!idCache[file]) {
      const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
      idCache[file] = new Set((html.match(/\sid="([^"]+)"/g) || []).map((m) => m.slice(5, -1)));
    }
    return idCache[file];
  };
  let links = 0;
  pages.forEach((file) => {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const langMatch = html.match(/<html lang="([a-z]+)" dir="(ltr|rtl)">/);
    if (!langMatch) fail(`${file}: <html lang dir> fehlt`);
    if ((html.match(/<h1[\s>]/g) || []).length !== 1) fail(`${file}: genau eine <h1> erwartet`);
    if (!/<title>[^<]+<\/title>/.test(html)) fail(`${file}: <title> fehlt`);
    if (!/<meta name="description" content="[^"]+">/.test(html)) fail(`${file}: Meta-Beschreibung fehlt`);
    if (/\sstyle="/.test(html)) fail(`${file}: Inline-Style gefunden (von der Inhaltsrichtlinie blockiert)`);
    if (/<script(?![^>]*\ssrc=)(?![^>]*type="application\/(ld\+)?json")[^>]*>/.test(html)) fail(`${file}: Inline-Skript gefunden (von der Inhaltsrichtlinie blockiert)`);
    if (/\{[\w.]+\}/.test(html.replace(/<script[\s\S]*?<\/script>/g, ''))) fail(`${file}: nicht ersetzter {Platzhalter} im Text`);
    if (file === '404.html') return; // nutzt absolute Pfade ab der Wurzel der Webseite
    const re = /\s(?:href|src)="([^"]+)"/g;
    let m;
    while ((m = re.exec(html))) {
      const url = m[1].replace(/&amp;/g, '&');
      if (/^(https?:|mailto:|tel:|data:)/.test(url)) continue;
      links++;
      const [beforeHash, hash] = url.split('#');
      const rel = beforeHash.split('?')[0];
      const target = rel ? path.posix.normalize(path.posix.join(path.posix.dirname(file), rel)) : file;
      if (target.indexOf('..') === 0) {
        fail(`${file}: Link zeigt aus der Webseite heraus: ${url}`);
        continue;
      }
      if (!fs.existsSync(path.join(ROOT, target))) {
        fail(`${file}: Ziel existiert nicht: ${url}`);
        continue;
      }
      if (hash && /\.html$/.test(target) && !idsOf(target).has(hash)) fail(`${file}: Sprungmarke #${hash} fehlt in ${target}`);
    }
  });
  if (errors === before) ok(`${pages.length} Seiten: ${links} interne Links und Sprungmarken in Ordnung, keine Inline-Styles/-Skripte`);
}

if (errors) {
  console.error(`\n${errors} Problem(e) gefunden.`);
  process.exit(1);
}
console.log('\nAlles in Ordnung.');
