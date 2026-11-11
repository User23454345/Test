# Medny – Webseite & Lernportal

Mehrsprachige Webseite (Deutsch / English / العربية mit RTL) für **Medny**, ein unabhängiges Beratungs- und
Beschaffungsunternehmen für Medizintechnik – mit dem Lernportal **„Geräte-Wissen"** (28 Geräte in
7 Kategorien, Glossar).

- **Statisch und schnell:** Alle Seiten liegen als fertiges HTML vor – je Sprache eine eigene Seite.
  Kein Backend, kein Login, keine externen Dienste, kein Tracking.
- **Texte zentral in JSON:** `data/` ist die einzige Quelle für Inhalte. Ein kleines Skript erzeugt daraus die Seiten.
- **Barrierearm und robust:** funktioniert ohne JavaScript, per Tastatur, auf dem Smartphone und sogar per
  Doppelklick auf `index.html`.

---

## 1. Ansehen

Am einfachsten: `index.html` im Browser öffnen (Doppelklick genügt).

Mit lokalem Webserver (entspricht dem späteren Betrieb):

```bash
python3 -m http.server 8080      # oder: npx http-server -p 8080 -c-1 .
# dann http://localhost:8080 öffnen
```

---

## 2. So funktioniert das Projekt

```
Quellen (hier wird gearbeitet)                 Erzeugte Seiten (nicht direkt bearbeiten)
──────────────────────────────                 ─────────────────────────────────────────
data/site.json        Name, Kontakt, Adresse   index.html, ueber-uns.html, medizintechnik.html,
data/i18n/de.json     alle Seitentexte Deutsch  geraete.html, glossar.html, kontakt.html,
data/i18n/en.json     … Englisch                impressum.html, datenschutz.html, 404.html
data/i18n/ar.json     … Arabisch                geraete/<geraet>.html      (28 Detailseiten)
data/devices.json     Geräte-Wissen (3 Sprachen) en/…  und  ar/…            (dieselben Seiten
src/                  Aufbau der Seiten                                     auf Englisch/Arabisch)
css/styles.css        Gestaltung                robots.txt, sitemap.xml (sobald die Adresse
css/nojs.css          nur ohne JavaScript         der Webseite eingetragen ist)
js/site.js            Menü, Suche, Formular
assets/               Bilder, Icons, Schrift
```

**Nach jeder Änderung an `data/` oder `src/` die Seiten neu erzeugen:**

```bash
node tools/build.js           # erzeugt alle Seiten (braucht nur Node.js, keine Installation von Paketen)
node tools/build.js --watch   # erzeugt bei jeder Änderung automatisch neu
node tools/check.js           # prüft Übersetzungen, Geräte-Daten, Aktualität und alle internen Links
```

Änderungen an `css/`, `js/` und `assets/` wirken sofort, ohne neu zu erzeugen.

Die erzeugten HTML-Dateien tragen oben den Hinweis „Automatisch erzeugt". Wer dort direkt etwas ändert, verliert
die Änderung beim nächsten Erzeugen – bitte immer die Quelle bearbeiten.

---

## 3. Inhalte anpassen

### 3.1 Platzhalter ersetzen (vor der Veröffentlichung)

| Was                                         | Wo                                                             |
|---------------------------------------------|----------------------------------------------------------------|
| Name, Abschluss, E-Mail, Telefon            | `data/site.json` → `owner`                                     |
| Foto des Ansprechpartners                   | Bild ablegen (z. B. `assets/img/portrait.jpg`, quadratisch, mind. 400 × 400 px) und in `data/site.json` → `owner.photo` eintragen |
| Firmenname und Anschrift                    | `data/site.json` → `company`                                   |
| Adresse der Webseite                        | `data/site.json` → `company.url`, z. B. `https://www.beispiel.de` (siehe Abschnitt 4) |
| Erreichbarkeit                              | `data/i18n/*.json` → `common.hoursValue`                       |
| Impressum                                   | `data/i18n/*.json` → `imprint.sections` (Angaben in eckigen Klammern) |
| Datenschutzerklärung                        | `data/i18n/*.json` → `privacy.sections` (Angaben in eckigen Klammern) |

