'use strict';
/*
 * Seitengerüst: <head>, Kopfbereich mit Navigation und Sprachumschalter, Fußbereich.
 * Jede Seitenvorlage (src/pages/*.js) liefert nur den Inhalt von <main>.
 */
const { esc, join, icon, brandMark } = require('./ui');

// Wird per <meta> gesetzt und gilt damit bei jedem Hoster. Erlaubt nur eigene Dateien, keine Inline-Skripte/-Styles.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' mailto:"
].join('; ');

function brand(ctx) {
  return `<a class="brand" href="${ctx.href('home')}" aria-label="${ctx.t('nav.logoLabel')}">
        ${brandMark()}
        <span class="brand__name" lang="en">Medny</span>
      </a>`;
}

/** Sprachumschalter. compact = Kurzform für die Kopfzeile auf schmalen Bildschirmen (dort ist das Menü eingeklappt). */
function langSwitch(ctx, compact) {
  const links = ctx.config.langs.map((l) => {
    const current = l.code === ctx.lang;
    const label = compact ? `<span aria-hidden="true">${esc(l.short || l.code.toUpperCase())}</span><span class="visually-hidden">${esc(l.label)}</span>` : esc(l.label);
    return `<a href="${ctx.langHref(l.code)}" lang="${l.code}" hreflang="${l.code}"${current ? ' aria-current="true"' : ''}>${label}</a>`;
  });
  return `<div class="lang-switch${compact ? ' lang-switch--compact' : ''}" role="group" aria-label="${ctx.t('nav.language')}">
            ${links.join('\n            ')}
          </div>`;
}

function header(ctx) {
  const { t, href, config } = ctx;
  const parent = config.navParent[ctx.pageKey];
  const items = config.nav.map((key) => {
    const current = key === ctx.pageKey ? ' aria-current="page"' : key === parent ? ' aria-current="true"' : '';
    return `<li><a href="${href(key)}"${current}>${t('nav.' + key)}</a></li>`;
  });
  return `<header class="site-header">
    <div class="container site-header__inner">
      ${brand(ctx)}
      ${langSwitch(ctx, true)}
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="${t('nav.menuOpen')}">
        ${icon('menu', 'icon-menu')}
        ${icon('x', 'icon-close')}
      </button>
      <nav id="site-nav" class="site-nav" aria-label="${t('nav.mainNavLabel')}">
        <ul class="site-nav__list">
          ${items.join('\n          ')}
        </ul>
        <div class="site-nav__actions">
          ${langSwitch(ctx)}
          <a class="btn btn--primary btn--sm" href="${href('contact')}">${t('nav.cta')}</a>
        </div>
      </nav>
    </div>
    <noscript>
      <nav class="container nojs-nav" aria-label="${t('nav.mainNavLabel')}">
        ${config.nav
          .map((key) => `<a href="${href(key)}"${key === ctx.pageKey ? ' aria-current="page"' : key === parent ? ' aria-current="true"' : ''}>${t('nav.' + key)}</a>`)
          .join('\n        ')}
      </nav>
    </noscript>
  </header>`;
}

/** Anschrift einzeilig; lateinische Adressteile bleiben auch in RTL-Seiten von links nach rechts lesbar. */
function addressLine(ctx) {
  const c = ctx.site.company;
  return `<span class="ltr">${esc(c.street)}, ${esc(c.zip)} ${esc(c.city)}</span>`;
}

function footer(ctx) {
  const { t, href, site } = ctx;
  const o = site.owner;
  const navKeys = ['home', 'about', 'medtech', 'devices', 'glossary', 'contact'];
  return `<footer class="site-footer">
    <div class="container">
      <div class="site-footer__grid">
        <div>
          ${brand(ctx)}
          <p>${t('footer.tagline')}</p>
          <p class="site-footer__disclaimer">${t('footer.disclaimer')}</p>
        </div>
        <div>
          <h2>${t('footer.navTitle')}</h2>
          <ul role="list">
            ${navKeys.map((key) => `<li><a href="${href(key)}">${t('nav.' + key)}</a></li>`).join('\n            ')}
          </ul>
        </div>
        <div>
          <h2>${t('footer.legalTitle')}</h2>
          <ul role="list">
            <li><a href="${href('imprint')}">${t('nav.imprint')}</a></li>
            <li><a href="${href('privacy')}">${t('nav.privacy')}</a></li>
          </ul>
        </div>
        <div>
          <h2>${t('footer.contactTitle')}</h2>
          <ul role="list">
            <li>${esc(o.name)}</li>
            <li><a href="mailto:${esc(o.email)}">${esc(o.email)}</a></li>
            <li><a href="tel:${esc(telHref(o.phone))}">${esc(o.phoneDisplay || o.phone)}</a></li>
            <li>${addressLine(ctx)}</li>
          </ul>
        </div>
      </div>
      <div class="site-footer__bottom">
        <span>${t('footer.copyright', { year: `<span data-year>${ctx.year}</span>` }, true)}</span>
        <span>${t('meta.tagline')}</span>
      </div>
    </div>
  </footer>`;
}

