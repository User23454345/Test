'use strict';
/* Glossar: alle Fachbegriffe aus dem Geräte-Wissen und den Grundlagen, alphabetisch und durchsuchbar */
const { esc, icon } = require('../ui');
const { ctaBand } = require('../partials');
const { normalize } = require('../../js/site.js');

module.exports = {
  render(ctx) {
    const { t, text, href, L } = ctx;
    const entries = ctx.glossary;

    const items = entries
      .map((e) => {
        const sources = e.devices.length
          ? `<p class="glossary-entry__sources">${t('glossary.appearsIn')} ${e.devices.map((dev) => `<a href="${ctx.deviceHref(dev.id)}">${esc(L(dev).name)}</a>`).join(t('common.listSeparator'))}</p>`
          : `<p class="glossary-entry__sources"><a href="${href('medtech')}">${t('nav.medtech')}</a></p>`;
        return `<div class="glossary-entry" data-search="${esc(normalize(e.term + ' ' + e.text))}">
            <dt>${esc(e.term)}</dt>
            <dd>${esc(e.text)}${sources}</dd>
          </div>`;
      })
      .join('\n          ');

    const main = `    <section class="hero hero--compact">
      <div class="container">
        <nav aria-label="${t('nav.breadcrumb')}">
          <ol class="breadcrumb">
            <li><a href="${href('devices')}">${t('nav.devices')}</a></li>
            <li aria-current="page">${t('nav.glossary')}</li>
          </ol>
        </nav>
        <span class="eyebrow">${t('glossary.hero.eyebrow')}</span>
        <h1 class="hero__title">${t('glossary.hero.title')}</h1>
        <p class="hero__text">${t('glossary.hero.subtitle', { count: entries.length })}</p>
        <form class="search" role="search" id="glossary-search-form" action="${href('glossary')}" method="get">
          <label for="glossary-search" class="visually-hidden">${t('glossary.searchLabel')}</label>
          ${icon('search', 'search__icon')}
          <input id="glossary-search" name="q" type="search" autocomplete="off" enterkeyhint="search" placeholder="${t('glossary.searchPlaceholder')}">
          <button type="button" class="search__clear" id="glossary-search-clear" aria-label="${t('devices.clearSearch')}">${icon('x')}</button>
        </form>
        <noscript><p class="noscript-note">${t('devices.noscript')}</p></noscript>
      </div>
    </section>

    <section class="section section--tight" aria-label="${t('glossary.hero.title')}">
      <div class="container">
        <p id="glossary-status" class="results-summary" role="status" hidden></p>
        <dl class="glossary glossary--page" id="glossary-list">
          ${items}
        </dl>
        <div id="glossary-empty" class="empty-state" hidden>
          <h2>${t('glossary.noResults')}</h2>
          <p>${t('devices.noResultsHint')}</p>
          <button type="button" class="btn btn--secondary" id="glossary-reset">${icon('refresh')} ${t('devices.resetFilters')}</button>
        </div>
      </div>
    </section>

${ctaBand(ctx, { title: t('medtech.cta.title'), text: t('medtech.cta.text'), button: t('medtech.cta.button'), target: 'devices' })}`;

    return {
      title: text('meta.pages.glossary.title'),
      description: text('meta.pages.glossary.description'),
      main,
      strings: { glossaryCount: text('glossary.count'), glossaryCountOne: text('glossary.countOne'), glossaryNone: text('glossary.noResults') }
    };
  }
};