Solange Beispielwerte eingetragen sind, zeigen die Seiten kleine Platzhalter-Hinweise (bei Ansprechpartner,
Kontaktdaten, Impressum und Datenschutz) und `node tools/build.js` meldet es. Die Hinweise verschwinden von selbst,
sobald echte Angaben eingetragen sind.

### 3.2 Texte ändern oder übersetzen

Alle Texte stehen in `data/i18n/de.json`, `en.json` und `ar.json` – mit **gleicher Struktur und gleichen
Schlüsseln**. Text ändern, `node tools/build.js` ausführen, fertig.

- Listen (z. B. `home.services.items`, `imprint.sections`) dürfen länger oder kürzer werden – die Seiten
  passen sich an. Die Listen müssen in allen drei Sprachen gleich lang sein.
- Platzhalter wie `{count}` oder `{name}` werden automatisch ersetzt und müssen in allen Sprachen erhalten bleiben.
- `node tools/check.js` meldet fehlende Schlüssel, ungleiche Listen und vergessene Platzhalter.
- `node tools/build.js --verbose` listet Schlüssel auf, die keine Seite mehr verwendet.

### 3.3 Geräte im Lernportal pflegen

Alle Geräte stehen in `data/devices.json`. Ein Gerät (gekürzt):

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
      "procurement": ["Hinweis 1", "…"],
      "glossary": [{ "term": "Schallkopf", "text": "…" }],
      "keywords": ["Sonografie", "Sono"]
    },
    "en": { "…": "…" },
    "ar": { "…": "…" }
  }
}
```

- **Neues Gerät:** Eintrag in `devices` ergänzen (eindeutige `id` aus Kleinbuchstaben, Ziffern und Bindestrichen;
  vorhandene `category`), Bild unter `assets/img/devices/` ablegen, Texte in allen drei Sprachen eintragen,
  Seiten neu erzeugen. Die Detailseite, die Karte in der Übersicht, der Lernpfad („Nächstes Gerät") und das
  Glossar entstehen automatisch.
- **Neue Kategorie:** Eintrag in `categories` (mit `icon` und `order`). Sie erscheint automatisch in der Übersicht,
  im Filter, auf der Startseite und unter „Was ist Medizintechnik?", sobald sie mindestens ein Gerät enthält.
- **Reihenfolge:** `order` der Kategorie, darin `order` des Geräts. Das ist zugleich der Lernpfad.
  Auf breiten Bildschirmen stehen vier Karten in einer Reihe; vier Geräte je Kategorie füllen sie genau.
- **Suche:** `keywords` ergänzen die Suche um Synonyme und Abkürzungen. Namen und Stichwörter aller Sprachen werden
  durchsucht – „MRI" findet auch auf der deutschen Seite den MRT.
- **Glossar:** entsteht aus den `glossary`-Einträgen aller Geräte und aus `medtech.glossary.items`; gleiche Begriffe
  werden zusammengeführt. Ist ein Begriff bei zwei Geräten unterschiedlich erklärt, meldet `node tools/build.js` das.
  Im Glossar steht dann nur die erste Erklärung.

### 3.4 Bilder ersetzen

Die mitgelieferten SVG-Illustrationen sind eigene, lizenzfreie Zeichnungen und als Platzhalter gedacht.

- **Gerätefotos:** Bild (JPG/WebP/PNG, Seitenverhältnis 4:3, etwa 800 × 600 px) unter `assets/img/devices/` ablegen
  und in `data/devices.json` das Feld `image` anpassen. Die Bildunterschrift „Schematische Darstellung – kein
  bestimmtes Produkt" steht in `devices.detail.imageNote` und sollte bei echten Fotos angepasst werden.
- **Startseite:** `assets/img/hero.svg` austauschen.
- **Logo:** `assets/img/logo.svg`, `assets/img/favicon.svg` und die Bildmarke in `src/ui.js` (`brandMark`).
  Die PNG-Varianten `favicon-32.png` und `apple-touch-icon.png` aus dem neuen Logo exportieren.
- **Vorschaubild für geteilte Links:** `assets/img/og-image.svg` ist die Vorlage, `og-image.jpg` (1200 × 630 px)
  die verwendete Datei.

Bitte nur Bilder verwenden, an denen Sie die Nutzungsrechte besitzen, und keine Herstellerlogos zeigen, wenn die
Herstellerneutralität betont werden soll.

### 3.5 Gestaltung anpassen

Farben, Radien, Schatten und Schriften sind als Variablen am Anfang von `css/styles.css` definiert
(`:root { --color-primary: … }`). Das Layout nutzt logische Eigenschaften (`margin-inline-start` usw.), damit
die arabische Fassung ohne Sonderregeln spiegelt.

Schrift: Deutsch und Englisch nutzen die Systemschrift des Geräts (schnell, kein Nachladen). Für Arabisch liegt
„IBM Plex Sans Arabic" lokal in `assets/fonts/` (freie Lizenz, siehe dort) und wird nur auf arabischen Seiten geladen.

### 3.6 Aufbau der Seiten ändern

Der Aufbau steht in `src/` als gut lesbare Vorlagen:

- `src/config.js` – Sprachen, Dateinamen der Seiten, Navigation
- `src/layout.js` – Kopfbereich, Navigation, Fußbereich, Angaben für Suchmaschinen
- `src/pages/*.js` – je eine Datei pro Seite (Startseite, Über uns, …, Geräte-Detailseite, Glossar)
- `src/partials.js`, `src/portal.js`, `src/ui.js` – wiederkehrende Bausteine, Lernportal, Icons

### 3.7 Kontaktformular

Das Formular arbeitet bewusst ohne Server: Es prüft die Eingaben und öffnet das E-Mail-Programm des Besuchers mit
der vorbereiteten Nachricht an `owner.email`. Es werden keine Daten an einen Server übertragen.

Für einen Versand ohne E-Mail-Programm lässt sich ein Formulardienst anbinden (z. B. Formspree, Netlify Forms,
Web3Forms): in `js/site.js` (`initContact`) statt `window.location.href = href` einen `fetch()`-Aufruf an den Dienst
senden. Dann zusätzlich

1. in `src/layout.js` die Inhaltsrichtlinie (`CSP`) um `connect-src 'self' https://<adresse-des-dienstes>` ergänzen,
2. die Datenschutzerklärung (Abschnitt Kontaktformular) anpassen.

### 3.8 Weitere Sprache

1. `data/i18n/<code>.json` anlegen (Kopie von `de.json`, übersetzen).
2. In `data/devices.json` bei jeder Kategorie und jedem Gerät `i18n.<code>` ergänzen.
3. In `src/config.js` die Sprache unter `langs` eintragen (bei Schriften von rechts nach links `dir: 'rtl'`) und
   in `pages` sowie `deviceDir` die Dateinamen ergänzen.
4. `node tools/build.js` und `node tools/check.js` ausführen.

---

## 4. Veröffentlichen

Der gesamte Projektordner kann unverändert auf jeden statischen Webspace geladen werden
(GitHub Pages, Netlify, Cloudflare Pages, klassisches Webhosting per FTP). Es gibt nichts zu installieren.

**Vorher die Adresse der Webseite eintragen:** `data/site.json` → `company.url` (z. B. `https://www.beispiel.de`,
bei einem Unterordner inklusive Pfad) und neu erzeugen. Erst dann entstehen

- kanonische Adressen und `hreflang`-Verweise zwischen den Sprachfassungen,
- `sitemap.xml` und der Verweis darauf in `robots.txt`,
- Vorschaubild und strukturierte Daten für Suchmaschinen und geteilte Links,
- korrekte Verweise auf der Fehlerseite `404.html`.

Ohne Adresse lässt der Generator diese Angaben bewusst weg, damit nie eine falsche Domain in den Seiten steht.

Impressum und Datenschutzerklärung sind von Suchmaschinen ausgenommen (`noindex`).

---

## 5. Qualitätssicherung

```bash
node tools/check.js     # Übersetzungen, Geräte-Daten, Aktualität der Seiten, interne Links und Sprungmarken
npm install             # einmalig, nur für die Browser-Tests (Playwright, axe-core, http-server)
npm start               # Webserver auf Port 8080 (eigenes Terminal)
npm test                # Browser-Test: alle Seiten in allen Sprachen und die wichtigsten Funktionen
npm run test:a11y       # Barrierefreiheit: automatische Prüfung mit axe-core (WCAG 2.2 AA)
```

Der Browser-Test prüft Konsolenfehler, Verstöße gegen die Inhaltsrichtlinie, Sprache und Leserichtung,
horizontales Scrollen (Desktop, Smartphone und sehr schmale Bildschirme mit 320 px), Menü, Sprachwechsel, Suche,
Filter, Lernfortschritt, Glossar, Kontaktformular und die Lesbarkeit ohne JavaScript.

Die Barrierefreiheitsprüfung läuft über alle Seitentypen in allen drei Sprachen, jeweils in Desktop- und
Smartphone-Breite, und zusätzlich über Zustände wie geöffnetes Menü, Suchtreffer und Formularfehler. Sie findet
technische Fehler wie zu geringen Kontrast oder fehlende Beschriftungen. Eine Prüfung mit Tastatur und
Screenreader ersetzt sie nicht.

---

## 6. Vor der Veröffentlichung bitte bestätigen

Die Texte wurden ohne Rücksprache formuliert. Folgende Aussagen kann nur der Inhaber bestätigen oder korrigieren:

- **Erstgespräch:** Ist es kostenlos und unverbindlich? Der Knopf lautet neutral „Erstgespräch vereinbaren".
- **Antwortzeit:** Soll eine Reaktionszeit zugesagt werden? Derzeit ohne Zusage.
- **Erreichbarkeit:** Stimmt „Mo.–Fr., 9–17 Uhr" (`common.hoursValue`)?
- **Vergütung und Verträge:** Arbeitet Medny ausschließlich im Auftrag der Einrichtung, und kommen Kauf- und
  Serviceverträge immer direkt zwischen Einrichtung und Anbieter zustande? Davon hängen die Aussagen
  „herstellerneutral", „kein Händler mit eigenem Sortiment" und „ausschließlich nach Ihrem Bedarf" ab.
- **Leistungsumfang und Zielgruppen:** Werden alle beschriebenen Leistungen angeboten (z. B. Koordination von
  Lieferung und Installation, Unterstützung bei Betreiberpflichten, Wartungsplanung)? Stimmen die Zielgruppen?
- **Person:** Inhaber oder Inhaberin, genaue Bezeichnung des Abschlusses, „wir" oder „ich".
- **Recht:** Impressum und Datenschutzerklärung sind Platzhalter und müssen vervollständigt und rechtlich geprüft
  werden (Rechtsform, USt-IdNr., Hosting-Anbieter, Speicherdauer der Server-Protokolle).

---

## 7. Hinweise

- **Medny ist kein Hersteller.** Dieser Hinweis steht bewusst an mehreren Stellen (Startseite, Über uns, Fußbereich,
  Impressum). Bitte beibehalten.
- Die Inhalte im Geräte-Wissen sind allgemein-informativ und herstellerneutral; sie ersetzen keine
  Herstellerdokumentation. Angaben zu Risikoklassen sind typische Einstufungen und können je nach Ausführung abweichen.
  Hinweise auf Betreiberpflichten beziehen sich auf Deutschland.
- Der Lernfortschritt („Als gelernt markieren") wird nur im Browser des Besuchers gespeichert.
- Die Seiten setzen eine strikte Inhaltsrichtlinie (Content Security Policy): Es werden ausschließlich eigene Dateien
  geladen. Wer externe Dienste einbindet (Karten, Videos, Formulare), muss sie in `src/layout.js` freigeben und in der
  Datenschutzerklärung nennen.