function telHref(phone) {
  return String(phone || '').replace(/[^+\d]/g, '');
}

/** <head>-Angaben für Suchmaschinen und soziale Netzwerke. Absolute Adressen nur, wenn site.json → company.url gesetzt ist. */
function seoTags(ctx, page) {
  const { text, config } = ctx;
  const tags = [];
  const noindex = page.robots && /noindex/.test(page.robots);
  if (page.robots) tags.push(`<meta name="robots" content="${esc(page.robots)}">`);
  if (ctx.baseUrl && !noindex) {
    tags.push(`<link rel="canonical" href="${esc(ctx.absUrl(ctx.file))}">`);
    config.langs.forEach((l) => tags.push(`<link rel="alternate" hreflang="${l.code}" href="${esc(ctx.absUrl(ctx.langFile(l.code)))}">`));
    tags.push(`<link rel="alternate" hreflang="x-default" href="${esc(ctx.absUrl(ctx.langFile(config.defaultLang)))}">`);
  }
  tags.push(`<meta property="og:site_name" content="${esc(text('meta.siteName'))}">`);
  tags.push(`<meta property="og:type" content="${page.ogType || 'website'}">`);
  tags.push(`<meta property="og:title" content="${esc(page.title)}">`);
  tags.push(`<meta property="og:description" content="${esc(page.description)}">`);
  tags.push(`<meta property="og:locale" content="${ctx.langInfo.ogLocale}">`);
  if (ctx.baseUrl) {
    tags.push(`<meta property="og:url" content="${esc(ctx.absUrl(ctx.file))}">`);
    tags.push(`<meta property="og:image" content="${esc(ctx.baseUrl + '/assets/img/og-image.jpg')}">`);
    tags.push('<meta property="og:image:width" content="1200">');
    tags.push('<meta property="og:image:height" content="630">');
    tags.push('<meta name="twitter:card" content="summary_large_image">');
  }
  return tags;
}

function jsonBlock(type, id, data) {
  // "<" maskieren, damit der Block nie vorzeitig geschlossen werden kann
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<script type="${type}"${id ? ` id="${id}"` : ''}>${json}</script>`;
}

/**
 * Vollständiges HTML-Dokument erzeugen.
 * page = { title, description, main, robots?, ogType?, strings?, jsonLd? }
 */
function renderDocument(ctx, page) {
  const { asset, text } = ctx;
  const strings = Object.assign(
    { menuOpen: text('nav.menuOpen'), menuClose: text('nav.menuClose') },
    page.strings || {}
  );
  const fontPreload =
    ctx.lang === 'ar'
      ? [400, 600, 700].map((w) => `<link rel="preload" href="${asset('assets/fonts/ibm-plex-sans-arabic-' + w + '.woff2')}" as="font" type="font/woff2" crossorigin>`)
      : [];
  const jsonLd = (page.jsonLd || []).map((d) => jsonBlock('application/ld+json', '', d));

  return `<!DOCTYPE html>
<!-- Automatisch erzeugt von tools/build.js – bitte nicht direkt bearbeiten. Quellen: src/ (Aufbau) und data/ (Texte). -->
<html lang="${ctx.lang}" dir="${ctx.dir}" data-page="${ctx.pageKey}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(page.title)}</title>
  <meta name="description" content="${esc(page.description)}">
  <meta http-equiv="Content-Security-Policy" content="${CSP}">
  <meta name="theme-color" content="#0b4f8a">
  ${join(seoTags(ctx, page), '\n  ')}
  <link rel="icon" href="${asset('assets/img/favicon-32.png')}" sizes="32x32" type="image/png">
  <link rel="icon" href="${asset('assets/img/favicon.svg')}" type="image/svg+xml">
  <link rel="apple-touch-icon" href="${asset('assets/img/apple-touch-icon.png')}">
  ${join(fontPreload.concat([`<link rel="stylesheet" href="${asset('css/styles.css')}">`, `<noscript><link rel="stylesheet" href="${asset('css/nojs.css')}"></noscript>`, `<script src="${asset('js/site.js')}" defer></script>`]).concat(jsonLd), '\n  ')}
</head>
<body data-page="${ctx.pageKey}">
  <a class="skip-link" href="#main">${ctx.t('nav.skipToContent')}</a>
  ${header(ctx)}

  <main id="main" tabindex="-1">
${page.main}
  </main>

  ${footer(ctx)}
  ${jsonBlock('application/json', 'site-strings', strings)}
</body>
</html>
`;
}

module.exports = { renderDocument, telHref, addressLine, CSP };
