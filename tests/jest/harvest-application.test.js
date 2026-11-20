import { expect, test } from "@jest/globals";
import { harvestService } from "../../server/modules/harvest/application.js";
import { AppError } from "../../server/shared/errors.js";

const input = {
  parcelId: "11111111-1111-4111-8111-111111111111",
  harvestedAt: "2026-01-01T12:00:00.000Z",
  quantity: "73.125",
  unit: "kg",
};
const actor = { id: "collector", organizationId: "fiction" };

// Puerto en memoria: prueba la orquestación real, no locks ni rollback SQL.
function fixture() {
  const state = { rows: [], audits: [], authorized: true, origin: true };
  const service = harvestService({
    unitOfWork: (work) => work(state),
    access: {
      authorize: () => {
        if (!state.authorized) throw new AppError(403, "FORBIDDEN", "Denegado");
      },
      audit: async (tx, current, action, id) => tx.audits.push({ action, id }),
    },
    producers: {
      requireHarvestOrigin: async () => {
        if (!state.origin) throw new AppError(404, "NOT_FOUND", "Sin origen");
      },
    },
    repository: {
      lockKey: async () => {},
      findRequest: async (tx, current, key) =>
        tx.rows.find((r) => r.key === key),
      get: async (tx, id) => tx.rows.find((r) => r.id === id),
      create: async (tx, current, body, key) => {
        const row = { id: "prelot-1", key, request_payload: { ...body } };
        tx.rows.push(row);
        return row;
      },
    },
  });
  return { state, service };
}

test("respuesta perdida y replay conservan una cosecha y una auditoría", async () => {
  const { service, state } = fixture();
  const first = await service.create(actor, input, "intention-1");
  const retry = await service.create(actor, { ...input }, "intention-1");
  expect(first.replayed).toBe(false);
  expect(retry).toEqual({ replayed: true, item: first.item });
  expect(state.rows).toHaveLength(1);
  expect(state.audits).toEqual([
    { action: "prelot:create", id: first.item.id },
  ]);
});

test("reutilizar intención con cantidad distinta da 409 sin nuevos efectos", async () => {
  const { service, state } = fixture();
  await service.create(actor, input, "intention-1");
  await expect(
    service.create(actor, { ...input, quantity: "73.126" }, "intention-1"),
  ).rejects.toMatchObject({ status: 409, code: "IDEMPOTENCY_CONFLICT" });
  expect(state.rows).toHaveLength(1);
  expect(state.audits).toHaveLength(1);
});

test.each(["authorized", "origin"])(
  "revocar %s impide replay aunque exista la intención",
  async (permission) => {
    const { service, state } = fixture();
    await service.create(actor, input, "intention-1");
    state[permission] = false;
    await expect(
      service.create(actor, input, "intention-1"),
    ).rejects.toMatchObject({
      status: permission === "authorized" ? 403 : 404,
    });
    expect(state.rows).toHaveLength(1);
    expect(state.audits).toHaveLength(1);
  },
);
