import { test } from "node:test";
import assert from "node:assert/strict";
import {
  captureInput,
  discardPercentage,
} from "../../server/modules/intake/quality-domain.js";

const meta = {
  measuredAt: "2026-01-02T15:00:00-05:00",
  observedBy: "Responsable muestra",
  provenance: "Registro ficticio",
  method: "Método documentado",
};
const capture = () => ({
  sample: {
    reference: "M-1",
    sampledAt: meta.measuredAt,
    sampledBy: "Responsable",
    provenance: "Muestra lote",
  },
  weights: [
    { ...meta, fruitReference: "F-1", value: "210.25", unit: "g/fruto" },
  ],
  dryMatter: { ...meta, value: "23.10", unit: "%" },
  discard: { ...meta, inspectedCount: 3, discardedCount: 1, unit: "frutos" },
  temperatures: [
    {
      ...meta,
      value: "-1.50",
      unit: "°C",
      stage: "post_consolidation",
      sourceReceiptId: null,
    },
  ],
});
test("captura exacta con unidades explícitas y temperatura negativa sin umbral agrícola", () => {
  const parsed = captureInput.parse(capture());
  assert.equal(parsed.weights[0].value, "210.25");
  assert.equal(parsed.temperatures[0].value, "-1.50");
  assert.equal(parsed.dryMatter.measuredAt, "2026-01-02T20:00:00.000Z");
});
test("unidades, magnitudes y precisión inválidas no se convierten ni redondean", () => {
  for (const value of [
    "NaN",
    "Infinity",
    "1e2",
    "1,2",
    "1.001",
    "0",
    "-1",
    "1000000",
    "1\n",
  ]) {
    const c = capture();
    c.weights[0].value = value;
    assert.equal(captureInput.safeParse(c).success, false, value);
  }
  for (const unit of ["kg", "g", "mm", "frutos/caja"]) {
    const c = capture();
    c.weights[0].unit = unit;
    assert.equal(captureInput.safeParse(c).success, false);
  }
  for (const value of ["-0.01", "100.01"]) {
    const c = capture();
    c.dryMatter.value = value;
    assert.equal(captureInput.safeParse(c).success, false);
  }
});
test("conteos contradictorios, frutos duplicados, fuentes ambiguas y fechas futuras rechazados", () => {
  for (const [inspectedCount, discardedCount] of [
    [0, 0],
    [1, 2],
    [3, -1],
    [1.5, 0],
  ]) {
    const c = capture();
    Object.assign(c.discard, { inspectedCount, discardedCount });
    assert.equal(captureInput.safeParse(c).success, false);
  }
  const c = capture();
  c.weights.push({ ...c.weights[0] });
  assert.equal(captureInput.safeParse(c).success, false);
  c.weights.pop();
  c.temperatures[0].sourceReceiptId = crypto.randomUUID();
  assert.equal(captureInput.safeParse(c).success, false);
  c.temperatures[0].sourceReceiptId = null;
  c.dryMatter.measuredAt = "2999-01-01T00:00:00Z";
  assert.equal(captureInput.safeParse(c).success, false);
});
test("draft vacío conserva faltantes y porcentaje informativo usa mitad hacia arriba exacta", () => {
  assert.deepEqual(
    captureInput.parse({
      sample: null,
      weights: [],
      dryMatter: null,
      discard: null,
      temperatures: [],
    }),
    {
      sample: null,
      weights: [],
      dryMatter: null,
      discard: null,
      temperatures: [],
    },
  );
  assert.equal(discardPercentage(null), null);
  assert.equal(
    discardPercentage({ inspectedCount: 3, discardedCount: 1 }),
    "33.33",
  );
  assert.equal(
    discardPercentage({ inspectedCount: 32, discardedCount: 1 }),
    "3.13",
  );
  assert.equal(
    discardPercentage({ inspectedCount: 4, discardedCount: 0 }),
    "0.00",
  );
});
