'use strict';
/* Startseite */
const { esc, icon, inlineSvgFile } = require('../ui');
const { ctaBand, sectionHead } = require('../partials');

const TRUST_ICONS = ['shield-check', 'graduation', 'file-text', 'check-circle'];
const SERVICE_ICONS = ['search', 'list', 'cart', 'wrench'];
const AUDIENCE_ICONS = ['hospital', 'stethoscope', 'users', 'flask'];

module.exports = {
  render(ctx) {
    const { t, list, href, asset, data, L } = ctx;

    const trust = list('home.trust.items')
      .map((item, i) => `<li class="feature">
            <span class="feature__icon">${icon(TRUST_ICONS[i % TRUST_ICONS.length])}</span>
            <div>
              <h3>${esc(item.title)}</h3>
              <p>${esc(item.text)}</p>
            </div>
          </li>`)
      .join('\n          ');

    const services = list('home.services.items')
      .map((item, i) => `<article class="card card--hover">
            <span class="card__icon card__icon--primary">${icon(SERVICE_ICONS[i % SERVICE_ICONS.length])}</span>
            <h3>${esc(item.title)}</h3>
            <p>${esc(item.text)}</p>
          </article>`)
      .join('\n          ');

    const steps = list('home.process.steps')
      .map((step, i) => `<li class="step">
            <span class="step__num" aria-hidden="true">${i + 1}</span>
            <div>
              <h3>${esc(step.title)}</h3>
              <p>${esc(step.text)}</p>
            </div>
          </li>`)
      .join('\n          ');

    const categories = data.categories
      .map((cat) => {
        const count = data.devices.filter((d) => d.category === cat.id).length;
        return `<li><a class="cat-tile" href="${href('devices', { query: 'cat=' + cat.id, hash: 'cat-' + cat.id })}">
              <span class="card__icon card__icon--primary cat-tile__icon">${inlineSvgFile(cat.icon)}</span>
              <span>
                <strong>${esc(L(cat).name)}</strong>
                <span class="cat-tile__count">${count === 1 ? t('devices.deviceCountOne') : t('devices.deviceCount', { count })}</span>
              </span>
            </a></li>`;
      })
      .join('\n            ');

    const audience = list('home.audience.items')
      .map((item, i) => `<li class="audience__item">
            <span class="card__icon">${icon(AUDIENCE_ICONS[i % AUDIENCE_ICONS.length])}</span>
            <div>
              <h3>${esc(item.title)}</h3>
              <p>${esc(item.text)}</p>
            </div>
          </li>`)
      .join('\n          ');

    const main = `    <section class="hero">
      <div class="container hero__inner hero__inner--split">
        <div>
          <span class="eyebrow">${t('home.hero.eyebrow')}</span>
          <h1 class="hero__title">${t('home.hero.title')}</h1>
          <p class="hero__text">${t('home.hero.subtitle')}</p>
          <div class="hero__actions">
            <a class="btn btn--primary" href="${href('contact')}">${t('home.hero.ctaPrimary')}</a>
            <a class="btn btn--secondary" href="${href('devices')}">${t('home.hero.ctaSecondary')}</a>
          </div>
          <p class="hero__note">
            ${icon('info')}
            <span>${t('home.hero.note')}</span>
          </p>
        </div>
        <div class="hero__media">
          <img src="${asset('assets/img/hero.svg')}" width="520" height="420" fetchpriority="high" alt="${t('home.hero.imageAlt')}">
        </div>
      </div>
    </section>

    <section class="section section--tight" aria-labelledby="trust-title">
      <div class="container">
        <h2 id="trust-title" class="visually-hidden">${t('about.values.title')}</h2>
        <ul class="features">
          ${trust}
        </ul>
      </div>
    </section>

    <section class="section section--alt" aria-labelledby="services-title">
      <div class="container">
        ${sectionHead({ id: 'services-title', title: t('home.services.title'), lead: t('home.services.intro') })}
        <div class="grid grid--4">
          ${services}
        </div>
        <p class="section-more"><a class="btn btn--secondary" href="${href('about', { hash: 'leistungen' })}">${t('home.services.more')}</a></p>
      </div>
    </section>

    <section class="section" aria-labelledby="process-title">
      <div class="container">
        ${sectionHead({ id: 'process-title', title: t('home.process.title'), lead: t('home.process.intro'), center: true })}
        <ol class="steps steps--row">
          ${steps}
        </ol>
      </div>
    </section>

    <section class="section section--alt" aria-labelledby="portal-title">
      <div class="container split">
        <div>
          <span class="eyebrow">${t('home.portal.eyebrow')}</span>
          <h2 id="portal-title">${t('home.portal.title')}</h2>
          <p class="lead">${t('home.portal.text')}</p>
          <p class="section-more"><a class="btn btn--primary" href="${href('devices')}">${t('home.portal.cta')}</a></p>
        </div>
        <div>
          <div class="stats">
            <div class="stat"><span class="stat__value">${data.categories.length}</span><span class="stat__label">${t('home.portal.statCategories')}</span></div>
            <div class="stat"><span class="stat__value">${data.devices.length}</span><span class="stat__label">${t('home.portal.statDevices')}</span></div>
            <div class="stat"><span class="stat__value">${ctx.config.langs.length}</span><span class="stat__label">${t('home.portal.statLanguages')}</span></div>
          </div>
          <ul class="cat-tiles">
            ${categories}
          </ul>
        </div>
      </div>
    </section>

    <section class="section" aria-labelledby="audience-title">
      <div class="container">
        ${sectionHead({ id: 'audience-title', title: t('home.audience.title') })}
        <ul class="audience">
          ${audience}
        </ul>
      </div>
    </section>

    <section class="section section--tight" aria-labelledby="independence-title">
      <div class="container">
        <div class="notice">
          ${icon('shield-check')}
          <div>
            <h2 id="independence-title" class="notice__title">${t('home.independence.title')}</h2>
            <p>${t('home.independence.text')}</p>
          </div>
        </div>
      </div>
    </section>

${ctaBand(ctx, { title: t('home.cta.title'), text: t('home.cta.text'), button: t('home.cta.button') })}`;

    // Strukturierte Daten für Suchmaschinen – nur mit eingetragener Adresse der Webseite und echten Kontaktdaten
    const jsonLd = [];
    if (ctx.baseUrl && !ctx.placeholders.contact) {
      const c = ctx.site.company;
      const o = ctx.site.owner;
      jsonLd.push({
        '@context': 'https://schema.org',
        '@type': 'ProfessionalService',
        name: c.name,
        legalName: c.legalName,
        description: ctx.text('meta.pages.home.description'),
        url: ctx.absUrl(ctx.file),
        logo: ctx.baseUrl + '/assets/img/logo.svg',
        image: ctx.baseUrl + '/assets/img/og-image.jpg',
        email: o.email,
        telephone: o.phone,
        address: { '@type': 'PostalAddress', streetAddress: c.street, postalCode: c.zip, addressLocality: c.city, addressCountry: c.countryCode },
        founder: { '@type': 'Person', name: o.name, jobTitle: o.degree },
        knowsLanguage: ctx.config.langs.map((l) => l.code)
      });
    }

    return {
      title: ctx.text('meta.pages.home.title'),
      description: ctx.text('meta.pages.home.description'),
      main,
      jsonLd
    };
  }
};
