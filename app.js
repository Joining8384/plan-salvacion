// =============================================================================
// CONFIG — Stats counters (PLACEHOLDER for demo)
// =============================================================================
// These numbers are hardcoded just so the church can see what the live page
// will look like. Once the Apps Script backend is set up, this whole block
// gets replaced with: fetch(STATS_ENDPOINT).then(...) → live counters.
// Edit these freely until then.
const STATS_PLACEHOLDER = {
  visits: 47,
  salvations: 6,
};
// =============================================================================

// =============================================================================
// CONFIG — Form backend
// =============================================================================
// TEMP: This Web3Forms access key sends submissions to the email on file with
// the key. After the church approves and provides their Google Apps Script
// Web App URL, replace FORM_ENDPOINT and BACKEND below. See README.md.
//
// To get a Web3Forms access key in 30 seconds:
//   1. Visit https://web3forms.com
//   2. Enter your email, click "Create Access Key"
//   3. Confirm the email Web3Forms sends you
//   4. Paste the access key here
const BACKEND = "web3forms"; // "web3forms" | "google-apps-script"
const FORM_ENDPOINT = "https://api.web3forms.com/submit";
const WEB3FORMS_ACCESS_KEY = "REPLACE_WITH_YOUR_WEB3FORMS_ACCESS_KEY";
const GOOGLE_APPS_SCRIPT_URL = ""; // filled in after church approves
// =============================================================================

const STORAGE_LANG_KEY = "plan-salvacion.lang";
const DEFAULT_LANG = "es";

function getNested(obj, path) {
  return path.split(".").reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
}

function applyTranslations(lang) {
  const t = window.TRANSLATIONS[lang];
  if (!t) return;

  document.documentElement.lang = lang;

  // <title> and <meta name="description">
  const titleEl = document.querySelector("title[data-i18n]");
  if (titleEl) titleEl.textContent = getNested(t, titleEl.dataset.i18n) || titleEl.textContent;
  const descEl = document.querySelector('meta[name="description"][data-i18n]');
  if (descEl) {
    const v = getNested(t, descEl.dataset.i18n);
    if (v) descEl.setAttribute("content", v);
  }

  // Text content via data-i18n
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    if (el.tagName === "TITLE" || el.tagName === "META") return;
    const v = getNested(t, el.dataset.i18n);
    if (v !== undefined) el.innerHTML = v;
  });

  // Attribute values via data-i18n-attr="attrName|key"
  document.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    el.dataset.i18nAttr.split(";").forEach((pair) => {
      const [attr, key] = pair.split("|").map((s) => s.trim());
      const v = getNested(t, key);
      if (v !== undefined) el.setAttribute(attr, v);
    });
  });

  // Update lang pill
  document.querySelectorAll(".lang-pill button").forEach((btn) => {
    const active = btn.dataset.lang === lang;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
}

function initLanguage() {
  const stored = localStorage.getItem(STORAGE_LANG_KEY);
  const initial = stored || DEFAULT_LANG;
  applyTranslations(initial);

  document.querySelectorAll(".lang-pill button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.dataset.lang;
      localStorage.setItem(STORAGE_LANG_KEY, lang);
      applyTranslations(lang);
    });
  });
}

function initPrayerToggle() {
  const toggle = document.getElementById("prayer-toggle");
  const wrap = document.getElementById("prayer-wrap");
  if (!toggle || !wrap) return;
  toggle.addEventListener("change", () => {
    wrap.classList.toggle("open", toggle.checked);
    if (toggle.checked) {
      setTimeout(() => document.getElementById("prayer-request")?.focus(), 200);
    }
  });
}

function showToast(message, kind) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.toggle("error", kind === "error");
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 5000);
}

function currentLang() {
  return localStorage.getItem(STORAGE_LANG_KEY) || DEFAULT_LANG;
}

function t(key) {
  return getNested(window.TRANSLATIONS[currentLang()], key);
}

function collectFormData(form) {
  const fd = new FormData(form);
  const checked = (name) => form.elements[name]?.checked === true;
  return {
    firstName: (fd.get("firstName") || "").toString().trim(),
    lastName: (fd.get("lastName") || "").toString().trim(),
    address: (fd.get("address") || "").toString().trim(),
    phone: (fd.get("phone") || "").toString().trim(),
    professionOfFaith: (fd.get("professionOfFaith") || "").toString(), // "yes" | "no" | "more-info" | ""
    wantPastorContact: checked("wantPastorContact"),
    wantAttendService: checked("wantAttendService"),
    wantMoreInfo: checked("wantMoreInfo"),
    wantPrayer: checked("wantPrayer"),
    prayerRequest: (fd.get("prayerRequest") || "").toString().trim(),
    language: currentLang(),
    submittedAt: new Date().toISOString(),
    botcheck: (fd.get("botcheck") || "").toString(),
  };
}

