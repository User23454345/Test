'use strict';
/* Kontakt: Formular (öffnet das E-Mail-Programm, kein Server), Ansprechpartner, Kontaktdaten */
const { esc, icon } = require('../ui');
const { pageHero, notice, personCard } = require('../partials');
const { telHref } = require('../layout');

module.exports = {
  render(ctx) {
    const { t, text, list, href, site } = ctx;
    const o = site.owner;
    const c = site.company;
    const topics = list('contact.form.topics');
    const req = '<span class="required-mark" aria-hidden="true">&nbsp;*</span>';

    const main = `${pageHero({ eyebrow: t('contact.hero.eyebrow'), title: t('contact.hero.title'), text: t('contact.hero.subtitle') })}

    <section class="section">
      <div class="container contact-layout">
        <div class="form-card">
          <h2>${t('contact.form.title')}</h2>
          ${notice(`<p>${t('contact.form.demoNote')}</p>`, { cls: 'notice--spaced' })}

          <form id="contact-form" class="form" action="mailto:${esc(o.email)}" method="post" enctype="text/plain" data-email="${esc(o.email)}">
            <div class="form-row form-row--2">
              <div class="field">
                <label for="cf-name">${t('contact.form.name')}${req}</label>
                <input id="cf-name" name="name" type="text" required autocomplete="name">
                <span class="field__error" id="cf-name-error">${t('contact.form.errors.required')}</span>
              </div>
              <div class="field">
                <label for="cf-org">${t('contact.form.organization')}</label>
                <input id="cf-org" name="organization" type="text" autocomplete="organization">
              </div>
            </div>
            <div class="form-row form-row--2">
              <div class="field">
                <label for="cf-email">${t('contact.form.email')}${req}</label>
                <input id="cf-email" name="email" type="email" required autocomplete="email" inputmode="email" dir="ltr">
                <span class="field__error" id="cf-email-error">${t('contact.form.errors.email')}</span>
              </div>
              <div class="field">
                <label for="cf-phone">${t('contact.form.phone')}</label>
                <input id="cf-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" dir="ltr">
              </div>
            </div>
            <div class="field">
              <label for="cf-topic">${t('contact.form.topic')}</label>
              <select id="cf-topic" name="topic">
                ${Object.keys(topics).map((key) => `<option value="${esc(key)}">${esc(topics[key])}</option>`).join('\n                ')}
              </select>
            </div>
            <div class="field">
              <label for="cf-message">${t('contact.form.message')}${req}</label>
              <textarea id="cf-message" name="message" required placeholder="${t('contact.form.messagePlaceholder')}"></textarea>
              <span class="field__error" id="cf-message-error">${t('contact.form.errors.required')}</span>
            </div>
            <div class="field field--checkbox">
              <input id="cf-consent" name="consent" type="checkbox" required>
              <label for="cf-consent">${t('contact.form.consent')} (<a href="${href('privacy')}">${t('contact.form.consentLink')}</a>)${req}</label>
              <span class="field__error" id="cf-consent-error">${t('contact.form.errors.consent')}</span>
            </div>
            <p id="form-summary" class="form__summary" role="alert" hidden>${t('contact.form.errors.summary')}</p>
            <div class="form__footer">
              <span class="form__hint">${t('contact.form.requiredHint')}</span>
              <button type="submit" class="btn btn--primary">${t('contact.form.submit')}</button>
            </div>
          </form>

          <div id="form-success" class="notice notice--success" tabindex="-1" hidden>
            ${icon('check-circle')}
            <div>
              <h3 class="notice__title">${t('contact.form.success.title')}</h3>
              <p>${t('contact.form.success.text')}</p>
              <p class="section-more"><button type="button" class="btn btn--secondary btn--sm" id="form-again">${t('contact.form.success.again')}</button></p>
            </div>
          </div>
        </div>

        <aside class="contact-side" aria-label="${t('contact.details.title')}">
          ${personCard(ctx, { headingTag: 'h2', label: t('contact.person.title') })}

          <div class="card">
            <h2 class="card__title">${t('contact.details.title')}</h2>
            <ul class="contact-list">
              <li>
                ${icon('mail')}
                <div><strong>${t('common.email')}</strong><a href="mailto:${esc(o.email)}">${esc(o.email)}</a></div>
              </li>
              <li>
                ${icon('phone')}
                <div><strong>${t('common.phone')}</strong><a href="tel:${esc(telHref(o.phone))}">${esc(o.phoneDisplay || o.phone)}</a></div>
              </li>
              <li>
                ${icon('map-pin')}
                <div><strong>${t('contact.details.addressTitle')}</strong><span class="ltr">${esc(c.name)}</span><br><span class="ltr">${esc(c.street)}</span><br><span class="ltr">${esc(c.zip)} ${esc(c.city)}</span><br>${t('common.country')}</div>
              </li>
              <li>
                ${icon('clock')}
                <div><strong>${t('common.hours')}</strong>${t('common.hoursValue')}</div>
              </li>
            </ul>
            ${ctx.placeholders.contact ? `<p class="placeholder-note">${t('contact.details.placeholderNote')}</p>` : ''}
          </div>
        </aside>
      </div>
    </section>`;

    return {
      title: text('meta.pages.contact.title'),
      description: text('meta.pages.contact.description'),
      main,
      strings: {
        errRequired: text('contact.form.errors.required'),
        errEmail: text('contact.form.errors.email'),
        errConsent: text('contact.form.errors.consent'),
        mailSubject: text('contact.form.mailSubject'),
        labelName: text('contact.form.name'),
        labelOrganization: text('contact.form.organization'),
        labelEmail: text('contact.form.email'),
        labelPhone: text('common.phone'),
        labelTopic: text('contact.form.topic')
      }
    };
  }
};
