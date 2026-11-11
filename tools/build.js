#!/usr/bin/env node
'use strict';
/*
 * Medny – Seiten-Generator (ohne Abhängigkeiten, nur Node.js)
 *
 * Erzeugt aus den Texten in data/ und den Vorlagen in src/ fertige HTML-Seiten für jede Sprache:
 *   Deutsch an der Wurzel (index.html, geraete.html, geraete/<id>.html …), Englisch in en/, Arabisch in ar/.
 *
 * Aufruf:
 *   node tools/build.js             Seiten erzeugen
 *   node tools/build.js --check     nur prüfen, ob die erzeugten Seiten aktuell sind (ändert nichts)
 *   node tools/build.js --watch     bei Änderungen in data/ oder src/ automatisch neu erzeugen
 *   node tools/build.js --out DIR   in einen anderen Ordner schreiben (kopiert assets/, css/, js/ mit)
 *   node tools/build.js --verbose   zusätzlich ungenutzte Textschlüssel auflisten
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const flag = (name) => argv.indexOf(name) !== -1;
const option = (name) => (argv.indexOf(name) !== -1 ? argv[argv.indexOf(name) + 1] : null);

const MANIFEST = '.build-manifest.json';

/* ---------- kleine Helfer ---------- */
function readJSON(rel) {
  const file = path.join(ROOT, rel);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`${rel} kann nicht gelesen werden: ${err.message}`);
  }
}

function resolveKey(obj, key) {
  return key.split('.').reduce((cur, part) => (cur === undefined || cur === null ? undefined : cur[part]), obj);
}

function leafKeys(obj, prefix, out) {
  Object.keys(obj).forEach((k) => {
    if (k === '_comment') return;
    const p = prefix ? prefix + '.' + k : k;
    if (obj[k] && typeof obj[k] === 'object') leafKeys(obj[k], p, out);
    else out.push(p);
  });
  return out;
}

function posixRelative(fromFile, toFile) {
  const rel = path.posix.relative(path.posix.dirname(fromFile), toFile);
  return rel || path.posix.basename(toFile);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  fs.readdirSync(src, { withFileTypes: true }).forEach((entry) => {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  });
}

