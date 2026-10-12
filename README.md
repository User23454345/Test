# Medny – Webseite & Lernportal

Statische, mehrsprachige Webseite (Deutsch / English / العربية mit RTL) für **Medny**, ein unabhängiges
Beratungs- und Beschaffungsunternehmen für Medizintechnik – inklusive Lernportal **„Geräte-Wissen"**
mit 28 Geräten in 7 Kategorien.

- Reines HTML / CSS / JavaScript – **kein Build-Schritt, kein Backend, kein Login**
- Alle Texte in zentralen JSON-Dateien (`data/`), leicht zu pflegen
- Mobile-first, barrierearm (Skip-Link, Tastaturbedienung, ARIA, Kontraste, `prefers-reduced-motion`)
- Keine externen Dienste, keine Fonts von Drittservern, kein Tracking (DSGVO-freundlich)

---

## 1. Starten

Die Seite lädt ihre Inhalte per `fetch()` aus JSON-Dateien. Dafür muss sie über einen **Webserver**
ausgeliefert werden (ein Doppelklick auf `index.html` im Datei-Explorer reicht nicht).

**Variante A – ohne Installation (Python ist meist vorhanden):**

```bash
cd medny
python3 -m http.server 8080
# dann im Browser: http://localhost:8080
```

**Variante B – mit Node.js:**

```bash
npx http-server -p 8080 -c-1 .
# oder nach `npm install`:  npm start
```

**Veröffentlichen:** Einfach den kompletten Ordner auf einen beliebigen statischen Host laden
(GitHub Pages, Netlify, Vercel, klassisches Webhosting per FTP). Es gibt nichts zu kompilieren.

---

## 2. Ordnerstruktur

```
├── index.html              Startseite
├── ueber-uns.html          Über uns (Leistungen, Vorgehen, Ansprechpartner)
├── medizintechnik.html     Was ist Medizintechnik?
├── geraete.html            Geräte-Wissen: Übersicht mit Suche & Filter
├── geraet.html             Geräte-Wissen: Detailseite (geraet.html?id=<geraete-id>)
├── kontakt.html            Kontakt (Formular nur Frontend)
├── impressum.html          Impressum (Platzhalter)
├── datenschutz.html        Datenschutz (Platzhalter)
│
├── css/styles.css          Gesamtes Design (Design-Tokens oben in der Datei)
├── js/
│   ├── i18n.js             Sprachumschaltung, lädt data/i18n/<lang>.json
│   ├── main.js             Navigation, Sprachumschalter, setzt data/site.json ein
│   ├── icons.js            Inline-Icons & Laden der Kategorie-Icons
│   ├── portal.js           Lernportal (Übersicht, Detailseite, Lernfortschritt, Kennzahlen)
│   └── contact.js          Formular-Validierung & mailto-Versand
│
├── data/
│   ├── i18n/de.json        ← alle Seitentexte Deutsch (Standard)
│   ├── i18n/en.json        ← alle Seitentexte Englisch
│   ├── i18n/ar.json        ← alle Seitentexte Arabisch
│   ├── site.json           ← Stammdaten: Name, E-Mail, Telefon, Adresse, Foto
│   └── devices.json        ← Lernportal: Kategorien + Geräte (DE/EN/AR inline)
│
├── assets/img/
│   ├── devices/<id>.svg    Illustration je Gerät (durch Fotos ersetzbar)
│   ├── categories/<id>.svg Icon je Kategorie
│   ├── hero.svg, logo.svg, favicon.svg, placeholder-portrait.svg
│
└── tools/
    ├── check-i18n.js       Prüft Übersetzungen & devices.json auf Vollständigkeit
    └── smoke-test.js       Browser-Test (Playwright) aller Seiten in allen Sprachen
```

---

## 3. Inhalte anpassen

### 3.1 Platzhalter ersetzen (vor Veröffentlichung)

