'use strict';
/* Fehlerseite (404) – dreisprachig, weil die Sprache des Besuchers hier unbekannt ist */
const { esc } = require('../ui');

module.exports = {
  render(ctx) {
    const blocks = ctx.config.langs
      .map((l) => `<div class="notfound__block" lang="${l.code}" dir="${l.dir}">
          <h${l.code === ctx.lang ? '1 class="hero__title"' : '2'}>${ctx.tIn(l.code, 'notFound.title')}</h${l.code === ctx.lang ? '1' : '2'}>
          <p>${ctx.tIn(l.code, 'notFound.text')}</p>
          <p><a class="btn ${l.code === ctx.lang ? 'btn--primary' : 'btn--secondary'}" href="${ctx.langHref(l.code)}">${ctx.tIn(l.code, 'notFound.button')}</a></p>
        </div>`)
      .join('\n        ');

    return {
      title: ctx.text('meta.pages.notFound.title'),
      description: ctx.text('meta.pages.notFound.description'),
      robots: 'noindex',
      main: `    <section class="section notfound">
      <div class="container">
        <p class="notfound__code" aria-hidden="true">404</p>
        ${blocks}
      </div>
    </section>`
    };
  }
};
