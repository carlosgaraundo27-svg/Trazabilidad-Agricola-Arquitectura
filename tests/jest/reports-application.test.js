import { expect, jest, test } from "@jest/globals";
import { reportsService } from "../../server/modules/reports/application.js";
import { AppError } from "../../server/shared/errors.js";

const input = { centerId: "fiction-center", limit: 1 };
function fixture(rows = []) {
  const repository = { shipments: jest.fn(async () => rows) };
  const access = {
    requireActiveSession: jest.fn(async () => {}),
    requireCenter: jest.fn(async () => {}),
  };
  const service = reportsService({
    repository,
    access,
    unitOfWork: (work) => work({ query: async () => {} }),
  });
  return { service, repository, access };
}
test("página vacía conserva metadatos UTC y cursor nulo", async () => {
  const { service } = fixture();
  expect(await service.shipments({}, input)).toMatchObject({
    items: [],
    nextCursor: null,
    dateField: "departedAt",
    timeZone: "UTC",
    limit: 1,
  });
});
test("limit+1 decide cursor sin exponer la fila siguiente ni inventar entrega", async () => {
  const row = {
    shipmentId: "first",
    departedAt: new Date("2026-01-02T11:00:00.123Z"),
    deliveredAt: null,
    receivedKg: null,
  };
  const { service } = fixture([row, { ...row, shipmentId: "next" }]);
  const report = await service.shipments({}, input);
  expect(report.items).toEqual([
    { ...row, departedAt: "2026-01-02T11:00:00.123Z" },
  ]);
  expect(report.nextCursor).toEqual({
    departedAt: "2026-01-02T11:00:00.123Z",
    shipmentId: "first",
  });
});
test("última página convierte entrega a UTC sin generar cursor", async () => {
  const { service } = fixture([
    {
      shipmentId: "delivered",
      departedAt: new Date("2026-01-02T11:00:00Z"),
      deliveredAt: new Date("2026-01-02T12:00:00Z"),
    },
  ]);
  const report = await service.shipments({}, input);
  expect(report.items[0].deliveredAt).toBe("2026-01-02T12:00:00.000Z");
  expect(report.nextCursor).toBeNull();
});
test.each(["requireActiveSession", "requireCenter"])(
  "%s denegado impide leer filas",
  async (permission) => {
    const { service, repository, access } = fixture();
    access[permission].mockRejectedValue(
      new AppError(403, "DENIED", "Ficticio"),
    );
    await expect(service.shipments({}, input)).rejects.toMatchObject({
      code: "DENIED",
    });
    expect(repository.shipments).not.toHaveBeenCalled();
  },
);
test("timeout SQL se convierte en503 sin filtrar SQL", async () => {
  const { service, repository } = fixture();
  repository.shipments.mockRejectedValue(
    Object.assign(new Error("SQL privado"), { code: "57014" }),
  );
  await expect(service.shipments({}, input)).rejects.toMatchObject({
    status: 503,
    code: "REPORT_TIMEOUT",
  });
  await expect(service.shipments({}, input)).rejects.not.toThrow("SQL privado");
});
test("un error distinto de timeout conserva su identidad", async () => {
  const { service, repository } = fixture();
  const failure = new Error("fallo sintético");
  repository.shipments.mockRejectedValue(failure);
  await expect(service.shipments({}, input)).rejects.toBe(failure);
});