function professionLabel(value, lang) {
  if (!value) return "—";
  const labels = window.TRANSLATIONS[lang].form.profession;
  return { yes: labels.yes, no: labels.no, "more-info": labels.moreInfo }[value] || value;
}

function buildInterestsSummary(data, lang) {
  const labels = window.TRANSLATIONS[lang].form.interests;
  const items = [];
  if (data.wantPastorContact) items.push(labels.pastor);
  if (data.wantAttendService) items.push(labels.attend);
  if (data.wantMoreInfo) items.push(labels.info);
  if (data.wantPrayer) items.push(labels.prayer);
  return items.join(", ") || "—";
}

async function submitToWeb3Forms(data) {
  const lang = data.language;
  const interestsSummary = buildInterestsSummary(data, lang);
  const profession = professionLabel(data.professionOfFaith, lang);
  const subjectFlags = [
    data.professionOfFaith === "yes" ? " — ¡PROFESIÓN DE FE!" : "",
    data.wantPrayer ? " — petición de oración" : "",
  ].join("");
  const subject = `[Plan de Salvación] ${data.firstName} ${data.lastName}${subjectFlags}`;

  const payload = {
    access_key: WEB3FORMS_ACCESS_KEY,
    subject,
    from_name: "Plan de Salvación · IBB Grand Rapids",
    botcheck: data.botcheck,
    // Friendly labeled fields (Web3Forms shows these in the email)
    "Nombre": `${data.firstName} ${data.lastName}`,
    "Teléfono": data.phone || "—",
    "Dirección": data.address || "—",
    "Profesión de fe": profession,
    "Intereses": interestsSummary,
    "Petición de oración": data.wantPrayer ? (data.prayerRequest || "(sin texto)") : "—",
    "Idioma del visitante": lang.toUpperCase(),
    "Enviado": data.submittedAt,
  };

  const res = await fetch(FORM_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) throw new Error(json.message || `HTTP ${res.status}`);
  return json;
}

async function submitToAppsScript(data) {
  const res = await fetch(GOOGLE_APPS_SCRIPT_URL, {
    method: "POST",
    // Apps Script web apps don't accept arbitrary headers without preflight gymnastics;
    // use text/plain to keep it a "simple" request and parse JSON server-side.
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json().catch(() => ({}));
  if (json.ok === false) throw new Error(json.error || "submit failed");
  return json;
}

function initForm() {
  const form = document.getElementById("connect-form");
  const btn = document.getElementById("submit-btn");
  const btnLabel = btn.querySelector("[data-i18n]");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = collectFormData(form);

    if (data.botcheck) return; // honeypot — silently drop

    if (!data.firstName || !data.lastName) {
      showToast(t("form.validationMissing"), "error");
      return;
    }

    btn.disabled = true;
    const originalLabel = btnLabel.textContent;
    btnLabel.textContent = t("form.submitting");

    try {
      if (BACKEND === "google-apps-script" && GOOGLE_APPS_SCRIPT_URL) {
        await submitToAppsScript(data);
      } else {
        await submitToWeb3Forms(data);
      }
      form.reset();
      document.getElementById("prayer-wrap")?.classList.remove("open");
      showToast(t("form.success"));
    } catch (err) {
      console.error("Submit failed:", err);
      showToast(t("form.error"), "error");
    } finally {
      btn.disabled = false;
      btnLabel.textContent = originalLabel;
    }
  });
}

function initStats() {
  const year = new Date().getFullYear();
  const yearEl = document.getElementById("stats-year");
  if (yearEl) yearEl.textContent = year;

  const fmt = (n) => n.toLocaleString();
  const visitsEl = document.getElementById("stats-visits");
  const salvEl = document.getElementById("stats-salvations");
  if (visitsEl) visitsEl.textContent = fmt(STATS_PLACEHOLDER.visits);
  if (salvEl) salvEl.textContent = fmt(STATS_PLACEHOLDER.salvations);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("year").textContent = new Date().getFullYear();
  initLanguage();
  initStats();
  initPrayerToggle();
  initForm();
});
