import { expect, test } from "@jest/globals";
import {
  balances,
  eligible,
  kgInput,
} from "../../server/modules/logistics/domain.js";

test.each(["0.001", "73.125", "999999999999.999"])(
  "reserva, salida y entrega conservan %s kg sin doble descuento",
  (quantity) => {
    expect(kgInput.parse(quantity)).toBe(quantity);
    const reserved = { admitted: quantity, reserved: quantity };
    expect(balances(reserved)).toMatchObject({
      onHandKg: quantity,
      reservedKg: quantity,
      unreservedKg: "0.000",
    });
    const dispatched = { ...reserved, dispatched: quantity };
    expect(balances(dispatched)).toMatchObject({
      onHandKg: "0.000",
      reservedKg: "0.000",
      inTransitKg: quantity,
    });
    expect(balances({ ...dispatched, delivered: quantity })).toEqual({
      admittedKg: quantity,
      onHandKg: "0.000",
      reservedKg: "0.000",
      unreservedKg: "0.000",
      inTransitKg: "0.000",
      deliveredKg: quantity,
    });
    expect(
      balances({ ...reserved, reservation_released: quantity }).unreservedKg,
    ).toBe(quantity);
  },
);

test.each([
  {},
  { admitted: "1", dispatched: "2" },
  { admitted: "1", reserved: "2" },
  { admitted: "1", reservation_released: "1" },
  { admitted: "1", delivered: "1" },
  { admitted: "1", delivered: "-1" },
])("inventario inconsistente se bloquea: %j", (totals) => {
  expect(() => balances(totals)).toThrow(
    expect.objectContaining({ status: 500, code: "INVENTORY_INVARIANT" }),
  );
});

test.each([
  [null, false],
  [{ evaluationState: "draft", qualityResult: "accepted" }, false],
  [{ evaluationState: "closed", qualityResult: "observed" }, false],
  [{ evaluationState: "closed", qualityResult: "rejected" }, false],
  [{ evaluationState: "closed", qualityResult: "accepted" }, true],
])("elegibilidad logística exige closed/accepted: %j", (quality, expected) => {
  expect(Boolean(eligible(quality))).toBe(expected);
});
