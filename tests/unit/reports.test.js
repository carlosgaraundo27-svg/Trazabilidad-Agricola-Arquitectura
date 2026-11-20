import { test } from "node:test";
import assert from "node:assert/strict";
import { shipmentReportInput } from "../../server/modules/reports/domain.js";

const centerId = "60000000-0000-4000-8000-000000000001";
const input = {
  centerId,
  from: "2026-01-03T00:00:00Z",
  to: "2026-01-04T00:00:00Z",
};
test("reporte acepta instantes con zona y cursor completo sin perder milisegundos", () => {
  const parsed = shipmentReportInput.parse({
    ...input,
    from: "2026-01-02T19:00:00-05:00",
    limit: "2",
    afterDepartedAt: "2026-01-03T10:00:00.001Z",
    afterShipmentId: centerId,
  });
  assert.equal(parsed.from, "2026-01-03T00:00:00.000Z");
  assert.equal(parsed.limit, 2);
  assert.equal(parsed.afterDepartedAt, "2026-01-03T10:00:00.001Z");
  assert.equal(shipmentReportInput.parse(input).limit, 25);
});
test("reporte rechaza filtros ambiguos, rango sin límite y cursor incompleto", () => {
  for (const change of [
    { from: "0000-01-03T00:00:00Z", to: "0000-01-04T00:00:00Z" },
    { from: "2026-01-03" },
    { from: "2026-01-03T00:00:00" },
    { from: "2026-01-03T00:00:00.1234Z" },
    { to: input.from },
    { to: "2026-01-02T00:00:00Z" },
    { to: "2026-02-04T00:00:00Z" },
    { state: "draft" },
    { lotId: "otro" },
    { limit: "101" },
    { limit: "0" },
    { afterShipmentId: centerId },
    { afterDepartedAt: input.from },
    { organizationId: centerId },
    { offset: "0" },
  ])
    assert.equal(
      shipmentReportInput.safeParse({ ...input, ...change }).success,
      false,
    );
});