/* ---------- Erzeugen ---------- */
function build() {
  const config = require('../src/config');
  const ui = require('../src/ui');
  const { renderDocument } = require('../src/layout');
  const { buildGlossary } = require('../src/portal');
  const legal = require('../src/pages/legal');
  const pageModules = {
    home: require('../src/pages/home'),
    about: require('../src/pages/about'),
    medtech: require('../src/pages/medtech'),
    devices: require('../src/pages/devices'),
    glossary: require('../src/pages/glossary'),
    contact: require('../src/pages/contact'),
    imprint: legal.imprint,
    privacy: legal.privacy
  };
  const devicePage = require('../src/pages/device');
  const notFoundPage = require('../src/pages/notfound');

  const OUT = option('--out') ? path.resolve(option('--out')) : ROOT;
  const CHECK = flag('--check');
  const warnings = [];
  const warn = (msg) => {
    if (warnings.indexOf(msg) === -1) warnings.push(msg);
  };
  if (flag('--out') && (!option('--out') || /^--/.test(option('--out')))) throw new Error('--out braucht einen Ordner, z. B.: node tools/build.js --out dist');

  /* 1. Daten laden und prüfen */
  const defaultLang = config.defaultLang;
  const dicts = {};
  config.langs.forEach((l) => (dicts[l.code] = readJSON(`data/i18n/${l.code}.json`)));
  const site = readJSON('data/site.json');
  const rawDevices = readJSON('data/devices.json');

  const categories = (rawDevices.categories || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const catIndex = {};
  categories.forEach((c, i) => (catIndex[c.id] = i));
  const devices = (rawDevices.devices || []).slice().sort((a, b) => {
    if (catIndex[a.category] !== catIndex[b.category]) return catIndex[a.category] - catIndex[b.category];
    return (a.order || 0) - (b.order || 0);
  });
  const seenIds = new Set();
  devices.forEach((d) => {
    if (!/^[a-z0-9-]+$/.test(d.id || '')) throw new Error(`Ungültige Geräte-ID "${d.id}" (erlaubt: Kleinbuchstaben, Ziffern, Bindestrich)`);
    if (seenIds.has(d.id)) throw new Error(`Doppelte Geräte-ID: ${d.id}`);
    seenIds.add(d.id);
    if (catIndex[d.category] === undefined) throw new Error(`Gerät ${d.id}: unbekannte Kategorie "${d.category}"`);
    config.langs.forEach((l) => {
      if (!d.i18n || !d.i18n[l.code]) throw new Error(`Gerät ${d.id}: Texte für Sprache "${l.code}" fehlen`);
    });
    if (!fs.existsSync(path.join(ROOT, d.image))) throw new Error(`Gerät ${d.id}: Bild fehlt (${d.image})`);
  });
  // Kategorien ohne Geräte (z. B. gerade neu angelegt) noch nicht anzeigen – sonst zeigen Kacheln auf eine fehlende Sprungmarke
  const shownCategories = categories.filter((c) => devices.some((d) => d.category === c.id));
  categories.filter((c) => shownCategories.indexOf(c) === -1).forEach((c) => warn(`Kategorie "${c.id}" enthält noch keine Geräte und wird nicht angezeigt`));
  const data = { categories: shownCategories, devices };

  // Abgeleitete Angaben für Texte: {site.company.zipCity}, {site.company.addressLine}
  site.company.zipCity = `${site.company.zip} ${site.company.city}`;
  site.company.addressLine = `${site.company.street}, ${site.company.zipCity}`;

  // Arabisch (RTL): Vorzeichen vor Zahlen ("−1000", "+1000") würden sonst hinter die Zahl rutschen.
  // Eine unsichtbare Links-nach-rechts-Marke davor hält sie an ihrem Platz.
  const LRM = String.fromCharCode(0x200e);
  const LRI = String.fromCharCode(0x2066);
  const PDI = String.fromCharCode(0x2069);
  const fixSigns = (value) => {
    if (typeof value === 'string') return value.replace(/(^|[^0-9A-Za-z])([−+])(?=[0-9])/g, `$1${LRM}$2`);
    if (Array.isArray(value)) return value.map(fixSigns);
    if (value && typeof value === 'object') {
      Object.keys(value).forEach((k) => (value[k] = fixSigns(value[k])));
    }
    return value;
  };
  config.langs.filter((l) => l.dir === 'rtl').forEach((l) => {
    fixSigns(dicts[l.code]);
    rawDevices.categories.concat(rawDevices.devices).forEach((item) => item.i18n && item.i18n[l.code] && fixSigns(item.i18n[l.code]));
  });

  const baseUrl = String((site.company && site.company.url) || '').trim().replace(/\/+$/, '');
  if (baseUrl && !/^https?:\/\/[^\s/?#]+(\/[^\s?#]*)?$/i.test(baseUrl)) {
    throw new Error(`data/site.json → company.url ist keine gültige Adresse: "${site.company.url}" (erwartet z. B. https://www.beispiel.de)`);
  }
  const basePath = baseUrl ? new URL(baseUrl + '/').pathname : '/';
  const year = new Date().getFullYear();

  // Platzhalter erkennen: solange Beispielwerte eingetragen sind, zeigen die Seiten entsprechende Hinweise.
  const contactPlaceholder =
    /Vorname Nachname/.test(site.owner.name) || /\.example$/.test(site.owner.email) || /Musterstra(ß|ss)e/.test(site.company.street) || /^\+49 000 0000000$/.test(String(site.owner.phone).trim());
  const hasBrackets = (key) => ((dicts[defaultLang][key] || {}).sections || []).some((s) => /\[[^\]]+\]/.test(s.text + s.title));
  const placeholders = {
    contact: contactPlaceholder,
    imprint: contactPlaceholder || hasBrackets('imprint'),
    privacy: contactPlaceholder || hasBrackets('privacy')
  };

  const glossaries = {};
  config.langs.forEach((l) => (glossaries[l.code] = buildGlossary(l.code, dicts[l.code], data, warn)));

  /* 2. Kontext für Vorlagen */
  const usedKeys = new Set();
  const usedPrefixes = new Set();

  function lookup(lang, key) {
    let value = resolveKey(dicts[lang], key);
    if (value === undefined && lang !== defaultLang) {
      value = resolveKey(dicts[defaultLang], key);
      if (value !== undefined) warn(`Übersetzung fehlt in data/i18n/${lang}.json: ${key} (deutscher Text wird verwendet)`);
    }
    return value;
  }

  function createContext(langInfo, file, pageKey, langFile, relFn) {
    const lang = langInfo.code;
    const rel = relFn || ((target) => posixRelative(file, target));

    // {name}-Platzhalter ersetzen: übergebene Werte, {site.owner.name} usw. aus data/site.json, {year}
    // isolate: '' = reiner Text (<title>, Meta-Angaben, JSON), 'chars' = sichtbarer Text/Attribut, 'html' = sichtbares HTML
    const fill = (template, vars, escapeValues, isolate) =>
      String(template).replace(/\{([\w.]+)\}/g, (match, name) => {
        let value;
        let fromSite = false;
        if (vars && Object.prototype.hasOwnProperty.call(vars, name)) value = vars[name];
        else if (name.indexOf('site.') === 0) {
          value = resolveKey(site, name.slice(5));
          fromSite = true;
        } else if (name === 'year') value = year;
        if (value === undefined || value === null) return match;
        const out = escapeValues ? ui.esc(value) : String(value);
        // Lateinische Stammdaten in RTL-Texten als eigene Links-nach-rechts-Einheit einsetzen – nur im sichtbaren Text
        if (!fromSite || !isolate || langInfo.dir !== 'rtl') return out;
        return isolate === 'html' ? `<bdi dir="ltr">${out}</bdi>` : LRI + out + PDI;
      });

    const string = (key, forLang) => {
      const value = lookup(forLang || lang, key);
      if (typeof value !== 'string') throw new Error(`Text fehlt oder ist keine Zeichenkette: "${key}" (data/i18n/${forLang || lang}.json)`);
      usedKeys.add(key);
      return value;
    };

    const ctx = {
      config,
      site,
      data,
      lang,
      langInfo,
      dir: langInfo.dir,
      file,
      pageKey,
      year,
      baseUrl,
      placeholders,
      glossary: glossaries[lang],
      esc: ui.esc,
      /** Freier Text mit {Platzhaltern} als sichtbares, escaptes HTML (Impressum, Datenschutz). */
      html: (template, vars) => fill(ui.esc(template), vars, true, 'html'),
      /** Übersetzter Text, HTML-sicher. rawVars = true: eingesetzte Werte sind bereits fertiges HTML. */
      t: (key, vars, rawVars) => fill(ui.esc(string(key)), vars, !rawVars, 'chars'),
      /** Übersetzter Text in einer bestimmten Sprache (HTML-sicher). */
      tIn: (code, key, vars) => fill(ui.esc(string(key, code)), vars, true, 'chars'),
      /** Übersetzter Text unverändert (für <title>, JSON, Attribute, die selbst escapen). */
      text: (key, vars) => fill(string(key), vars, false),
      /** Liste oder Objekt aus der Übersetzungsdatei (Einträge selbst mit esc() ausgeben). */
      list: (key) => {
        const value = lookup(lang, key);
        if (!value || typeof value !== 'object') throw new Error(`Liste fehlt: "${key}" (data/i18n/${lang}.json)`);
        usedPrefixes.add(key);
        return value;
      },
      L: (item) => item.i18n[lang] || item.i18n[defaultLang],
      pageFile: (key, code) => config.pages[key][code || lang],
      deviceFile: (id, code) => `${config.deviceDir[code || lang]}/${id}.html`,
      langFile,
      rel,
      asset: (p) => rel(p),
      href: (key, opts) => {
        const o = opts || {};
        if (!config.pages[key]) throw new Error('Unbekannte Seite: ' + key);
        return rel(config.pages[key][lang]) + (o.query ? '?' + o.query : '') + (o.hash ? '#' + o.hash : '');
      },
      deviceHref: (id) => rel(`${config.deviceDir[lang]}/${id}.html`),
      langHref: (code) => rel(langFile(code)),
      absUrl: (f) => baseUrl + '/' + f.replace(/(^|\/)index\.html$/, '$1')
    };
    return ctx;
  }

  /* 3. Seiten rendern */
  const outputs = [];
  const sitemapEntries = [];

  config.langs.forEach((langInfo) => {
    const lang = langInfo.code;
    Object.keys(config.pages).forEach((key) => {
      const file = config.pages[key][lang];
      const langFile = (code) => config.pages[key][code];
      const ctx = createContext(langInfo, file, key, langFile);
      const page = pageModules[key].render(ctx);
      if (config.noindex.indexOf(key) !== -1 && !page.robots) page.robots = 'noindex,follow';
      outputs.push({ file, content: renderDocument(ctx, page) });
      if (!page.robots) sitemapEntries.push({ file, langFile });
    });
    devices.forEach((device) => {
      const file = `${config.deviceDir[lang]}/${device.id}.html`;
      const langFile = (code) => `${config.deviceDir[code]}/${device.id}.html`;
      const ctx = createContext(langInfo, file, 'device', langFile);
      outputs.push({ file, content: renderDocument(ctx, devicePage.render(ctx, device)) });
      sitemapEntries.push({ file, langFile });
    });
  });

  // Fehlerseite: wird vom Hoster unter beliebigen Pfaden ausgeliefert, deshalb absolute Pfade ab der Wurzel der Webseite.
  {
    const langInfo = config.langs.find((l) => l.code === defaultLang);
    const ctx = createContext(langInfo, '404.html', 'notFound', () => '404.html', (target) => basePath + target);
    ctx.langHref = (code) => basePath + config.pages.home[code];
    outputs.push({ file: '404.html', content: renderDocument(ctx, notFoundPage.render(ctx)) });
  }

  /* 4. Zusatzdateien */
  outputs.push({ file: 'robots.txt', content: ['User-agent: *', 'Allow: /'].concat(baseUrl ? ['', `Sitemap: ${baseUrl}/sitemap.xml`] : []).join('\n') + '\n' });
  if (baseUrl) {
    const abs = (f) => ui.esc(baseUrl + '/' + f.replace(/(^|\/)index\.html$/, '$1'));
    const urls = sitemapEntries.map((entry) => {
      const alternates = config.langs
        .map((l) => `    <xhtml:link rel="alternate" hreflang="${l.code}" href="${abs(entry.langFile(l.code))}"/>`)
        .concat([`    <xhtml:link rel="alternate" hreflang="x-default" href="${abs(entry.langFile(defaultLang))}"/>`]);
      return `  <url>\n    <loc>${abs(entry.file)}</loc>\n${alternates.join('\n')}\n  </url>`;
    });
    outputs.push({
      file: 'sitemap.xml',
      content: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`
    });
  }
  // GitHub Pages: Dateien unverändert ausliefern (kein Jekyll)
  outputs.push({ file: '.nojekyll', content: '' });

  /* 5. Schreiben bzw. prüfen */
  const files = outputs.map((o) => o.file).sort();
  let previous = [];
  try {
    previous = JSON.parse(fs.readFileSync(path.join(OUT, MANIFEST), 'utf8')).files || [];
  } catch (err) {
    previous = [];
  }
  const stale = previous.filter((f) => files.indexOf(f) === -1);
  const changed = [];
  // Die Jahreszahl im Fuß hält js/site.js aktuell – ein Jahreswechsel allein macht die Seiten nicht "veraltet".
  const YEAR_RE = /(<span data-year>)\d{4}(<\/span>)/g;
  const sameExceptYear = (a, b) => a !== null && a.replace(YEAR_RE, '$1$2') === b.replace(YEAR_RE, '$1$2');
  outputs.forEach((o) => {
    const target = path.join(OUT, o.file);
    let current = null;
    try {
      current = fs.readFileSync(target, 'utf8');
    } catch (err) {
      current = null;
    }
    if (CHECK ? !sameExceptYear(current, o.content) : current !== o.content) {
      changed.push(o.file);
      if (!CHECK) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, o.content);
      }
    }
  });

  if (!CHECK) {
    stale.forEach((f) => {
      try {
        fs.unlinkSync(path.join(OUT, f));
        const dir = path.dirname(path.join(OUT, f));
        if (dir !== OUT && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
      } catch (err) {
        /* bereits entfernt */
      }
    });
    fs.writeFileSync(path.join(OUT, MANIFEST), JSON.stringify({ note: 'Von tools/build.js erzeugte Dateien – nicht bearbeiten.', files }, null, 1) + '\n');
    if (OUT !== ROOT) config.staticDirs.forEach((dir) => copyDir(path.join(ROOT, dir), path.join(OUT, dir)));
  }

  /* 6. Bericht */
  const htmlCount = files.filter((f) => /\.html$/.test(f)).length;
  const unused = leafKeys(dicts[defaultLang], '', []).filter((key) => {
    if (usedKeys.has(key) || (config.conditionalKeys || []).indexOf(key) !== -1) return false;
    for (const prefix of usedPrefixes) if (key.indexOf(prefix + '.') === 0) return false;
    return true;
  });

  if (CHECK) {
    if (changed.length || stale.length) {
      console.error(`✗ Die erzeugten Seiten sind nicht aktuell (${changed.length} geändert, ${stale.length} überzählig). Bitte "node tools/build.js" ausführen.`);
      changed.slice(0, 10).forEach((f) => console.error('    ' + f));
      process.exitCode = 1;
    } else {
      console.log(`✓ ${htmlCount} Seiten sind aktuell`);
    }
  } else {
    console.log(`✓ ${htmlCount} Seiten in ${config.langs.length} Sprachen erzeugt (${changed.length} geändert${stale.length ? ', ' + stale.length + ' entfernt' : ''})${OUT !== ROOT ? ' → ' + OUT : ''}`);
  }
  warnings.forEach((w) => console.warn('⚠ ' + w));
  if (!baseUrl) console.log('ℹ data/site.json → company.url ist leer: keine kanonischen Adressen, hreflang-Angaben und keine sitemap.xml. Vor der Veröffentlichung die Adresse der Webseite eintragen.');
  if (placeholders.contact) console.log('ℹ data/site.json enthält noch Beispielwerte (Name, E-Mail, Telefon oder Anschrift). Die Seiten zeigen dazu Platzhalter-Hinweise.');
  if (placeholders.imprint || placeholders.privacy) console.log('ℹ Impressum/Datenschutzerklärung enthalten noch Platzhalter in eckigen Klammern oder Beispielwerte.');
  if (unused.length) {
    console.log(`ℹ ${unused.length} Textschlüssel in data/i18n/${defaultLang}.json werden von keiner Seite verwendet${flag('--verbose') ? ':' : ' (Liste mit --verbose).'}`);
    if (flag('--verbose')) unused.forEach((k) => console.log('    ' + k));
  }
  return { files, changed, stale, warnings, unused };
}

/* ---------- Beobachten ---------- */
function watch() {
  const { spawnSync } = require('child_process');
  const args = argv.filter((a) => a !== '--watch');
  const run = () => spawnSync(process.execPath, [__filename].concat(args), { stdio: 'inherit' });
  run();
  let timer = null;
  const onChange = () => {
    clearTimeout(timer);
    timer = setTimeout(run, 150);
  };
  const watchTree = (dir) => {
    fs.watch(dir, onChange);
    fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).forEach((e) => watchTree(path.join(dir, e.name)));
  };
  ['data', 'src'].forEach((dir) => {
    try {
      fs.watch(path.join(ROOT, dir), { recursive: true }, onChange);
    } catch (err) {
      watchTree(path.join(ROOT, dir)); // kein rekursives Beobachten (Linux mit Node.js < 20): Unterordner einzeln
    }
  });
  console.log('… beobachte data/ und src/ (Strg+C beendet)');
}

if (require.main === module) {
  if (flag('--watch')) {
    watch();
  } else {
    try {
      build();
    } catch (err) {
      console.error('✗ ' + err.message);
      process.exitCode = 1;
    }
  }
}

module.exports = { build };
