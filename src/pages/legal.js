'use strict';
/* Impressum und Datenschutzerklärung: Abschnitte kommen vollständig aus data/i18n/<sprache>.json */
const { esc } = require('../ui');
const { pageHero, notice } = require('../partials');

function legalPage(key) {
  return {
    render(ctx) {
      const { t, text, list } = ctx;
      const sections = list(key + '.sections')
        .map((s) => `<h2>${esc(ctx.fill(s.title))}</h2>
          <p class="pre-line">${esc(ctx.fill(s.text))}</p>`)
        .join('\n\n          ');

      const main = `${pageHero({ title: t(key + '.title') })}

    <section class="section">
      <div class="container">
        ${ctx.placeholders[key] ? notice(`<p>${t(key + '.placeholderNote')}</p>`, { variant: 'warning', cls: 'notice--narrow notice--spaced' }) : ''}
        <div class="prose">
          ${sections}
        </div>
      </div>
    </section>`;

      return {
        title: text('meta.pages.' + key + '.title'),
        description: text('meta.pages.' + key + '.description'),
        robots: 'noindex,follow',
        main
      };
    }
  };
}

module.exports = { imprint: legalPage('imprint'), privacy: legalPage('privacy') };
