'use strict';
/* Was ist Medizintechnik? – Definition, Bedeutung, Risikoklassen, Teilbereiche, Lebenszyklus, Begriffe */
const { esc, icon, inlineSvgFile } = require('../ui');
const { ctaBand, sectionHead, pageHero } = require('../partials');

const IMPORTANCE_ICONS = ['search', 'heart', 'activity', 'droplet', 'zap'];

module.exports = {
  render(ctx) {
    const { t, list, href, data, L } = ctx;

    const importance = list('medtech.importance.items')
      .map((item, i) => `<div class="card">
            <span class="card__icon">${icon(IMPORTANCE_ICONS[i % IMPORTANCE_ICONS.length])}</span>
            <h3>${esc(item.title)}</h3>
            <p>${esc(item.text)}</p>
          </div>`)
      .join('\n          ');

    const classes = list('medtech.classification.classes')
      .map((c) => `<div class="card class-card">
            <span class="class-card__risk">${esc(c.risk)}</span>
            <h3>${esc(c.name)}</h3>
            <p>${esc(c.text)}</p>
            <p class="class-card__examples">${esc(c.examples)}</p>
          </div>`)
      .join('\n          ');

    // Teilbereiche kommen direkt aus data/devices.json (Kategorien) – keine doppelte Pflege.
    const areas = data.categories
      .map((cat) => {
        const c = L(cat);
        return `<a class="card card--hover card--link" href="${href('devices', { query: 'cat=' + cat.id, hash: 'cat-' + cat.id })}">
            <span class="card__icon card__icon--primary">${inlineSvgFile(cat.icon)}</span>
            <h3>${esc(c.name)}</h3>
            <p>${esc(c.short)}</p>
            <span class="device-card__link">${t('medtech.areas.linkLabel')} ${icon('arrow-right', 'icon--flip')}</span>
          </a>`;
      })
      .join('\n          ');

    const lifecycle = list('medtech.lifecycle.steps')
      .map((s) => `<li><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`)
      .join('\n          ');

    const glossary = list('medtech.glossary.items')
      .map((g) => `<div><dt>${esc(g.term)}</dt><dd>${esc(g.text)}</dd></div>`)
      .join('\n          ');

    const main = `${pageHero({ eyebrow: t('medtech.hero.eyebrow'), title: t('medtech.hero.title'), text: t('medtech.hero.subtitle') })}

    <section class="section" aria-labelledby="definition-title">
      <div class="container">
        <div class="prose">
          <h2 id="definition-title" class="section-title">${t('medtech.definition.title')}</h2>
          <p>${t('medtech.definition.p1')}</p>
          <p>${t('medtech.definition.p2')}</p>
          <p>${t('medtech.definition.p3')}</p>
        </div>
      </div>
    </section>

    <section class="section section--alt" aria-labelledby="importance-title">
      <div class="container">
        ${sectionHead({ id: 'importance-title', title: t('medtech.importance.title'), lead: t('medtech.importance.intro') })}
        <div class="grid grid--3">
          ${importance}
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="classes-title">
      <div class="container">
        ${sectionHead({ id: 'classes-title', title: t('medtech.classification.title'), lead: t('medtech.classification.intro') })}
        <div class="grid grid--4">
          ${classes}
        </div>
      </div>
    </section>

    <section class="section section--alt" aria-labelledby="areas-title">
      <div class="container">
        ${sectionHead({ id: 'areas-title', title: t('medtech.areas.title'), lead: t('medtech.areas.intro') })}
        <div class="grid grid--3">
          ${areas}
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="lifecycle-title">
      <div class="container split split--top">
        <div>
          <h2 id="lifecycle-title">${t('medtech.lifecycle.title')}</h2>
          <p class="lead">${t('medtech.lifecycle.intro')}</p>
        </div>
        <ol class="timeline" role="list">
          ${lifecycle}
        </ol>
      </div>
    </section>

    <section class="section section--alt" aria-labelledby="glossary-title">
      <div class="container">
        ${sectionHead({ id: 'glossary-title', title: t('medtech.glossary.title') })}
        <dl class="glossary">
          ${glossary}
        </dl>
        <p class="section-more"><a class="btn btn--secondary" href="${href('glossary')}">${t('glossary.linkLabel')}</a></p>
      </div>
    </section>

${ctaBand(ctx, { title: t('medtech.cta.title'), text: t('medtech.cta.text'), button: t('medtech.cta.button'), target: 'devices' })}`;

    return {
      title: ctx.text('meta.pages.medtech.title'),
      description: ctx.text('meta.pages.medtech.description'),
      main
    };
  }
};
