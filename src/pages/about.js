'use strict';
/* Über uns: Vorstellung, Werte, Leistungen, Vorgehensweise, Ansprechpartner */
const { esc, icon } = require('../ui');
const { ctaBand, sectionHead, pageHero, notice, personCard } = require('../partials');

const VALUE_ICONS = ['shield', 'graduation', 'eye', 'check-circle'];
const SERVICE_ICONS = ['search', 'list', 'cart', 'wrench'];

module.exports = {
  render(ctx) {
    const { t, list } = ctx;

    const values = list('about.values.items')
      .map((item, i) => `<div class="card">
            <span class="card__icon">${icon(VALUE_ICONS[i % VALUE_ICONS.length])}</span>
            <h3>${esc(item.title)}</h3>
            <p>${esc(item.text)}</p>
          </div>`)
      .join('\n          ');

    const services = list('about.services.items')
      .map((item, i) => `<article class="card">
            <span class="card__icon card__icon--primary">${icon(SERVICE_ICONS[i % SERVICE_ICONS.length])}</span>
            <h3>${esc(item.title)}</h3>
            <p>${esc(item.text)}</p>
            <ul class="check-list" role="list">
              ${(item.points || []).map((pt) => `<li>${esc(pt)}</li>`).join('\n              ')}
            </ul>
          </article>`)
      .join('\n          ');

    const steps = list('about.process.steps')
      .map((step, i) => `<li class="step">
            <span class="step__num" aria-hidden="true">${i + 1}</span>
            <div>
              <h3>${esc(step.title)}</h3>
              <p>${esc(step.text)}</p>
              <p class="step__deliverable"><strong>${t('about.process.deliverableLabel')}:</strong> ${esc(step.deliverable)}</p>
            </div>
          </li>`)
      .join('\n          ');

    const main = `${pageHero({ eyebrow: t('about.hero.eyebrow'), title: t('about.hero.title'), text: t('about.hero.subtitle') })}

    <section class="section" aria-labelledby="intro-title">
      <div class="container split split--top">
        <div class="prose">
          <h2 id="intro-title" class="section-title">${t('about.intro.title')}</h2>
          <p>${t('about.intro.p1')}</p>
          <p>${t('about.intro.p2')}</p>
          <p>${t('about.intro.p3')}</p>
        </div>
        ${notice(`<div>
            <h3 class="notice__title">${t('about.disclaimer.title')}</h3>
            <p>${t('about.disclaimer.text')}</p>
          </div>`, { iconName: 'shield-check' })}
      </div>
    </section>

    <section class="section section--alt" aria-labelledby="values-title">
      <div class="container">
        ${sectionHead({ id: 'values-title', title: t('about.values.title') })}
        <div class="grid grid--4">
          ${values}
        </div>
      </div>
    </section>

    <section id="leistungen" class="section" aria-labelledby="services-title">
      <div class="container">
        ${sectionHead({ id: 'services-title', title: t('about.services.title') })}
        <div class="grid grid--2">
          ${services}
        </div>
      </div>
    </section>

    <section id="vorgehen" class="section section--alt" aria-labelledby="process-title">
      <div class="container">
        ${sectionHead({ id: 'process-title', title: t('about.process.title'), lead: t('about.process.intro') })}
        <ol class="steps steps--grid" role="list">
          ${steps}
        </ol>
      </div>
    </section>

    <section id="ansprechpartner" class="section" aria-labelledby="person-title">
      <div class="container">
        ${sectionHead({ id: 'person-title', title: t('about.person.title') })}
        ${personCard(ctx, {
          bio: t('about.person.bio'),
          contacts: true,
          button: t('about.person.contactButton'),
          note: ctx.placeholders.contact ? t('about.person.placeholderNote') : ''
        })}
      </div>
    </section>

${ctaBand(ctx, { title: t('home.cta.title'), text: t('home.cta.text'), button: t('home.cta.button') })}`;

    return {
      title: ctx.text('meta.pages.about.title'),
      description: ctx.text('meta.pages.about.description'),
      main
    };
  }
};
