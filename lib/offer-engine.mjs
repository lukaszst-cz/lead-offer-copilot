const SECTORS = {
  transport: {
    label: "Transport",
    required: ["trasa", "termin", "ladunek"],
    questions: {
      trasa: "Skąd i dokąd ma jechać ładunek?",
      termin: "Na kiedy potrzebny jest transport?",
      ladunek: "Jaki jest rodzaj, waga i wymiary ładunku?"
    }
  },
  services: {
    label: "Usługi",
    required: ["zakres", "lokalizacja", "termin"],
    questions: {
      zakres: "Jaki dokładnie jest zakres usługi?",
      lokalizacja: "Gdzie ma być wykonana usługa?",
      termin: "Jaki termin jest dla Państwa dogodny?"
    }
  },
  workshop: {
    label: "Warsztat",
    required: ["pojazd", "zakres", "termin"],
    questions: {
      pojazd: "Jaki to pojazd (marka, model, rok lub numer rejestracyjny)?",
      zakres: "Jakie są objawy albo jaki zakres naprawy jest potrzebny?",
      termin: "Kiedy możemy przyjąć pojazd?"
    }
  },
  beauty: {
    label: "Beauty",
    required: ["usluga", "termin"],
    questions: {
      usluga: "Z jakiej usługi chce Pani/Pan skorzystać?",
      termin: "Jaki termin i pora są najwygodniejsze?"
    }
  },
  b2b: {
    label: "B2B",
    required: ["zakres", "termin", "firma"],
    questions: {
      zakres: "Jaki jest dokładny zakres współpracy?",
      termin: "Jaki jest oczekiwany termin realizacji?",
      firma: "Dla jakiej firmy przygotowujemy ofertę?"
    }
  }
};

const clean = (value) => value.replace(/\s+/g, " ").trim();
const has = (text, expression) => expression.test(text);

function findEmail(text) {
  return text.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0] ?? "";
}

function findPhone(text) {
  return text.match(/(?:\+48[ -]?)?(?:\d[ -]?){9,11}\d/)?.[0]?.replace(/\s+/g, " ") ?? "";
}

function findDate(text) {
  return text.match(/\b(?:\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?|dziś|dzisiaj|jutro|poniedziałek|wtorek|środa|czwartek|piątek|sobota|niedziela)\b/i)?.[0] ?? "";
}

function findRoute(text) {
  const match = text.match(/(?:z|ze)\s+([^,.\n]+?)\s+(?:do|na)\s+([^,.\n]+)/i)
    ?? text.match(/([A-ZĄĆĘŁŃÓŚŹŻ][\p{L}\s-]{2,})\s*(?:→|->|–|-)\s*([A-ZĄĆĘŁŃÓŚŹŻ][\p{L}\s-]{2,})/u);
  return match ? `${clean(match[1])} → ${clean(match[2])}` : "";
}

function findCargo(text) {
  const weight = text.match(/\b\d+(?:[,.]\d+)?\s*(?:kg|t|ton(?:a|y|))\b/i)?.[0] ?? "";
  const dimensions = text.match(/\b\d+(?:[,.]\d+)?\s*[x×]\s*\d+(?:[,.]\d+)?(?:\s*[x×]\s*\d+(?:[,.]\d+)?)?\s*(?:cm|m)\b/i)?.[0] ?? "";
  const kind = text.match(/\b(?:palet[ayę]|meble|maszyn[ayę]|towar|ładunek|ADR|chłodnia|kontener)\b/i)?.[0] ?? "";
  return [kind, weight, dimensions].filter(Boolean).join(", ");
}

function extractForSector(text, sector) {
  const lower = text.toLowerCase();
  const fields = {
    email: findEmail(text),
    telefon: findPhone(text),
    termin: findDate(text)
  };

  if (sector === "transport") {
    fields.trasa = findRoute(text);
    fields.ladunek = findCargo(text);
  }
  if (sector === "services") {
    fields.zakres = has(lower, /sprząt|montaż|napraw|serwis|remont|instalac|mycie|usług/) ? "opisany w zapytaniu" : "";
    fields.lokalizacja = findRoute(text) || (text.match(/(?:w|na|do)\s+([A-ZĄĆĘŁŃÓŚŹŻ][\p{L}\s-]{2,})/u)?.[1] ?? "");
  }
  if (sector === "workshop") {
    fields.pojazd = text.match(/\b(?:[A-Z][\w-]+\s+[A-Z0-9][\w-]+|[A-Z]{2,3}\s?\d{3,5}[A-Z]{0,2})\b/)?.[0] ?? "";
    fields.zakres = has(lower, /napraw|wymian|serwis|hamul|olej|diagnost|klima|silnik/) ? "opisany w zapytaniu" : "";
  }
  if (sector === "beauty") {
    fields.usluga = text.match(/\b(?:manicure|pedicure|fryzur[ayę]|koloryzacj[aeę]|masa[żz]|zabieg|brwi|rzęsy)\b/i)?.[0] ?? "";
  }
  if (sector === "b2b") {
    fields.zakres = has(lower, /stron|crm|automatyzac|projekt|ofert|wdroż|integrac/) ? "opisany w zapytaniu" : "";
    fields.firma = text.match(/(?:firma|spółka|dla)\s+([A-ZĄĆĘŁŃÓŚŹŻ][\p{L}\d .&-]{2,})/u)?.[1] ?? "";
  }
  return fields;
}

function replyText(sector, fields, missing) {
  const label = SECTORS[sector].label.toLowerCase();
  const intro = "Dziękuję za zapytanie. Przygotowujemy wstępne informacje dotyczące realizacji.";
  const extracted = Object.entries(fields)
    .filter(([key, value]) => !["email", "telefon"].includes(key) && value)
    .map(([key, value]) => `${key}: ${value}`);
  const list = extracted.length ? ` Zebraliśmy: ${extracted.join("; ")}.` : "";
  if (!missing.length) return `${intro}${list} W kolejnym kroku prześlemy doprecyzowaną ofertę ${label}.`;
  const questions = missing.map((key) => SECTORS[sector].questions[key]).join(" ");
  return `${intro}${list} Aby przygotować właściwą ofertę, prosimy jeszcze o informację: ${questions}`;
}

export function analyzeInquiry(rawText, sector = "services") {
  const text = clean(rawText);
  if (!text) throw new Error("Wklej treść zapytania.");
  const config = SECTORS[sector] ?? SECTORS.services;
  const fields = extractForSector(text, sector);
  const missing = config.required.filter((key) => !fields[key]);
  const customer = fields.email || fields.telefon || "Do uzupełnienia";
  const summary = `${config.label}: ${missing.length ? "wymaga doprecyzowania" : "gotowe do szkicu oferty"}.`;
  return {
    sector,
    sectorLabel: config.label,
    fields,
    missing,
    summary,
    response: replyText(sector, fields, missing),
    offer: {
      status: missing.length ? "Do uzupełnienia" : "Szkic gotowy",
      title: `Oferta, ${config.label}`,
      scope: fields.zakres || fields.ladunek || fields.usluga || "Zakres po potwierdzeniu danych",
      nextStep: missing.length ? "Uzupełnić wymagane informacje" : "Wyliczyć cenę i termin"
    },
    crm: {
      status: missing.length ? "Nowe, czeka na dane" : "Nowe, gotowe do oferty",
      customer,
      approvalRequired: true
    }
  };
}

export { SECTORS };