| Was                                   | Wo                                                           |
|---------------------------------------|--------------------------------------------------------------|
| Name, Abschluss, E-Mail, Telefon      | `data/site.json` → `owner`                                   |
| Foto des Ansprechpartners             | Bild z. B. als `assets/img/portrait.jpg` ablegen und in `data/site.json` → `owner.photo` eintragen (quadratisch, ≥ 400 × 400 px) |
| Firmenanschrift                       | `data/site.json` → `company`                                 |
| Erreichbarkeit (Mo.–Fr. …)            | `data/i18n/*.json` → `common.hoursValue`                     |
| Impressum                             | `data/i18n/*.json` → `imprint.sections` **und** die statischen deutschen Texte in `impressum.html` |
| Datenschutzerklärung                  | `data/i18n/*.json` → `privacy.sections` **und** `datenschutz.html` |
| Hinweistexte „Platzhalter …"           | `about.person.placeholderNote`, `contact.details.placeholderNote`, `imprint.placeholderNote`, `privacy.placeholderNote` – Text leeren oder Absätze aus dem HTML entfernen |

Die Kontaktdaten werden per JavaScript aus `site.json` in alle Seiten eingesetzt
(Attribute `data-site`, `data-site-href`, `data-site-src`). Die deutschen Standardwerte in den
HTML-Dateien (z. B. `kontakt@medny.example`) sollten für Nutzer ohne JavaScript ebenfalls ersetzt werden
(Suchen & Ersetzen über alle `*.html`).

### 3.2 Texte ändern / übersetzen

Alle Oberflächen- und Seitentexte liegen in `data/i18n/de.json`, `en.json` und `ar.json` – **gleiche
Struktur, gleiche Schlüssel**. Im HTML referenzieren Elemente den Schlüssel:

```html
<h1 data-i18n="home.hero.title">Die richtige Medizintechnik …</h1>
<input data-i18n-attr="placeholder:devices.searchPlaceholder">
```

- Der deutsche Text im HTML ist der Fallback ohne JavaScript – bei Änderungen bitte **de.json und HTML**
  gemeinsam anpassen.
- Platzhalter wie `{count}`, `{year}` werden automatisch ersetzt und müssen in allen Sprachen bleiben.
- Prüfung auf fehlende oder überzählige Schlüssel: `node tools/check-i18n.js`

**Neue Sprache hinzufügen:** `data/i18n/<code>.json` anlegen (Kopie von `de.json`), in `js/i18n.js`
`SUPPORTED` erweitern (bei RTL-Sprachen zusätzlich `RTL_LANGS`), Button im Sprachumschalter in jeder
HTML-Datei ergänzen und in `data/devices.json` die Geräte-Texte unter `i18n.<code>` ergänzen.

### 3.3 Geräte im Lernportal pflegen

Alle Geräte stehen in `data/devices.json`. Ein Gerät sieht so aus (gekürzt):

```json
{
  "id": "ultrasound",
  "category": "imaging",
  "image": "assets/img/devices/ultrasound.svg",
  "order": 1,
  "i18n": {
    "de": {
      "name": "Ultraschallgerät (Sonografie)",
      "subtitle": "Bildgebung mit Schallwellen",
      "short": "Kurzbeschreibung …",
      "how": ["Absatz 1", "Absatz 2"],
      "use": ["Einsatzbereich 1", "…"],
      "facts": [{ "label": "Risikoklasse (MDR)", "value": "IIa" }],
      "procurement": ["Tipp 1", "…"],
      "glossary": [{ "term": "Schallkopf", "text": "…" }],
      "keywords": ["Sonografie", "Sono"]
    },
    "en": { "…": "…" },
    "ar": { "…": "…" }
  }
}
```

- **Neues Gerät:** Objekt in `devices` ergänzen (eindeutige `id`, vorhandene `category`), Bild unter
  `assets/img/devices/` ablegen, Texte in allen drei Sprachen eintragen.
- **Neue Kategorie:** Eintrag in `categories` (mit `icon` und `order`) plus Geräte mit dieser `category`.
  Für die Teilbereich-Karten auf `medizintechnik.html` die Liste `medtech.areas.items` in den i18n-Dateien
  und das HTML ergänzen.
- `keywords` verbessern die Suche (Synonyme, Abkürzungen). Die Suche durchsucht alle Sprachen gleichzeitig.
- Die Reihenfolge ergibt sich aus `order` (Kategorien) bzw. `order` innerhalb der Kategorie.

### 3.4 Bilder ersetzen

Die mitgelieferten SVG-Illustrationen sind lizenzfreie Eigenentwicklungen und als Platzhalter gedacht.

