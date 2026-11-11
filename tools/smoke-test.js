#!/usr/bin/env node
'use strict';
/*
 * Medny – Browser-Test mit Playwright (Chromium)
 *
 * Öffnet alle erzeugten Seiten in allen Sprachen und prüft: Konsolenfehler (auch Verstöße gegen die
 * Inhaltsrichtlinie), fehlgeschlagene Anfragen, Sprache und Leserichtung, horizontales Scrollen
 * (Desktop und Mobil) sowie die Funktionen: Menü, Sprachwechsel, Suche, Filter, Lernfortschritt,
 * Glossar und Kontaktformular.
 *
 * Voraussetzung: lokaler Webserver im Projektordner, z. B.  npx http-server -p 8080 -c-1 .
 * Aufruf:        node tools/smoke-test.js [Basisadresse] [Ordner für Screenshots]
 */
const fs = require('fs');
const path = require('path');

let playwright;
try {
  playwright = require('playwright');
} catch (e) {
  try {
    playwright = require('/opt/node22/lib/node_modules/playwright');
  } catch (e2) {
    console.error('Playwright nicht gefunden. Installieren mit: npm install');
    process.exit(1);
  }
}

const ROOT = path.resolve(__dirname, '..');
const config = require('../src/config');
const BASE = (process.argv[2] || 'http://127.0.0.1:8080').replace(/\/+$/, '');
const SHOTS = process.argv[3] || '';
const devices = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/devices.json'), 'utf8')).devices;

let failures = 0;
const fail = (msg) => {
  failures++;
  console.error('✗ ' + msg);
};
const ok = (msg) => console.log('✓ ' + msg);
const expect = (cond, good, bad) => (cond ? ok(good) : fail(bad || good));

