'use strict';
/* Wiederkehrende Seitenabschnitte, die mehrere Vorlagen verwenden. */
const { esc, icon } = require('./ui');
const { telHref } = require('./layout');

/** Abschnittskopf mit Überschrift und optionalem Einleitungstext. Texte müssen bereits escaped sein. */
function sectionHead({ id, title, lead, center }) {
  return `<div class="section-head${center ? ' section-head--center' : ''}">
          <h2${id ? ` id="${id}"` : ''}>${title}</h2>${lead ? `\n          <p class="lead">${lead}</p>` : ''}
        </div>`;
}

/** Seitenkopf der Unterseiten (Eyebrow, H1, Einleitung). */
function pageHero({ eyebrow, title, text, extra }) {
  return `    <section class="hero hero--compact">
      <div class="container">
        ${eyebrow ? `<span class="eyebrow">${eyebrow}</span>` : ''}
        <h1 class="hero__title">${title}</h1>
        ${text ? `<p class="hero__text">${text}</p>` : ''}${extra ? '\n        ' + extra : ''}
      </div>
    </section>`;
}

/** Farbiges Band mit Handlungsaufforderung am Seitenende. */
function ctaBand(ctx, { title, text, button, target }) {
  return `    <section class="cta-band" aria-labelledby="cta-title">
      <div class="container">
        <div class="cta-band__text">
          <h2 id="cta-title">${title}</h2>
          <p>${text}</p>
        </div>
        <a class="btn btn--light" href="${ctx.href(target || 'contact')}">${button}</a>
      </div>
    </section>`;
}

/** Hinweisbox. variant: '' | 'warning' | 'success'. body = fertiges HTML. */
function notice(body, { variant, iconName, cls } = {}) {
  return `<div class="notice${variant ? ' notice--' + variant : ''}${cls ? ' ' + cls : ''}">
          ${icon(iconName || 'info')}
          ${body}
        </div>`;
}

/** Karte des Ansprechpartners (Foto, Name, Rolle, optional Text und Kontaktwege). */
function personCard(ctx, { headingTag, label, bio, contacts, button, note }) {
  const { t, site, asset } = ctx;
  const o = site.owner;
  const H = headingTag || 'h3';
  return `<div class="person">
          <img class="person__photo" src="${asset(o.photo)}" width="140" height="140" alt="${t(ctx.placeholders.contact ? 'common.photoAlt' : 'common.photoAltReal', { name: o.name })}">
          <div>
            ${label ? `<p class="person__label">${label}</p>` : ''}
            <${H} class="person__name">${esc(o.name)}</${H}>
            <p class="person__role">${t('common.ownerRole')}</p>
            ${bio ? `<p>${bio}</p>` : ''}
            ${contacts ? `<ul class="person__contacts">
              <li>${icon('mail')}<a href="mailto:${esc(o.email)}">${esc(o.email)}</a></li>
              <li>${icon('phone')}<a href="tel:${esc(telHref(o.phone))}">${esc(o.phoneDisplay || o.phone)}</a></li>
            </ul>` : ''}
            ${button ? `<p class="section-more"><a class="btn btn--primary btn--sm" href="${ctx.href('contact')}">${button}</a></p>` : ''}
            ${note ? `<p class="placeholder-note">${note}</p>` : ''}
          </div>
        </div>`;
}

module.exports = { sectionHead, pageHero, ctaBand, notice, personCard };
