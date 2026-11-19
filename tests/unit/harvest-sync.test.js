import { test } from "node:test";
import assert from "node:assert/strict";
import {
  syncInput,
  captureId,
  payloadDigest,
} from "../../server/modules/harvest/sync-domain.js";

const input = {
  schemaVersion: 1,
  parcelId: "ABCDEF00-0000-4000-8000-000000000001",
  harvestedAt: "2026-01-02T07:00:00-05:00",
  quantity: "37.1",
  unit: "kg",
};
test("sync canoniza UUID/instante/decimal sin modificar el contenido confirmado", () => {
  const a = syncInput.parse(input);
  const b = syncInput.parse({
    unit: "kg",
    quantity: "37.100",
    harvestedAt: "2026-01-02T12:00:00.000Z",
    parcelId: input.parcelId.toLowerCase(),
    schemaVersion: 1,
  });
  assert.deepEqual(a, b);
  assert.equal(a.quantity, "37.100");
  assert.equal(payloadDigest(a), payloadDigest(b));
  assert.notEqual(
    payloadDigest(a),
    payloadDigest({ ...a, quantity: "38.000" }),
  );
  assert.equal(captureId.parse(input.parcelId), input.parcelId.toLowerCase());
});
test("sync rechaza precisión extra, futuro, campos privados y versiones no soportadas", () => {
  for (const extra of [
    { quantity: "37.1000" },
    { quantity: "0" },
    { quantity: "-1" },
    { quantity: "1000000000" },
    { quantity: 37.1 },
    { unit: "g" },
    { harvestedAt: "2026-01-02T12:00Z" },
    { harvestedAt: "2026-01-02T12:00:00.0001Z" },
    { harvestedAt: "2026-01-02T12:00:00" },
    { harvestedAt: "2099-01-02T12:00:00Z" },
    { actorId: crypto.randomUUID() },
    { organizationId: crypto.randomUUID() },
    { schemaVersion: 2 },
  ])
    assert.equal(
      syncInput.safeParse({ ...input, ...extra }).success,
      false,
      JSON.stringify(extra),
    );
  assert.equal(
    syncInput.parse({ ...input, quantity: "999999999.999" }).quantity,
    "999999999.999",
  );
  assert.equal(
    syncInput.parse({ ...input, quantity: "0.001", unit: "unidad" }).quantity,
    "0.001",
  );
});

test("sync acepta solo cantidades ASCII completas, sin espacios o terminadores", () => {
  for (const quantity of [
    "1\n",
    "1\r",
    "1\u2028",
    "1\u2029",
    " 1",
    "1 ",
    "01",
    "+1",
    "1e2",
    "١٢.٣",
    "１２.３",
  ])
    assert.equal(
      syncInput.safeParse({ ...input, quantity }).success,
      false,
      JSON.stringify(quantity),
    );
});
