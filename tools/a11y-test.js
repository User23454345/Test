#!/usr/bin/env node
'use strict';
/*
 * Medny – Barrierefreiheits-Prüfung mit axe-core (WCAG 2.2 AA) und Playwright
 *
 * Prüft jede Seitenart in allen Sprachen bei Desktop- und Smartphone-Breite sowie wichtige Zustände
 * (leere Suche, aktiver Filter, markiertes Gerät, Formularfehler, geöffnetes Menü).
 * Automatische Prüfungen finden nur einen Teil der Barrieren – sie ersetzen keinen Test mit Tastatur
 * und Vorleseprogramm, verhindern aber Rückschritte.
 *
 * Voraussetzung: npm install  und ein lokaler Webserver (npm start).
 * Aufruf:        node tools/a11y-test.js [Basisadresse]
 */
const path = require('path');

function need(name, fallback) {
  try {
    return require(name);
  } catch (e) {
    if (fallback) {
      try {
        return require(fallback);
      } catch (e2) {
        /* weiter unten */
      }
    }
    console.error(`${name} nicht gefunden. Installieren mit: npm install`);
    process.exit(1);
  }
}

const playwright = need('playwright', '/opt/node22/lib/node_modules/playwright');
const axeSource = need('axe-core').source;
const config = require('../src/config');
const devices = require(path.join('..', 'data', 'devices.json')).devices;

const BASE = (process.argv[2] || 'http://127.0.0.1:8080').replace(/\/+$/, '');
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

(async () => {
  const browser = await playwright.chromium.launch();
  const found = {};
  let runs = 0;

  const audit = async (page, name) => {
    await page.addScriptTag({ content: axeSource });
    const violations = await page.evaluate(async (tags) => {
      const result = await window.axe.run(document, { runOnly: { type: 'tag', values: tags } });
      return result.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, target: v.nodes[0].target.join(' ') }));
    }, TAGS);
    runs++;
    violations.forEach((v) => {
      const key = `${v.id} | ${v.target}`;
      (found[key] = found[key] || { v, where: [] }).where.push(name);
    });
  };

  for (const width of [1366, 390]) {
    // bypassCSP: Die Seiten erlauben keine eingeschleusten Skripte – für die Prüfung wird das umgangen.
    const context = await browser.newContext({ viewport: { width, height: 900 }, bypassCSP: true });
    const page = await context.newPage();
    const open = (file) => page.goto(`${BASE}/${file}`, { waitUntil: 'networkidle' });

    for (const lang of config.langs) {
      const code = lang.code;
      const sample = [devices[0], devices[Math.floor(devices.length / 2)], devices[devices.length - 1]];
      const files = Object.keys(config.pages)
        .map((key) => config.pages[key][code])
        .concat(sample.map((d) => `${config.deviceDir[code]}/${d.id}.html`));
      for (const file of files) {
        await open(file);
        await audit(page, `${file} @${width}`);
      }

      await open(config.pages.devices[code] + '?q=xyzxyz');
      await audit(page, `${code}: leere Suche @${width}`);
      await open(config.pages.devices[code] + '?cat=' + devices[0].category);
      await audit(page, `${code}: Kategorie-Filter @${width}`);
      await open(`${config.deviceDir[code]}/${devices[0].id}.html`);
      await page.click('#learn-toggle');
      await audit(page, `${code}: Gerät als gelernt markiert @${width}`);
      await open(config.pages.devices[code]);
      await audit(page, `${code}: Übersicht mit Lernfortschritt @${width}`);
      await page.evaluate(() => window.localStorage.clear());
      await open(config.pages.glossary[code] + '?q=doppler');
      await audit(page, `${code}: Glossar-Suche @${width}`);
      await open(config.pages.contact[code]);
      await page.click('#contact-form button[type="submit"]');
      await audit(page, `${code}: Formularfehler @${width}`);
      if (width < 1024) {
        await open(config.pages.home[code]);
        await page.click('.nav-toggle');
        await audit(page, `${code}: Menü geöffnet @${width}`);
      }
    }
    await open('404.html');
    await audit(page, `404.html @${width}`);
    await context.close();
  }
  await browser.close();

  const keys = Object.keys(found);
  if (!keys.length) {
    console.log(`✓ ${runs} Prüfläufe ohne Verstoß`);
    return;
  }
  keys.forEach((key) => {
    const { v, where } = found[key];
    console.error(`✗ [${v.impact}] ${v.id}: ${v.help}\n    Element: ${v.target}\n    ${where.length}×, z. B. ${where.slice(0, 3).join('; ')}`);
  });
  console.error(`\n${keys.length} unterschiedliche Verstöße in ${runs} Prüfläufen.`);
  process.exit(1);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
