'use strict';
/*
 * Zentrale Konfiguration des Seiten-Generators (tools/build.js).
 * Hier stehen Sprachen, Dateinamen der Seiten je Sprache und die Reihenfolge der Navigation.
 */
module.exports = {
  defaultLang: 'de',

  // Reihenfolge = Reihenfolge im Sprachumschalter. prefix = Unterordner der Sprache ('' = Wurzel).
  langs: [
    { code: 'de', dir: 'ltr', label: 'Deutsch', prefix: '', ogLocale: 'de_DE' },
    { code: 'en', dir: 'ltr', label: 'English', prefix: 'en/', ogLocale: 'en_GB' },
    { code: 'ar', dir: 'rtl', label: 'العربية', prefix: 'ar/', ogLocale: 'ar_AR' }
  ],

  // Ausgabedateien je Seite und Sprache (relativ zur Wurzel der Webseite).
  pages: {
    home: { de: 'index.html', en: 'en/index.html', ar: 'ar/index.html' },
    about: { de: 'ueber-uns.html', en: 'en/about.html', ar: 'ar/about.html' },
    medtech: { de: 'medizintechnik.html', en: 'en/medical-technology.html', ar: 'ar/medical-technology.html' },
    devices: { de: 'geraete.html', en: 'en/devices.html', ar: 'ar/devices.html' },
    glossary: { de: 'glossar.html', en: 'en/glossary.html', ar: 'ar/glossary.html' },
    contact: { de: 'kontakt.html', en: 'en/contact.html', ar: 'ar/contact.html' },
    imprint: { de: 'impressum.html', en: 'en/legal-notice.html', ar: 'ar/legal-notice.html' },
    privacy: { de: 'datenschutz.html', en: 'en/privacy.html', ar: 'ar/privacy.html' }
  },

  // Ordner der Geräte-Detailseiten je Sprache: <ordner>/<geraete-id>.html
  deviceDir: { de: 'geraete', en: 'en/devices', ar: 'ar/devices' },

  // Hauptnavigation (Schlüssel aus "pages"; Beschriftung aus data/i18n/<sprache>.json → nav.<schlüssel>)
  nav: ['home', 'about', 'medtech', 'devices', 'contact'],

  // Seiten, die im Menü unter "Geräte-Wissen" als aktiv markiert werden
  navParent: { device: 'devices', glossary: 'devices' },

  // Seiten ohne Suchmaschinen-Indexierung
  noindex: ['imprint', 'privacy'],

  // Statische Ordner, die unverändert ausgeliefert werden
  staticDirs: ['assets', 'css', 'js']
};
