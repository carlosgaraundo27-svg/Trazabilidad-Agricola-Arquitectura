import test from "node:test";
import assert from "node:assert/strict";
import {
  kgInput,
  balances,
  eligible,
  admissionInput,
  transportInput,
  departureInput,
} from "../../server/modules/logistics/domain.js";

test("logística conserva cantidades exactas de cualquier lote sin descontar entrega dos veces", () => {
  assert.equal(kgInput.parse("73.125"), "73.125");
  const totals = {
    admitted: "73.125",
    reserved: "73.125",
    reservation_released: "0",
    dispatched: "73.125",
    delivered: "73.125",
  };
  assert.deepEqual(balances(totals), {
    admittedKg: "73.125",
    onHandKg: "0.000",
    reservedKg: "0.000",
    unreservedKg: "0.000",
    inTransitKg: "0.000",
    deliveredKg: "73.125",
  });
  assert.equal(
    balances({ ...totals, dispatched: "0", delivered: "0" }).onHandKg,
    "73.125",
  );
  assert.equal(
    balances({
      ...totals,
      dispatched: "0",
      delivered: "0",
      reservation_released: "73.125",
    }).unreservedKg,
    "73.125",
  );
  assert.throws(() => balances({ ...totals, dispatched: "146.250" }));
  assert.throws(() =>
    balances({
      ...totals,
      reserved: "146.250",
      dispatched: "0",
      delivered: "0",
    }),
  );
});
test("solo closed/accepted habilita la condición de Calidad, sin autorización de despacho implícita", () => {
  assert.equal(
    eligible({ evaluationState: "closed", qualityResult: "accepted" }),
    true,
  );
  for (const summary of [
    null,
    {},
    { evaluationState: "draft", qualityResult: "accepted" },
    { evaluationState: "closed", qualityResult: "observed" },
    { evaluationState: "closed", qualityResult: "rejected" },
  ])
    assert.equal(eligible(summary), false);
});
test("contratos logísticos rechazan redondeo, cantidades arbitrarias y campos privados ajenos", () => {
  assert.equal(
    departureInput.safeParse({
      expectedVersion: 1,
      expectedInventoryVersion: 1,
      departedAt: "2026-01-02T20:00:00.123456Z",
    }).success,
    false,
  );
  assert.equal(
    departureInput.safeParse({
      expectedVersion: 1,
      expectedInventoryVersion: 1,
      departedAt: "2026-01-02T20:00:00.123Z",
    }).success,
    true,
  );
  for (const value of ["0", "-1", "1e3", "NaN", "1.0001", 1000])
    assert.equal(kgInput.safeParse(value).success, false);
  assert.equal(
    transportInput.parse({ guideReference: " demo-gr-001 " }).guideReference,
    "DEMO-GR-001",
  );
  assert.equal(
    transportInput.safeParse({ driverName: "Ficticio", dni: "privado" })
      .success,
    false,
  );
  assert.equal(
    admissionInput.safeParse({
      lotId: crypto.randomUUID(),
      verifiedKg: "73.125",
      reference: "ACTUAL",
      evidenceRef: "Constancia física",
      onHandKg: "1000",
    }).success,
    false,
  );
});