(async () => {
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const problems = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') problems.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on('pageerror', (err) => problems.push('pageerror: ' + err.message));
  page.on('requestfailed', (req) => {
    if (!/^mailto:/.test(req.url())) problems.push('requestfailed: ' + req.url());
  });
  page.on('response', (res) => {
    if (res.status() >= 400) problems.push(`HTTP ${res.status()}: ${res.url()}`);
  });

  const go = async (file) => {
    problems.length = 0;
    await page.goto(`${BASE}/${file}`, { waitUntil: 'networkidle' });
  };
  const hasHScroll = () => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  const shot = async (name) => {
    if (!SHOTS) return;
    fs.mkdirSync(SHOTS, { recursive: true });
    await page.screenshot({ path: path.join(SHOTS, name.replace(/[\/?=.&#]/g, '_') + '.png'), fullPage: true });
  };

  /* 1. Jede Seite in jeder Sprache (Desktop) */
  for (const lang of config.langs) {
    const files = Object.keys(config.pages)
      .map((key) => config.pages[key][lang.code])
      .concat(devices.map((d) => `${config.deviceDir[lang.code]}/${d.id}.html`));
    let bad = 0;
    for (const file of files) {
      await go(file);
      const info = await page.evaluate(() => ({
        lang: document.documentElement.lang,
        dir: document.documentElement.dir,
        h1: (document.querySelector('h1') || {}).textContent || '',
        current: (document.querySelector('.lang-switch a[aria-current]') || { lang: '' }).lang,
        braces: /\{[\w.]+\}/.test(document.querySelector('main').textContent)
      }));
      const issues = [];
      if (info.lang !== lang.code) issues.push(`lang=${info.lang}`);
      if (info.dir !== lang.dir) issues.push(`dir=${info.dir}`);
      if (info.current !== lang.code) issues.push(`Sprachumschalter markiert "${info.current}"`);
      if (!info.h1.trim()) issues.push('keine H1');
      if (info.braces) issues.push('nicht ersetzter {Platzhalter}');
      if (await hasHScroll()) issues.push('horizontales Scrollen');
      if (problems.length) issues.push(problems.join(' | '));
      if (issues.length) {
        bad++;
        fail(`${file}: ${issues.join('; ')}`);
      }
      if (SHOTS && !/\/(devices|geraete)\//.test(file)) await shot(file + '-desktop');
    }
    if (!bad) ok(`${lang.code}: ${files.length} Seiten ohne Fehler (Sprache, Richtung, Konsole, Anfragen, Layout)`);
  }

  /* 2. Mobil: kein horizontales Scrollen, Menü */
  await page.setViewportSize({ width: 390, height: 844 });
  for (const lang of config.langs) {
    const files = ['home', 'about', 'medtech', 'devices', 'glossary', 'contact', 'imprint'].map((k) => config.pages[k][lang.code]).concat([`${config.deviceDir[lang.code]}/${devices[0].id}.html`]);
    let bad = 0;
    for (const file of files) {
      await go(file);
      if (await hasHScroll()) {
        bad++;
        fail(`${file} mobil: horizontales Scrollen`);
      }
      await shot(file + '-mobile');
    }
    if (!bad) ok(`${lang.code} mobil: ${files.length} Seiten ohne horizontales Scrollen`);
  }
  await go(config.pages.home.de);
  await page.click('.nav-toggle');
  expect(await page.evaluate(() => document.getElementById('site-nav').classList.contains('is-open') && document.querySelector('.nav-toggle').getAttribute('aria-expanded') === 'true'), 'Mobiles Menü öffnet sich');
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => !document.getElementById('site-nav').classList.contains('is-open') && document.activeElement.classList.contains('nav-toggle')), 'Mobiles Menü schließt mit Escape, Fokus zurück auf der Schaltfläche');
  await page.setViewportSize({ width: 1280, height: 900 });

  /* 3. Sprachwechsel führt auf dieselbe Seite in der anderen Sprache */
  await go(`${config.deviceDir.de}/${devices[1].id}.html`);
  await page.click('.site-nav .lang-switch a[lang="ar"]');
  await page.waitForLoadState('networkidle');
  expect(page.url().endsWith(`${config.deviceDir.ar}/${devices[1].id}.html`) && (await page.evaluate(() => document.documentElement.dir)) === 'rtl', 'Sprachwechsel Deutsch → Arabisch bleibt auf demselben Gerät (RTL)', 'Sprachwechsel fehlerhaft: ' + page.url());
  await page.click('.site-nav .lang-switch a[lang="en"]');
  await page.waitForLoadState('networkidle');
  expect(page.url().endsWith(`${config.deviceDir.en}/${devices[1].id}.html`), 'Sprachwechsel Arabisch → Englisch', 'Sprachwechsel fehlerhaft: ' + page.url());

  /* 4. Geräte-Wissen: Suche, Filter, Lernfortschritt */
  await page.evaluate(() => localStorage.clear());
  await go(config.pages.devices.de);
  const visible = () => page.locator('.device-card:not([hidden])').count();
  const total = await visible();
  expect(total === devices.length, `Übersicht zeigt alle ${total} Geräte`, `Übersicht zeigt ${total} statt ${devices.length} Geräte`);
  await page.fill('#device-search', 'ultra');
  await page.waitForTimeout(300);
  let n = await visible();
  expect(n > 0 && n < total, `Suche "ultra" → ${n} Geräte`, `Suche "ultra" liefert ${n}`);
  expect(/q=ultra/.test(page.url()), 'Suchbegriff steht in der Adresse');
  await page.fill('#device-search', 'MRI');
  await page.waitForTimeout(300);
  n = await visible();
  expect(n >= 1, `Sprachübergreifende Suche "MRI" auf der deutschen Seite → ${n} Gerät(e)`, 'Sprachübergreifende Suche findet nichts');
  await page.fill('#device-search', 'xyzxyz');
  await page.waitForTimeout(300);
  expect(await page.locator('#empty-state:not([hidden])').count(), 'Leerer Suchzustand wird angezeigt');
  await page.click('#empty-state [data-filter-reset]');
  expect((await visible()) === total, 'Filter zurücksetzen zeigt wieder alle Geräte');
  await page.locator('#category-chips .chip').nth(2).click();
  n = await visible();
  expect(n > 0 && n < total && /cat=/.test(page.url()), `Kategorie-Filter → ${n} Geräte, Kategorie steht in der Adresse`, `Kategorie-Filter zeigt ${n}`);
  expect((await page.locator('#category-chips .chip[aria-pressed="true"]').count()) === 1, 'Genau ein Filter-Chip ist als aktiv markiert');
  const langHref = await page.getAttribute('.site-nav .lang-switch a[lang="en"]', 'href');
  expect(/cat=/.test(langHref), 'Sprachlink übernimmt den aktiven Filter');
  await go(config.pages.devices.de + '?cat=therapy#cat-therapy');
  n = await visible();
  expect(n > 0 && n < total, `Direktlink mit ?cat=therapy filtert (${n} Geräte)`, 'Direktlink mit ?cat= filtert nicht');
  if (problems.length) fail('Übersicht: ' + problems.join(' | '));

  await go(`${config.deviceDir.de}/${devices[0].id}.html`);
  expect((await page.locator('.device-section').count()) >= 4, 'Detailseite zeigt die Abschnitte');
  await page.click('#learn-toggle');
  expect((await page.getAttribute('#learn-toggle', 'aria-pressed')) === 'true', 'Gerät als gelernt markiert');
  await go(config.pages.devices.de);
  const progress = (await page.textContent('#progress-text')).trim();
  expect(/\b1\b/.test(progress), 'Lernfortschritt in der Übersicht: ' + progress, 'Lernfortschritt falsch: ' + progress);
  expect((await page.locator('.device-card--learned').count()) === 1, 'Gelernte Karte ist markiert');
  const cont = await page.getAttribute('#progress-continue', 'href');
  expect(cont && cont.indexOf(devices[1].id) !== -1, '"Weiter mit" zeigt auf das nächste ungelernte Gerät');
  await page.click('#progress-reset');
  expect((await page.locator('.device-card--learned').count()) === 0, 'Fortschritt zurücksetzen');
  if (problems.length) fail('Lernfortschritt: ' + problems.join(' | '));

  /* 5. Glossar */
  await go(config.pages.glossary.de);
  const terms = await page.locator('.glossary-entry:not([hidden])').count();
  await page.fill('#glossary-search', 'doppler');
  await page.waitForTimeout(300);
  n = await page.locator('.glossary-entry:not([hidden])').count();
  expect(terms > 20 && n > 0 && n < terms, `Glossar: ${terms} Begriffe, Suche "doppler" → ${n}`, `Glossar-Suche fehlerhaft (${terms}/${n})`);

  /* 6. Kontaktformular */
  await go(config.pages.contact.de);
  await page.click('#contact-form button[type="submit"]');
  n = await page.locator('.field.is-invalid').count();
  expect(n >= 3, `Formular markiert ${n} fehlende Pflichtfelder`, `Formular markiert nur ${n} Felder`);
  expect(await page.evaluate(() => document.activeElement.id === 'cf-name'), 'Fokus springt zum ersten fehlerhaften Feld');
  await page.fill('#cf-name', 'Test Person');
  await page.fill('#cf-email', 'keine-mail');
  await page.fill('#cf-message', 'Hallo');
  await page.check('#cf-consent');
  await page.click('#contact-form button[type="submit"]');
  expect(await page.locator('#cf-email[aria-invalid="true"]').count(), 'Ungültige E-Mail-Adresse wird erkannt');
  await page.fill('#cf-email', 'test@example.com');
  await page.click('#contact-form button[type="submit"]');
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => !document.getElementById('form-success').hidden && document.getElementById('contact-form').hidden), 'Erfolgsmeldung nach dem Absenden');
  const real = problems.filter((p) => !/mailto|scheme/i.test(p));
  if (real.length) fail('Kontakt: ' + real.join(' | '));

  /* 7. Ohne JavaScript: Inhalte und Navigation vorhanden */
  const noJs = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const plain = await noJs.newPage();
  await plain.goto(`${BASE}/${config.deviceDir.ar}/${devices[0].id}.html`);
  const plainInfo = await plain.evaluate(() => ({ sections: document.querySelectorAll('.device-section').length, nav: !!document.querySelector('.nojs-nav a'), dir: document.documentElement.dir }));
  expect(plainInfo.sections >= 4 && plainInfo.nav && plainInfo.dir === 'rtl', 'Ohne JavaScript: arabische Detailseite vollständig lesbar, Navigation vorhanden');
  await noJs.close();

  await browser.close();
  if (failures) {
    console.error(`\n${failures} Problem(e) gefunden.`);
    process.exit(1);
  }
  console.log('\nBrowser-Test bestanden.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
