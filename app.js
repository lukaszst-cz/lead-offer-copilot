import { analyzeInquiry, SECTORS } from "./lib/offer-engine.mjs";

const form = document.querySelector("form");
const sector = document.querySelector("#sector");
const inquiry = document.querySelector("#inquiry");
const result = document.querySelector("#result");
const cases = document.querySelector("#cases");
const templateButtons = document.querySelectorAll("[data-template]");

const escapeHtml = (value) => String(value).replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[character]);

function savedCases() {
  return JSON.parse(localStorage.getItem("loc-demo-cases") || "[]");
}

function renderCases() {
  const entries = savedCases();
  cases.innerHTML = entries.length
    ? entries.map((item) => `<li><strong>${escapeHtml(item.sector)}</strong><span>${escapeHtml(item.status)}</span><small>${escapeHtml(item.customer)}</small></li>`).join("")
    : "<li class=\"empty\">Brak zapisanych spraw w tym urządzeniu.</li>";
}

function showResult(data) {
  const fieldRows = Object.entries(data.fields)
    .filter(([, value]) => value)
    .map(([key, value]) => `<li><span>${escapeHtml(key)}</span><strong>${escapeHtml(value)}</strong></li>`)
    .join("") || "<li><span>Brak danych do pokazania</span></li>";
  const missing = data.missing.length
    ? data.missing.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : "<li>Komplet danych wymaganych do szkicu.</li>";
  result.innerHTML = `
    <section class="card result-head"><p class="eyebrow">ANALIZA</p><h2>${escapeHtml(data.summary)}</h2><p>Przed wysłaniem każdą wiadomość zatwierdza człowiek.</p></section>
    <section class="grid">
      <article class="card"><h3>Wyciągnięte dane</h3><ul class="data-list">${fieldRows}</ul></article>
      <article class="card"><h3>Brakuje</h3><ul class="missing-list">${missing}</ul></article>
    </section>
    <section class="card"><div class="card-title"><h3>Proponowana odpowiedź</h3><button class="copy" data-copy="response">Kopiuj</button></div><p id="response">${escapeHtml(data.response)}</p></section>
    <section class="grid">
      <article class="card"><p class="eyebrow">SZKIC OFERTY</p><h3>${escapeHtml(data.offer.title)}</h3><p><b>Status:</b> ${escapeHtml(data.offer.status)}</p><p><b>Zakres:</b> ${escapeHtml(data.offer.scope)}</p><p><b>Następny krok:</b> ${escapeHtml(data.offer.nextStep)}</p></article>
      <article class="card"><p class="eyebrow">MAŁY CRM</p><h3>${escapeHtml(data.crm.status)}</h3><p><b>Kontakt:</b> ${escapeHtml(data.crm.customer)}</p><p class="approval">Wysyłka: wymaga zatwierdzenia</p><button class="primary" data-save>Zapisz sprawę lokalnie</button></article>
    </section>`;
  result.hidden = false;
  result.querySelector("[data-copy]").addEventListener("click", () => navigator.clipboard.writeText(data.response));
  result.querySelector("[data-save]").addEventListener("click", () => {
    const entries = savedCases();
    entries.unshift({ sector: data.sectorLabel, status: data.crm.status, customer: data.crm.customer });
    localStorage.setItem("loc-demo-cases", JSON.stringify(entries.slice(0, 8)));
    renderCases();
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  try { showResult(analyzeInquiry(inquiry.value, sector.value)); }
  catch (error) { document.querySelector("#error").textContent = error.message; }
});

templateButtons.forEach((button) => button.addEventListener("click", () => {
  sector.value = button.dataset.sector;
  inquiry.value = button.dataset.template;
  form.requestSubmit();
}));

Object.entries(SECTORS).forEach(([key, value]) => {
  sector.insertAdjacentHTML("beforeend", `<option value="${key}">${value.label}</option>`);
});
sector.value = "transport";
renderCases();
