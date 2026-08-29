import test from "node:test";
import assert from "node:assert/strict";
import { analyzeInquiry } from "../lib/offer-engine.mjs";

test("transport: wyciąga trasę, termin i ładunek", () => {
  const result = analyzeInquiry("Proszę o wycenę transportu z Marki do Gdańska 12.09. 6 palet, 1200 kg. kontakt@firma.pl", "transport");
  assert.equal(result.missing.length, 0);
  assert.match(result.fields.trasa, /Marki.*Gdańska/);
  assert.match(result.fields.ladunek, /1200 kg/);
  assert.equal(result.crm.approvalRequired, true);
});

test("transport: pyta o brakujące dane", () => {
  const result = analyzeInquiry("Potrzebuję transportu jutro, tel. 500 600 700", "transport");
  assert.deepEqual(result.missing, ["trasa", "ladunek"]);
  assert.match(result.response, /Skąd i dokąd/);
});

test("usługa: nie przechodzi dalej bez lokalizacji i terminu", () => {
  const result = analyzeInquiry("Interesuje mnie montaż mebli. Proszę o kontakt.", "services");
  assert.deepEqual(result.missing, ["lokalizacja", "termin"]);
  assert.equal(result.offer.status, "Do uzupełnienia");
});
