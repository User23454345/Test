/* ==========================================================================
   Medny – Kontaktformular (nur Frontend)
   Validiert die Eingaben und öffnet das E-Mail-Programm mit einer
   vorbereiteten Nachricht (mailto:). Kein Server, keine Datenübertragung.
   Anbindung an einen Formulardienst: siehe README.
   ========================================================================== */
(function (window, document) {
  "use strict";

  var I18N = window.MednyI18n;

  function fieldOf(input) {
    var node = input;
    while (node && node !== document.body) {
      if (node.classList && node.classList.contains("field")) return node;
      node = node.parentNode;
    }
    return null;
  }

  function setError(input, errorKey) {
    var field = fieldOf(input);
    if (!field) return;
    var msg = field.querySelector(".field__error");
    if (errorKey) {
      field.classList.add("is-invalid");
      input.setAttribute("aria-invalid", "true");
      if (msg) {
        msg.setAttribute("data-i18n", errorKey);
        msg.textContent = I18N.t(errorKey);
        if (!msg.id) msg.id = input.id + "-error";
        input.setAttribute("aria-describedby", msg.id);
      }
    } else {
      field.classList.remove("is-invalid");
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
    }
  }

  function isEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  }

  function validate(form) {
    var ok = true;
    var first = null;
    var fields = form.querySelectorAll("input, select, textarea");
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      var err = null;
      if (f.type === "checkbox") {
        if (f.required && !f.checked) err = "contact.form.errors.consent";
      } else {
        var v = f.value.trim();
        if (f.required && !v) err = "contact.form.errors.required";
        else if (f.type === "email" && v && !isEmail(v)) err = "contact.form.errors.email";
      }
      setError(f, err);
      if (err) {
        ok = false;
        if (!first) first = f;
      }
    }
    var summary = document.getElementById("form-summary");
    if (summary) summary.style.display = ok ? "none" : "block";
    if (first) first.focus();
    return ok;
  }

  function topicLabel(select) {
    var opt = select.options[select.selectedIndex];
    return opt ? opt.textContent : "";
  }

  function buildMailto(form, email) {
    var name = form.elements.name.value.trim();
    var org = form.elements.organization.value.trim();
    var mail = form.elements.email.value.trim();
    var phone = form.elements.phone.value.trim();
    var topic = topicLabel(form.elements.topic);
    var message = form.elements.message.value.trim();

    var lines = [
      I18N.t("contact.form.name") + ": " + name,
      I18N.t("contact.form.organization") + ": " + org,
      I18N.t("contact.form.email") + ": " + mail,
      I18N.t("contact.form.phone") + ": " + phone,
      I18N.t("contact.form.topic") + ": " + topic,
      "",
      message
    ];
    var subject = I18N.t("contact.form.mailSubject") + (topic ? " – " + topic : "");
    return "mailto:" + encodeURIComponent(email) + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(lines.join("\n"));
  }

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("contact-form");
    var success = document.getElementById("form-success");
    var again = document.getElementById("form-again");
    var summary = document.getElementById("form-summary");
    if (!form) return;
    form.setAttribute("novalidate", "novalidate"); // eigene Validierung; ohne JS greift die native Prüfung
    if (summary) summary.style.display = "none";

    // Fehler beim Tippen zurücksetzen
    form.addEventListener("input", function (e) {
      var t = e.target;
      if (t && fieldOf(t) && fieldOf(t).classList.contains("is-invalid")) {
        var field = fieldOf(t);
        if (t.type === "checkbox" ? t.checked : t.value.trim()) {
          if (t.type !== "email" || isEmail(t.value.trim())) setError(t, null);
        }
      }
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validate(form)) return;
      window.MednySite.load().then(function (site) {
        var email = (site.owner && site.owner.email) || "kontakt@medny.example";
        var href = buildMailto(form, email);
        form.hidden = true;
        if (success) {
          success.hidden = false;
          success.setAttribute("tabindex", "-1");
          success.focus();
        }
        window.location.href = href;
      });
    });

    if (again) {
      again.addEventListener("click", function () {
        form.reset();
        form.hidden = false;
        if (success) success.hidden = true;
        var first = form.querySelector("input");
        if (first) first.focus();
      });
    }
  });
})(window, document);
