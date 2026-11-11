'use strict';
/*
 * Gemeinsame Bausteine für die Seitenvorlagen: HTML-Escaping, Icons, Logo.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

/** HTML-Escaping für Texte und Attributwerte. */
function esc(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Liste von HTML-Fragmenten zusammenfügen (leere Einträge werden übersprungen). */
function join(list, sep) {
  return list.filter((x) => x !== null && x !== undefined && x !== false && x !== '').join(sep === undefined ? '\n' : sep);
}

// Strich-Icons (24 × 24, currentColor). Wert = Inhalt des <svg>-Elements.
const p = (d) => `<path d="${d}"/>`;
const ICONS = {
  'arrow-right': p('M5 12h14M13 6l6 6-6 6'),
  'arrow-left': p('M19 12H5M11 6l-6 6 6 6'),
  check: p('M5 12l5 5L19 7'),
  'check-circle': p('M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0zM8 12l3 3 5-6'),
  info: p('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01'),
  search: p('M21 21l-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z'),
  x: p('M18 6L6 18M6 6l12 12'),
  menu: p('M4 7h16M4 12h16M4 17h16'),
  book: p('M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z'),
  cog: p('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'),
  target: p('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'),
  list: p('M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'),
  cart: p('M3 3h2l2.6 12.4a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 7H6M9 21h.01M18 21h.01'),
  wrench: p('M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z'),
  bookmark: p('M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z'),
  'bookmark-check': p('M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2zM9 10l2 2 4-4'),
  mail: p('M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 7l-10 6L2 7'),
  phone: p('M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z'),
  'map-pin': p('M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'),
  clock: p('M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2'),
  grid: p('M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z'),
  refresh: p('M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6'),
  shield: p('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'),
  'shield-check': p('M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z') + p('M9 12l2 2 4-4'),
  graduation: p('M22 10L12 5 2 10l10 5 10-5z') + p('M6 12v5c3 3 9 3 12 0v-5'),
  'file-text': p('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z') + p('M14 2v6h6M8 13h8M8 17h5'),
  eye: p('M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z') + '<circle cx="12" cy="12" r="3"/>',
  heart: p('M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z'),
  activity: p('M22 12h-4l-3 9L9 3l-3 9H2'),
  droplet: p('M12 2.7s-6 7-6 11.3a6 6 0 0 0 12 0C18 9.7 12 2.7 12 2.7z'),
  zap: p('M13 2L3 14h9l-1 8 10-12h-9l1-8z'),
  hospital: p('M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5M12 8v4M10 10h4'),
  stethoscope: p('M6 3v6a4 4 0 0 0 8 0V3M4 3h4M12 3h4M10 13v2a5 5 0 0 0 10 0v-1') + '<circle cx="20" cy="12" r="2"/>',
  users: p('M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8'),
  flask: p('M9 3h6M10 3v6L4.5 18.5A2 2 0 0 0 6.2 21.5h11.6a2 2 0 0 0 1.7-3L14 9V3M7.5 15h9'),
  printer: p('M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z')
};

/** Inline-SVG-Icon. cls = zusätzliche CSS-Klasse (z. B. "icon--flip" für richtungsabhängige Pfeile). */
function icon(name, cls) {
  if (!ICONS[name]) throw new Error('Unbekanntes Icon: ' + name);
  return `<svg${cls ? ` class="${cls}"` : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`;
}

const fileCache = {};
/** Kategorie-Icon aus assets/img/categories/*.svg direkt einbetten (färbbar über currentColor, keine Anfrage). */
function inlineSvgFile(relPath) {
  if (!fileCache[relPath]) {
    let svg = fs.readFileSync(path.join(ROOT, relPath), 'utf8').trim();
    svg = svg.replace(/<\?xml[^>]*\?>\s*/, '').replace(/<!--[\s\S]*?-->/g, '');
    if (/<script|\son\w+=/i.test(svg)) throw new Error('SVG enthält Skripte oder Event-Attribute: ' + relPath);
    // Nur am Wurzelelement Breite/Höhe entfernen – innere Formen (z. B. <rect>) brauchen ihre Maße.
    svg = svg.replace(/<svg\b[^>]*>/, (tag) => tag.replace(/\s(width|height)="[^"]*"/g, '').replace('<svg', '<svg aria-hidden="true" focusable="false"'));
    fileCache[relPath] = svg;
  }
  return fileCache[relPath];
}

/** Medny-Logo (Bildmarke). */
function brandMark() {
  return '<svg viewBox="0 0 40 40" aria-hidden="true" focusable="false"><rect width="40" height="40" rx="10" fill="#0B4F8A"/><path d="M8 22h6l3-8 5 14 3-8h7" fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="31" cy="11" r="5.5" fill="#12A5B0"/><path d="M31 8.2v5.6M28.2 11h5.6" stroke="#FFFFFF" stroke-width="1.7" stroke-linecap="round"/></svg>';
}

module.exports = { esc, join, icon, inlineSvgFile, brandMark, ICONS };
