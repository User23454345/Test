'use strict';
/* Bausteine des Lernportals: Gerätekarte, Suchindex, Glossar. */
const { esc, icon } = require('./ui');
const { normalize } = require('../js/site.js');

/**
 * Suchtext einer Gerätekarte (bereits normalisiert, wird im Browser nur noch mit der Eingabe verglichen).
 * Enthält die Texte der aktuellen Sprache sowie Namen und Stichwörter aller Sprachen,
 * damit z. B. "MRI" auch auf der deutschen Seite den MRT findet.
 */
function searchText(ctx, device) {
  const cur = ctx.L(device);
  const cat = ctx.data.categories.find((c) => c.id === device.category);
  const parts = [device.id, cur.name, cur.subtitle, cur.short].concat(cur.keywords || [], cur.use || [], (cur.glossary || []).map((g) => g.term));
  if (cat) parts.push(ctx.L(cat).name);
  Object.keys(device.i18n).forEach((lang) => {
    const other = device.i18n[lang];
    parts.push(other.name);
    (other.keywords || []).forEach((k) => parts.push(k));
  });
  const seen = new Set();
  return normalize(parts.join(' '))
    .split(' ')
    .filter((w) => w && !seen.has(w) && seen.add(w))
    .join(' ');
}

/** Karte eines Geräts in der Übersicht. eager = Bild sofort laden (erste Reihe). */
function deviceCard(ctx, device, { eager } = {}) {
  const { t, asset } = ctx;
  const d = ctx.L(device);
  return `<article class="device-card" data-id="${esc(device.id)}" data-cat="${esc(device.category)}" data-search="${esc(searchText(ctx, device))}">
              <span class="badge badge--success device-card__learned" aria-hidden="true" hidden>${icon('check')}<span>${t('devices.detail.markedLearned')}</span></span>
              <div class="device-card__media">
                <img src="${asset(device.image)}" alt="" width="320" height="240"${eager ? '' : ' loading="lazy"'} decoding="async">
              </div>
              <div class="device-card__body">
                <h3><a href="${ctx.deviceHref(device.id)}">${esc(d.name)}<span class="visually-hidden" data-learned-text hidden> – ${t('devices.detail.markedLearned')}</span></a></h3>
                <p class="device-card__subtitle">${esc(d.subtitle)}</p>
                <p>${esc(d.short)}</p>
                <span class="device-card__link" aria-hidden="true">${t('devices.openDevice')} ${icon('arrow-right', 'icon--flip')}</span>
              </div>
            </article>`;
}

/**
 * Glossar einer Sprache: Begriffe aller Geräte plus Grundbegriffe (medtech.glossary.items),
 * gleiche Begriffe zusammengeführt, alphabetisch sortiert.
 * Ergebnis: [{ term, text, devices: [geraet, …], general: bool }]
 */
function buildGlossary(lang, dict, data, warn) {
  const byKey = new Map();
  const add = (term, text, device) => {
    const key = normalize(term);
    if (!key) {
      if (warn) warn(`Glossar (${lang}): Begriff "${term}" enthält weder Buchstaben noch Ziffern und wird ausgelassen`);
      return;
    }
    let entry = byKey.get(key);
    if (!entry) {
      entry = { term, text, devices: [], general: !device };
      byKey.set(key, entry);
    }
    else if (warn && entry.text !== text) warn(`Glossar (${lang}): "${term}" ist mehrfach mit unterschiedlichem Text erklärt – im Glossar steht nur die erste Erklärung${device ? ' (abweichend: ' + device.id + ')' : ''}`);
    if (device && entry.devices.indexOf(device) === -1) entry.devices.push(device);
  };
  ((dict.medtech && dict.medtech.glossary && dict.medtech.glossary.items) || []).forEach((g) => add(g.term, g.text, null));
  data.devices.forEach((device) => {
    const d = device.i18n[lang] || {};
    (d.glossary || []).forEach((g) => add(g.term, g.text, device));
  });
  const collator = new Intl.Collator(lang, { sensitivity: 'base', numeric: true });
  // Arabisch: Der Artikel „ال" zählt beim Einsortieren nicht mit, wie in arabischen Wörterbüchern und Registern üblich.
  // Sonst stünden alle Begriffe mit Artikel gesammelt unter Alif.
  const sortKey = lang === 'ar' ? (term) => term.replace(/^ال(?=\S\S)/, '') : (term) => term;
  return Array.from(byKey.values()).sort((a, b) => collator.compare(sortKey(a.term), sortKey(b.term)) || collator.compare(a.term, b.term));
}

module.exports = { deviceCard, searchText, buildGlossary };
