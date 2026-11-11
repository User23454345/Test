'use strict';
/* Geräte-Wissen: Detailseite eines Geräts */
const { esc, icon } = require('../ui');
const { ctaBand } = require('../partials');

module.exports = {
  render(ctx, device) {
    const { t, text, href, asset, data, L } = ctx;
    const d = L(device);
    const cat = data.categories.find((c) => c.id === device.category);
    const catName = cat ? L(cat).name : '';
    const catHref = href('devices', { query: 'cat=' + device.category, hash: 'cat-' + device.category });

    // Lernpfad: alle Geräte in Reihenfolge der Kategorien – "Weiter" führt auch in die nächste Kategorie.
    const index = data.devices.indexOf(device);
    const prev = index > 0 ? data.devices[index - 1] : null;
    const next = index < data.devices.length - 1 ? data.devices[index + 1] : null;
    const siblings = data.devices.filter((x) => x.category === device.category);

    const sections = [];
    const section = (id, iconName, titleKey, body) =>
      sections.push({
        id,
        title: t(titleKey),
        html: `<section class="device-section" id="${id}" aria-labelledby="${id}-title">
            <h2 id="${id}-title">${icon(iconName)}${t(titleKey)}</h2>
            ${body}
          </section>`
      });

    section('how', 'cog', 'devices.detail.how', (d.how || []).map((para) => `<p>${esc(para)}</p>`).join('\n            '));
    section('use', 'target', 'devices.detail.use', `<ul class="check-list" role="list">
              ${(d.use || []).map((u) => `<li>${esc(u)}</li>`).join('\n              ')}
            </ul>`);
    if (d.facts && d.facts.length) {
      section('facts', 'list', 'devices.detail.facts', `<dl class="facts">
              ${d.facts.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd></div>`).join('\n              ')}
            </dl>`);
    }
    if (d.procurement && d.procurement.length) {
      section('procurement', 'cart', 'devices.detail.procurement', `<ol class="tip-list" role="list">
              ${d.procurement.map((tip) => `<li>${esc(tip)}</li>`).join('\n              ')}
            </ol>`);
    }
    if (d.glossary && d.glossary.length) {
      section('glossary', 'book', 'devices.detail.glossary', `<dl class="glossary">
              ${d.glossary.map((g) => `<div><dt>${esc(g.term)}</dt><dd>${esc(g.text)}</dd></div>`).join('\n              ')}
            </dl>
            <p class="section-more"><a class="link-arrow" href="${href('glossary')}">${t('glossary.linkLabel')}${icon('arrow-right', 'icon--flip')}</a></p>`);
    }

    const pagerLink = (dev, cls, labelKey) => {
      if (!dev) return '';
      const otherCat = dev.category !== device.category ? data.categories.find((c) => c.id === dev.category) : null;
      return `<a class="${cls}" href="${ctx.deviceHref(dev.id)}"${cls === 'pager__next' ? ' rel="next"' : ' rel="prev"'}>
            <span class="pager__label">${t(labelKey)}</span>
            <span class="pager__title">${esc(L(dev).name)}</span>${otherCat ? `\n            <span class="pager__meta">${esc(L(otherCat).name)}</span>` : ''}
          </a>`;
    };

    const main = `    <section class="device-hero">
      <div class="container">
        <nav aria-label="${t('nav.breadcrumb')}">
          <ol class="breadcrumb">
            <li><a href="${href('devices')}">${t('nav.devices')}</a></li>
            <li><a href="${catHref}">${esc(catName)}</a></li>
            <li aria-current="page">${esc(d.name)}</li>
          </ol>
        </nav>
        <div class="device-hero__inner">
          <div>
            <p class="eyebrow">${esc(catName)} · ${t('devices.detail.position', { current: index + 1, total: data.devices.length })}</p>
            <h1 class="hero__title">${esc(d.name)}</h1>
            <p class="device-hero__subtitle">${esc(d.subtitle)}</p>
            <p class="hero__text">${esc(d.short)}</p>
            <div class="device-hero__actions">
              <button type="button" class="btn btn--secondary learn-toggle" id="learn-toggle" data-device-id="${esc(device.id)}" data-learned="false">
                <span class="when-off">${icon('bookmark')}${t('devices.detail.markLearned')}</span>
                <span class="when-on">${icon('bookmark-check')}${t('devices.detail.markedLearned')}</span>
              </button>
              <a class="btn btn--ghost" href="${href('devices')}">${icon('arrow-left', 'icon--flip')}${t('devices.detail.backToOverview')}</a>
            </div>
          </div>
          <figure class="device-hero__media">
            <img src="${asset(device.image)}" alt="${t('devices.detail.imageAlt', { name: d.name })}" width="320" height="240" fetchpriority="high">
            <figcaption>${t('devices.detail.imageNote')}</figcaption>
          </figure>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="device-layout">
          <aside class="device-aside" aria-label="${t('devices.detail.asideLabel')}">
            <nav class="aside-box aside-box--toc" aria-labelledby="toc-title">
              <h2 id="toc-title">${t('devices.detail.onThisPage')}</h2>
              <ul role="list">
                ${sections.map((s) => `<li><a href="#${s.id}">${s.title}</a></li>`).join('\n                ')}
              </ul>
            </nav>
            <nav class="aside-box aside-box--related" aria-labelledby="related-title">
              <h2 id="related-title">${t('devices.detail.related')}</h2>
              <ul role="list">
                ${siblings
                  .map((s) => `<li><a href="${ctx.deviceHref(s.id)}" data-device-id="${esc(s.id)}"${s === device ? ' aria-current="page"' : ''}>${esc(L(s).name)}<span class="badge badge--success badge--icon" hidden>${icon('check')}<span class="visually-hidden">${t('devices.detail.markedLearned')}</span></span></a></li>`)
                  .join('\n                ')}
              </ul>
            </nav>
          </aside>
          <div class="device-main">
          ${sections.map((s) => s.html).join('\n          ')}
          </div>
        </div>
        <nav class="pager" aria-label="${t('devices.detail.pagerLabel')}">
          ${pagerLink(prev, 'pager__prev', 'devices.detail.prev')}
          ${pagerLink(next, 'pager__next', 'devices.detail.next')}
        </nav>
      </div>
    </section>

${ctaBand(ctx, { title: t('devices.detail.procurementCtaTitle'), text: t('devices.detail.procurementCtaText'), button: t('devices.detail.procurementCtaButton') })}`;

    const title = text('meta.pages.device.title', { name: d.name });
    const jsonLd = [];
    if (ctx.baseUrl) {
      jsonLd.push({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: d.name,
        description: d.short,
        inLanguage: ctx.lang,
        image: ctx.baseUrl + '/' + device.image,
        mainEntityOfPage: ctx.absUrl(ctx.file),
        articleSection: catName,
        author: { '@type': 'Organization', name: ctx.site.company.name, url: ctx.baseUrl + '/' },
        publisher: { '@type': 'Organization', name: ctx.site.company.name, url: ctx.baseUrl + '/' }
      });
      jsonLd.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: text('nav.devices'), item: ctx.absUrl(ctx.pageFile('devices')) },
          { '@type': 'ListItem', position: 2, name: catName, item: ctx.absUrl(ctx.pageFile('devices')) + '?cat=' + device.category },
          { '@type': 'ListItem', position: 3, name: d.name }
        ]
      });
    }

    return { title, description: d.short, main, ogType: 'article', jsonLd };
  }
};
