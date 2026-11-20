import { expect, jest, test } from "@jest/globals";
import { harvestSyncService } from "../../server/modules/harvest/sync-application.js";
import {
  syncInput,
  payloadDigest,
} from "../../server/modules/harvest/sync-domain.js";
import { AppError } from "../../server/shared/errors.js";

const actor = { id: "field", organizationId: "fiction" };
const input = syncInput.parse({
  schemaVersion: 1,
  parcelId: "11111111-1111-4111-8111-111111111111",
  harvestedAt: "2026-01-02T12:00:00Z",
  quantity: "37.125",
  unit: "kg",
});
function fixture() {
  const repository = {
    lock: async () => {},
    receipt: jest.fn(async () => null),
    save: jest.fn(async () => {}),
  };
  const access = {
    requireActiveSession: jest.fn(async () => actor),
    authorize: jest.fn(),
  };
  const producers = {
    requireHarvestOrigin: jest.fn(async () => {}),
    assignedCatalog: jest.fn(async () => [
      { id: input.parcelId, name: "Parcela ficticia" },
    ]),
  };
  const harvest = {
    record: jest.fn(async () => ({
      id: "prelot",
      harvestId: "harvest",
      status: "registrado",
      createdAt: "2026-01-02T12:00:01Z",
    })),
  };
  const service = harvestSyncService({
    repository,
    access,
    producers,
    harvest,
    unitOfWork: (work) => work({}),
  });
  return { service, repository, access, producers, harvest };
}
test("aceptación conserva identidad y cuerpo normalizado, excluye schemaVersion del alta", async () => {
  const { service, repository, harvest } = fixture();
  const accepted = await service.accept(actor, "capture", input);
  expect(accepted).toEqual({
    replayed: false,
    item: {
      clientCaptureId: "capture",
      preLotId: "prelot",
      harvestId: "harvest",
      status: "registrado",
      acceptedAt: "2026-01-02T12:00:01.000Z",
      payload: input,
    },
  });
  expect(harvest.record.mock.calls[0][2]).not.toHaveProperty("schemaVersion");
  expect(repository.save.mock.calls[0][4]).toBe(payloadDigest(input));
});
test("replay retorna el mismo recibo sin otra cosecha ni escritura", async () => {
  const { service, repository, harvest } = fixture();
  const result = { clientCaptureId: "capture", preLotId: "existing" };
  repository.receipt.mockResolvedValue({
    actor_id: actor.id,
    payload_hash: payloadDigest(input),
    payload: input,
    result,
  });
  expect(await service.accept(actor, "capture", input)).toEqual({
    replayed: true,
    item: result,
  });
  expect(harvest.record).not.toHaveBeenCalled();
  expect(repository.save).not.toHaveBeenCalled();
});
test.each([
  { actor_id: "other" },
  { payload_hash: "different" },
  { payload: { ...input, quantity: "37.126" } },
])(
  "identidad ya confirmada rechaza contenido o dueño distinto: %j",
  async (changed) => {
    const { service, repository, harvest } = fixture();
    repository.receipt.mockResolvedValue({
      actor_id: actor.id,
      payload_hash: payloadDigest(input),
      payload: input,
      ...changed,
    });
    await expect(service.accept(actor, "capture", input)).rejects.toMatchObject(
      { status: 409, code: "SYNC_ID_CONTENT_CONFLICT" },
    );
    expect(harvest.record).not.toHaveBeenCalled();
  },
);
test.each(["session", "role", "origin"])(
  "revocar %s impide incluso consultar recibo previo",
  async (permission) => {
    const { service, repository, access, producers } = fixture();
    const failure = new AppError(403, "REVOKED", "Ficticio");
    if (permission === "session")
      access.requireActiveSession.mockRejectedValue(failure);
    if (permission === "role")
      access.authorize.mockImplementation(() => {
        throw failure;
      });
    if (permission === "origin")
      producers.requireHarvestOrigin.mockRejectedValue(failure);
    await expect(service.accept(actor, "capture", input)).rejects.toBe(failure);
    expect(repository.receipt).not.toHaveBeenCalled();
  },
);
test("catálogo estable versiona contenido y cambia al revocar asignación", async () => {
  const { service, producers } = fixture();
  const first = await service.catalog(actor);
  expect(first.owner).toEqual({
    organizationId: actor.organizationId,
    actorId: actor.id,
  });
  expect((await service.catalog(actor)).version).toBe(first.version);
  producers.assignedCatalog.mockResolvedValue([]);
  const empty = await service.catalog(actor);
  expect(empty.parcels).toEqual([]);
  expect(empty.version).not.toBe(first.version);
});
test("catálogo excedido no se presenta como descarga parcial", async () => {
  const { service, producers } = fixture();
  producers.assignedCatalog.mockResolvedValue(
    Array.from({ length: 1001 }, () => ({ id: input.parcelId })),
  );
  await expect(service.catalog(actor)).rejects.toMatchObject({
    status: 503,
    code: "CATALOG_TOO_LARGE",
  });
});
