import { afterEach, expect, jest, test } from "@jest/globals";
import { preLotInput } from "../../server/modules/harvest/domain.js";
import { syncInput } from "../../server/modules/harvest/sync-domain.js";

const origin = {
  parcelId: "11111111-1111-4111-8111-111111111111",
  harvestedAt: "2026-01-01T07:00:00-05:00",
  quantity: "12.1",
  unit: "kg",
};
afterEach(() => jest.useRealTimers());

test("online y sync normalizan el mismo origen sin perder milésimos", () => {
  expect(preLotInput.parse(origin)).toEqual({
    ...origin,
    harvestedAt: "2026-01-01T12:00:00.000Z",
    quantity: "12.100",
  });
  expect(syncInput.parse({ schemaVersion: 1, ...origin })).toEqual({
    schemaVersion: 1,
    ...preLotInput.parse(origin),
  });
});

test.each(["0", "0.000", "-1", "01", "1e3", "1.0001", "1000000000", 1])(
  "cosecha y sync rechazan cantidad fuera del contrato: %s",
  (quantity) => {
    expect(preLotInput.safeParse({ ...origin, quantity }).success).toBe(false);
    expect(
      syncInput.safeParse({ schemaVersion: 1, ...origin, quantity }).success,
    ).toBe(false);
  },
);

test.each(["0.001", "999999999.999"])(
  "cosecha admite el límite positivo exacto %s",
  (quantity) => {
    expect(preLotInput.parse({ ...origin, quantity }).quantity).toBe(quantity);
    expect(
      syncInput.parse({ schemaVersion: 1, ...origin, quantity }).quantity,
    ).toBe(quantity);
  },
);

test("instante actual permitido; futuro de 1 ms rechazado en ambos contratos", () => {
  jest.useFakeTimers({ now: new Date("2026-01-01T12:00:00Z") });
  for (const schema of [preLotInput, syncInput]) {
    const input =
      schema === syncInput ? { schemaVersion: 1, ...origin } : origin;
    expect(schema.safeParse(input).success).toBe(true);
    expect(
      schema.safeParse({ ...input, harvestedAt: "2026-01-01T12:00:00.001Z" })
        .success,
    ).toBe(false);
  }
});

test("sync no redondea instantes ni acepta estado decidido por el cliente", () => {
  for (const extra of [
    { harvestedAt: "2026-01-01T12:00:00.1234Z" },
    { status: "accepted" },
    { schemaVersion: 2 },
  ]) {
    expect(
      syncInput.safeParse({ schemaVersion: 1, ...origin, ...extra }).success,
    ).toBe(false);
  }
});