- **Gerätefotos:** Foto (z. B. JPG/WebP, Seitenverhältnis 4:3, ca. 800 × 600 px) unter
  `assets/img/devices/` ablegen und in `data/devices.json` das Feld `image` anpassen. Die Karten und die
  Detailseite skalieren das Bild automatisch (`object-fit: contain`).
- **Hero-Illustration:** `assets/img/hero.svg` austauschen oder in `index.html` den `<img src>` ändern.
- **Logo/Favicon:** `assets/img/logo.svg`, `assets/img/favicon.svg` sowie das Inline-SVG im Header und
  Footer jeder HTML-Seite (`<a class="brand">`).
- **Porträt:** siehe 3.1.

Bitte nur Bilder verwenden, für die Sie die Nutzungsrechte besitzen (z. B. eigene Fotos oder lizenzfreie
Quellen wie Unsplash/Pexels mit Lizenzhinweis).

### 3.5 Design anpassen

Farben, Radien, Schatten und Schriften sind als CSS-Variablen am Anfang von `css/styles.css` definiert
(`:root { --color-primary: … }`). Das Layout nutzt logische Eigenschaften (`margin-inline-start` usw.),
damit RTL ohne zusätzlichen Aufwand funktioniert.

Schriften: Es wird bewusst der System-Schriftstapel verwendet (schnell, datenschutzfreundlich).
Für eine eigene Schrift die Dateien lokal unter `assets/fonts/` ablegen und per `@font-face` in
`styles.css` einbinden – keine Google-Fonts-Einbindung von externen Servern.

### 3.6 Kontaktformular anbinden

Das Formular ist bewusst nur Frontend: Es validiert die Eingaben und öffnet das E-Mail-Programm des
Besuchers mit einer vorbereiteten Nachricht (`mailto:` an `owner.email` aus `site.json`).
Für einen echten Versand ohne E-Mail-Programm eignet sich ein Formulardienst (z. B. Formspree, Netlify Forms,
Web3Forms): In `js/contact.js` im `submit`-Handler statt `window.location.href = href` einen
`fetch()`-POST an den Dienst senden. Danach die Datenschutzerklärung (Abschnitt Kontaktformular) anpassen.

---

## 4. Sprachen & RTL

- Standard ist Deutsch. Die Sprache wird in dieser Reihenfolge bestimmt: URL-Parameter `?lang=en` →
  gespeicherte Auswahl (`localStorage`) → Browsersprache → Deutsch.
- Beim Umschalten werden `<html lang>` und `<html dir>` gesetzt (Arabisch: `dir="rtl"`), Titel und
  Meta-Description aktualisiert und interne Links mit `?lang=` versehen.
- Arabisch verwendet einen eigenen Schriftstapel (`--font-arabic`) und leicht größere Zeilenhöhe.
- Der Lernfortschritt („Als gelernt markieren") wird nur lokal im Browser gespeichert
  (`localStorage`, Schlüssel `medny.learned`) – keine Datenübertragung.

---

## 5. Qualitätsprüfung

```bash
node tools/check-i18n.js        # Schlüssel-Abgleich HTML ↔ de/en/ar, Vollständigkeit devices.json
npm install                     # einmalig (Playwright + http-server)
npm start                       # Server auf Port 8080 (separates Terminal)
npm test                        # Browser-Smoke-Test aller Seiten in allen Sprachen
```

Der Smoke-Test prüft Konsolenfehler, fehlende Übersetzungen, RTL-Umschaltung, horizontales Scrollen auf
Mobilgeräten, Suche/Filter, Detailseite, Lernfortschritt, mobiles Menü und die Formular-Validierung.

---

## 6. Hinweise

- **Medny ist kein Hersteller.** Dieser Hinweis ist bewusst an mehreren Stellen platziert (Hero, Über uns,
  Footer, Impressum). Bitte beibehalten.
- Die Inhalte im Geräte-Wissen sind allgemein-informativ und herstellerneutral formuliert; sie ersetzen keine
  Herstellerdokumentation. Angaben zu Risikoklassen (MDR) sind typische Einstufungen und können je nach
  Ausführung abweichen.
- Impressum und Datenschutzerklärung sind **Platzhalter** und müssen vor Veröffentlichung vervollständigt
  und rechtlich geprüft werden.
