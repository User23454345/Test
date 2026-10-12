#!/usr/bin/env node
/*
 * Browser-Smoke-Test mit Playwright (Chromium).
 * Öffnet alle Seiten in allen Sprachen, prüft Konsolenfehler, fehlgeschlagene
 * Anfragen, fehlende Übersetzungsschlüssel, RTL-Umschaltung und die
 * wichtigsten Interaktionen (Suche, Filter, Detailseite, Formular, Menü).
 *
 * Voraussetzung: ein lokaler Webserver, z. B.  npx http-server -p 8080 .
 * Aufruf:        node tools/smoke-test.js [baseUrl] [screenshotDir]
 */
const path = require("path");
const fs = require("fs");

let playwright;
try {
  playwright = require("playwright");
} catch (e) {
  try {
    playwright = require("/opt/node22/lib/node_modules/playwright");
  } catch (e2) {
    console.error("Playwright nicht gefunden. Installieren mit: npm i -D playwright");
    process.exit(1);
  }
}

const BASE = process.argv[2] || "http://127.0.0.1:8080";
const SHOTS = process.argv[3] || "";
const LANGS = ["de", "en", "ar"];
const PAGES = ["index.html", "ueber-uns.html", "medizintechnik.html", "geraete.html", "geraet.html?id=ultrasound", "kontakt.html", "impressum.html", "datenschutz.html"];

let failures = 0;
function fail(msg) {
  failures++;
  console.error("✗ " + msg);
}
function ok(msg) {
  console.log("✓ " + msg);
}

