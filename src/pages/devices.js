'use strict';
/* Geräte-Wissen: Übersicht mit Suche, Kategorie-Filter und Lernfortschritt */
const { esc, icon, inlineSvgFile } = require('../ui');
const { ctaBand } = require('../partials');
const { deviceCard } = require('../portal');

module.exports = {
  render(ctx) {
    const { t, text, href, data, L } = ctx;
    const total = data.devices.length;
    const countLabel = (n) => (n === 1 ? t('devices.resultsOne') : t('devices.resultsCount', { count: n }));

    const chips = data.categories
      .map((cat) => {
        const count = data.devices.filter((d) => d.category === cat.id).length;
        return `<button type="button" class="chip" data-cat="${esc(cat.id)}" aria-pressed="false"><span class="chip__icon">${inlineSvgFile(cat.icon)}</span><span>${esc(L(cat).name)}</span><span class="visually-hidden"> (${count})</span></button>`;
      })
      .join('\n          ');

    let cardIndex = 0;
    const blocks = data.categories
      .map((cat) => {
        const c = L(cat);
        const devices = data.devices.filter((d) => d.category === cat.id);
        if (!devices.length) return '';
        return `<section class="category-block" id="cat-${esc(cat.id)}" data-cat="${esc(cat.id)}" aria-labelledby="cat-title-${esc(cat.id)}">
          <div class="category-block__head">
            <span class="card__icon card__icon--primary">${inlineSvgFile(cat.icon)}</span>
            <div>
              <h2 id="cat-title-${esc(cat.id)}">${esc(c.name)} <span class="category-block__count" data-count>${countLabel(devices.length)}</span></h2>
              <p>${esc(c.description || c.short)}</p>
            </div>
          </div>
          <div class="device-grid">
            ${devices.map((d) => deviceCard(ctx, d, { eager: cardIndex++ < 3 })).join('\n            ')}
          </div>
        </section>`;
      })
      .join('\n        ');

    const first = data.devices[0];

    const main = `    <section class="hero hero--compact">
      <div class="container hero__inner hero__inner--portal">
        <div>
          <span class="eyebrow">${t('devices.hero.eyebrow')}</span>
          <h1 class="hero__title">${t('devices.hero.title')}</h1>
          <p class="hero__text">${t('devices.hero.subtitle')}</p>
          <form class="search" role="search" id="device-search-form" action="${href('devices')}" method="get">
            <label for="device-search" class="visually-hidden">${t('devices.searchLabel')}</label>
            ${icon('search', 'search__icon')}
            <input id="device-search" name="q" type="search" autocomplete="off" enterkeyhint="search" placeholder="${t('devices.searchPlaceholder')}">
            <button type="button" class="search__clear" id="device-search-clear" aria-label="${t('devices.clearSearch')}">${icon('x')}</button>
          </form>
          <p class="hero__links"><a class="link-arrow" href="${href('glossary')}">${icon('book')}${t('glossary.linkLabel')}</a></p>
          <noscript><p class="noscript-note">${t('devices.noscript')}</p></noscript>
        </div>
        <div id="progress-card" class="progress-card" data-total="${total}">
          <div class="progress-card__head">
            <strong id="progress-title">${t('devices.progress.title')}</strong>
            <span id="progress-text" class="muted">${t('devices.progress.text', { done: 0, total })}</span>
          </div>
          <div class="progress-bar" id="progress-bar" role="progressbar" aria-labelledby="progress-title" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="0"><div class="progress-bar__fill" id="progress-fill"></div></div>
          <p class="progress-card__foot">
            <span>${t('devices.progress.hint')}</span>
            <button type="button" class="link-button" id="progress-reset" hidden>${t('devices.progress.reset')}</button>
          </p>
          <a class="link-arrow progress-card__continue" id="progress-continue" href="${ctx.deviceHref(first.id)}"><span>${t('devices.progress.continue', { name: L(first).name })}</span>${icon('arrow-right', 'icon--flip')}</a>
        </div>
      </div>
    </section>

    <div class="filter-bar">
      <div class="container">
        <div id="category-chips" class="chips" role="group" aria-label="${t('devices.filterLabel')}">
          <button type="button" class="chip" data-cat="" aria-pressed="true">${icon('grid')}<span>${t('devices.allCategories')}</span><span class="chip__count">${total}</span></button>
          ${chips}
        </div>
      </div>
    </div>

    <section class="section section--tight portal" aria-label="${t('devices.hero.title')}">
      <div class="container">
        <p id="results-summary" class="results-summary" hidden>
          <strong id="results-count"></strong>
          <button type="button" class="link-button" data-filter-reset>${t('devices.resetFilters')}</button>
        </p>
        <p id="device-results-status" class="visually-hidden" role="status"></p>

        <div id="device-results">
        ${blocks}
        </div>

        <div id="empty-state" class="empty-state" hidden>
          <h2>${t('devices.noResults')}</h2>
          <p>${t('devices.noResultsHint')}</p>
          <button type="button" class="btn btn--secondary" data-filter-reset>${icon('refresh')} ${t('devices.resetFilters')}</button>
        </div>
      </div>
    </section>

${ctaBand(ctx, { title: t('devices.detail.procurementCtaTitle'), text: t('devices.detail.procurementCtaText'), button: t('devices.detail.procurementCtaButton') })}`;

    return {
      title: text('meta.pages.devices.title'),
      description: text('meta.pages.devices.description'),
      main,
      strings: {
        countOne: text('devices.resultsOne'),
        countMany: text('devices.resultsCount'),
        noResults: text('devices.noResults'),
        progressText: text('devices.progress.text'),
        progressContinue: text('devices.progress.continue'),
        progressDone: text('devices.progress.done')
      }
    };
  }
};
