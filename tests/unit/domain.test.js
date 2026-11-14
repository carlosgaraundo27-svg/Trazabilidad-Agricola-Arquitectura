import test from "node:test";
import assert from "node:assert/strict";
import { preLotInput } from "../../server/modules/harvest/domain.js";
import {
  producerInput,
  parcelInput,
} from "../../server/modules/producers/domain.js";
import { allowed } from "../../server/modules/access/domain.js";
test("cantidad positiva decimal y fecha con zona", () => {
  const valid = {
    parcelId: crypto.randomUUID(),
    harvestedAt: "2026-01-01T12:00:00Z",
    quantity: "12.125",
    unit: "kg",
  };
  assert.equal(preLotInput.parse(valid).quantity, "12.125");
  for (const quantity of ["0", "-1", "NaN", "1.2345", "1000000000", "1e3"])
    assert.equal(preLotInput.safeParse({ ...valid, quantity }).success, false);
  assert.equal(
    preLotInput.safeParse({ ...valid, harvestedAt: "2999-01-01T00:00:00Z" })
      .success,
    false,
  );
  assert.equal(
    preLotInput.safeParse({ ...valid, createdBy: crypto.randomUUID() }).success,
    false,
  );
});
test("coordenadas y nombre tienen límites", () => {
  assert.equal(producerInput.parse({ name: " Ana " }).name, "Ana");
  assert.equal(
    parcelInput.safeParse({
      producerId: crypto.randomUUID(),
      name: "X",
      latitude: 91,
      longitude: 0,
    }).success,
    false,
  );
});
test("roles deniegan por defecto y no heredan operaciones", () => {
  assert.equal(allowed("admin", "producer:create"), true);
  assert.equal(allowed("collector", "prelot:create"), true);
  assert.equal(allowed("admin", "prelot:create"), false);
  assert.equal(allowed("collector", "producer:create"), false);
  assert.equal(allowed("public", "producer:read"), false);
});