(async () => {
  const browser = await playwright.chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const problems = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") problems.push(`${msg.type()}: ${msg.text()}`);
  });
  page.on("pageerror", (err) => problems.push("pageerror: " + err.message));
  page.on("requestfailed", (req) => problems.push("requestfailed: " + req.url()));
  page.on("response", (res) => {
    if (res.status() >= 400) problems.push(`HTTP ${res.status()}: ${res.url()}`);
  });

  async function checkPage(url, lang) {
    problems.length = 0;
    await page.goto(`${BASE}/${url}${url.includes("?") ? "&" : "?"}lang=${lang}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    const info = await page.evaluate(() => {
      const html = document.documentElement;
      const missing = [];
      document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        if (el.textContent.trim() === key) missing.push(key);
      });
      const untranslatedAttrs = [];
      document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
        el.getAttribute("data-i18n-attr").split(";").forEach((pair) => {
          const [attr, key] = pair.split(":").map((s) => s.trim());
          if (attr && key && el.getAttribute(attr) === key) untranslatedAttrs.push(key);
        });
      });
      const hasHScroll = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
      return {
        lang: html.getAttribute("lang"),
        dir: html.getAttribute("dir"),
        title: document.title,
        missing,
        untranslatedAttrs,
        hasHScroll,
        h1: (document.querySelector("h1") || {}).textContent || "",
        pressed: (document.querySelector("[data-lang][aria-pressed='true']") || {}).getAttribute ? document.querySelector("[data-lang][aria-pressed='true']").getAttribute("data-lang") : null
      };
    });
    const label = `${url} [${lang}]`;
    if (info.lang !== lang) fail(`${label}: html[lang] = ${info.lang}`);
    if (info.dir !== (lang === "ar" ? "rtl" : "ltr")) fail(`${label}: html[dir] = ${info.dir}`);
    if (info.pressed !== lang) fail(`${label}: Sprachumschalter zeigt ${info.pressed}`);
    if (info.missing.length) fail(`${label}: unübersetzte Schlüssel: ${info.missing.join(", ")}`);
    if (info.untranslatedAttrs.length) fail(`${label}: unübersetzte Attribute: ${info.untranslatedAttrs.join(", ")}`);
    if (info.hasHScroll) fail(`${label}: horizontales Scrollen auf Desktop`);
    if (!info.h1.trim()) fail(`${label}: keine H1`);
    if (problems.length) fail(`${label}: ${problems.join(" | ")}`);
    else ok(`${label}: "${info.title}"`);
    if (SHOTS) {
      fs.mkdirSync(SHOTS, { recursive: true });
      await page.screenshot({ path: path.join(SHOTS, `${url.replace(/[?=.&]/g, "_")}-${lang}-desktop.png`), fullPage: true });
    }
  }

  for (const lang of LANGS) {
    for (const url of PAGES) await checkPage(url, lang);
  }

  // Mobile: Layout, Menü, kein horizontales Scrollen
  await page.setViewportSize({ width: 390, height: 844 });
  for (const lang of LANGS) {
    for (const url of ["index.html", "geraete.html", "geraet.html?id=ultrasound", "kontakt.html"]) {
      problems.length = 0;
      await page.goto(`${BASE}/${url}${url.includes("?") ? "&" : "?"}lang=${lang}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(300);
      const hScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      if (hScroll) fail(`${url} [${lang}] mobil: horizontales Scrollen`);
      else ok(`${url} [${lang}] mobil: kein horizontales Scrollen`);
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${url.replace(/[?=.&]/g, "_")}-${lang}-mobile.png`), fullPage: true });
    }
  }
  // Mobiles Menü
  await page.goto(`${BASE}/index.html`, { waitUntil: "networkidle" });
  await page.click(".nav-toggle");
  const navOpen = await page.evaluate(() => document.getElementById("site-nav").classList.contains("is-open") && document.querySelector(".nav-toggle").getAttribute("aria-expanded") === "true");
  navOpen ? ok("Mobiles Menü öffnet sich") : fail("Mobiles Menü öffnet sich nicht");
  await page.keyboard.press("Escape");
  const navClosed = await page.evaluate(() => !document.getElementById("site-nav").classList.contains("is-open"));
  navClosed ? ok("Mobiles Menü schließt mit Escape") : fail("Mobiles Menü schließt nicht mit Escape");

  // Sprachwechsel per Klick (ohne Neuladen)
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${BASE}/index.html`, { waitUntil: "networkidle" });
  await page.click('[data-lang="ar"]');
  await page.waitForTimeout(400);
  const afterSwitch = await page.evaluate(() => ({
    dir: document.documentElement.dir,
    h1: document.querySelector("h1").textContent,
    stored: localStorage.getItem("medny.lang"),
    link: document.querySelector('.site-nav__list a[href*="ueber-uns"]').getAttribute("href")
  }));
  if (afterSwitch.dir === "rtl" && afterSwitch.stored === "ar" && /lang=ar/.test(afterSwitch.link) && /[؀-ۿ]/.test(afterSwitch.h1)) ok("Sprachwechsel auf Arabisch: RTL, gespeichert, Links lokalisiert");
  else fail("Sprachwechsel auf Arabisch fehlerhaft: " + JSON.stringify(afterSwitch));
  await page.click('[data-lang="de"]');
  await page.waitForTimeout(300);

  // Geräte-Übersicht: Suche & Filter
  problems.length = 0;
  await page.goto(`${BASE}/geraete.html`, { waitUntil: "networkidle" });
  await page.waitForSelector(".device-card");
  const totalCards = await page.locator(".device-card").count();
  totalCards > 0 ? ok(`Geräte-Übersicht zeigt ${totalCards} Karten`) : fail("Geräte-Übersicht leer");
  await page.fill("#device-search", "ultra");
  await page.waitForTimeout(400);
  const searchCards = await page.locator(".device-card").count();
  searchCards > 0 && searchCards < totalCards ? ok(`Suche "ultra" filtert auf ${searchCards} Karten`) : fail(`Suche liefert ${searchCards} Karten`);
  await page.fill("#device-search", "xyzxyz");
  await page.waitForTimeout(400);
  const empty = await page.locator(".empty-state").count();
  empty ? ok("Leerer Suchzustand wird angezeigt") : fail("Kein leerer Suchzustand");
  await page.click(".empty-state button");
  await page.waitForTimeout(300);
  const chips = await page.locator(".chip").count();
  chips > 1 ? ok(`${chips - 1} Kategorie-Chips`) : fail("Keine Kategorie-Chips");
  await page.locator(".chip").nth(1).click();
  await page.waitForTimeout(300);
  const catUrl = page.url();
  /cat=/.test(catUrl) ? ok("Kategorie-Filter in URL: " + catUrl.split("?")[1]) : fail("Kategorie-Filter nicht in URL");
  const catCards = await page.locator(".device-card").count();
  catCards > 0 && catCards < totalCards ? ok(`Kategorie-Filter zeigt ${catCards} Karten`) : fail(`Kategorie-Filter zeigt ${catCards} Karten`);
  if (problems.length) fail("Geräte-Übersicht: " + problems.join(" | "));

  // Detailseite: Als gelernt markieren
  problems.length = 0;
  await page.locator(".device-card h3 a").first().click();
  await page.waitForSelector("#device-content .device-section");
  const sections = await page.locator("#device-content .device-section").count();
  sections >= 4 ? ok(`Detailseite zeigt ${sections} Abschnitte`) : fail(`Detailseite zeigt nur ${sections} Abschnitte`);
  await page.click("#device-hero button");
  const learnedStored = await page.evaluate(() => localStorage.getItem("medny.learned"));
  learnedStored && learnedStored !== "[]" ? ok("Gelernt-Markierung gespeichert: " + learnedStored) : fail("Gelernt-Markierung nicht gespeichert");
  await page.goto(`${BASE}/geraete.html`, { waitUntil: "networkidle" });
  const progress = await page.locator("#progress-text").textContent();
  /1/.test(progress) ? ok("Lernfortschritt: " + progress.trim()) : fail("Lernfortschritt falsch: " + progress);
  await page.goto(`${BASE}/geraet.html?id=gibt-es-nicht`, { waitUntil: "networkidle" });
  const nf = await page.locator("#device-hero h1").textContent();
  nf.trim() ? ok("Unbekannte Geräte-ID: " + nf.trim()) : fail("Unbekannte Geräte-ID ohne Hinweis");
  if (problems.length) fail("Detailseite: " + problems.join(" | "));

  // Kontaktformular: Validierung
  problems.length = 0;
  await page.goto(`${BASE}/kontakt.html`, { waitUntil: "networkidle" });
  await page.click('#contact-form button[type="submit"]');
  const invalid = await page.locator(".field.is-invalid").count();
  invalid >= 3 ? ok(`Formular-Validierung markiert ${invalid} Felder`) : fail(`Formular-Validierung markiert nur ${invalid} Felder`);
  await page.fill("#cf-name", "Test Person");
  await page.fill("#cf-email", "keine-mail");
  await page.fill("#cf-message", "Hallo");
  await page.check("#cf-consent");
  await page.click('#contact-form button[type="submit"]');
  const emailInvalid = await page.locator("#cf-email[aria-invalid='true']").count();
  emailInvalid ? ok("Ungültige E-Mail wird erkannt") : fail("Ungültige E-Mail nicht erkannt");
  await page.fill("#cf-email", "test@example.com");
  await page.click('#contact-form button[type="submit"]');
  await page.waitForTimeout(400);
  const successShown = await page.evaluate(() => !document.getElementById("form-success").hidden && document.getElementById("contact-form").hidden);
  successShown ? ok("Erfolgsmeldung nach Absenden") : fail("Keine Erfolgsmeldung nach Absenden");
  if (problems.filter((p) => !/mailto/.test(p)).length) fail("Kontakt: " + problems.join(" | "));

  await browser.close();
  if (failures) {
    console.error(`\n${failures} Problem(e) gefunden.`);
    process.exit(1);
  }
  console.log("\nSmoke-Test bestanden.");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
