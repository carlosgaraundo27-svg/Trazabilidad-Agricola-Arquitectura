import { test } from "node:test";
import assert from "node:assert/strict";
import {
  receiptInput,
  measurement,
  localHarvestDate,
} from "../../server/modules/intake/domain.js";
import {
  compatibleOrigins,
  lotInput,
} from "../../server/modules/traceability/domain.js";

const preLotId = "50000000-0000-4000-8000-000000000001";
const centerId = "60000000-0000-4000-8000-000000000001";
const input = {
  centerId,
  preLotId,
  reference: " T-1 ",
  grossKg: "0.3",
  tareKg: "0.1",
  evidence: "Ticket ficticio",
};
test("pesaje exacto, normalización y diferencia conservada", () => {
  const parsed = receiptInput.parse(input);
  assert.equal(parsed.reference, "T-1");
  assert.equal(parsed.grossKg, "0.300");
  assert.deepEqual(measurement(parsed, { quantity: "0.250", unit: "kg" }), {
    netKg: "0.200",
    differenceKg: "-0.050",
    reviewReason: "quantity_difference",
  });
  assert.equal(
    measurement(parsed, { quantity: "0.200", unit: "kg" }).reviewReason,
    null,
  );
  assert.deepEqual(
    measurement(parsed, { quantity: "20.000", unit: "unidad" }),
    {
      netKg: "0.200",
      differenceKg: null,
      reviewReason: "different_unit",
    },
  );
});
test("rechaza mediciones inválidas, neto enviado y redondeo implícito", () => {
  for (const change of [
    { tareKg: "0.300" },
    { tareKg: "-1" },
    { grossKg: "0" },
    { grossKg: "NaN" },
    { grossKg: "1.0001" },
    { grossKg: "1000000000" },
    { netKg: "0.200" },
    { grossKg: 0.3 },
  ])
    assert.equal(
      receiptInput.safeParse({ ...input, ...change }).success,
      false,
    );
  assert.equal(
    measurement(
      receiptInput.parse({ ...input, grossKg: "999999999.999", tareKg: "0" }),
      { unit: "kg", quantity: "1.000" },
    ).netKg,
    "999999999.999",
  );
});
test("fecha de cosecha local fija en Lima, incluso cerca de medianoche UTC", () => {
  assert.equal(localHarvestDate("2026-01-03T02:30:00Z"), "2026-01-02");
  assert.equal(localHarvestDate("2026-01-02T21:30:00-05:00"), "2026-01-02");
  assert.equal(localHarvestDate("2026-01-03T05:00:00Z"), "2026-01-03");
});
test("compatibilidad exige todos los ámbitos y no acepta IDs duplicados", () => {
  const origin = {
    organizationId: "o",
    centerId: "c",
    producerId: "p",
    parcelId: "r",
    localHarvestDate: "2026-01-02",
  };
  assert.equal(compatibleOrigins([origin, { ...origin }]), true);
  for (const field of Object.keys(origin))
    assert.equal(
      compatibleOrigins([origin, { ...origin, [field]: "different" }]),
      false,
    );
  assert.equal(
    lotInput.safeParse({ centerId, receiptIds: [preLotId, preLotId] }).success,
    false,
  );
  assert.equal(
    lotInput.safeParse({ centerId, receiptIds: [preLotId], amountKg: "0.1" })
      .success,
    false,
  );
});
