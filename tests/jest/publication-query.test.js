import { expect, test } from "@jest/globals";
import { publicationService } from "../../server/modules/publication/application.js";
import { contentHash } from "../../server/modules/publication/domain.js";
import { noCache } from "../../server/adapters/public-cache.js";

const dto = {
  lotCode: "SPRINT2_FICTICIO",
  stages: [{ stage: "harvest", date: "2026-01-01", description: "Ficticio" }],
};
function fixture(mode = "memory") {
  const state = { gates: 0, snapshots: 0, status: "published", dbDown: false };
  const entries = new Map();
  const events = [];
  const cache =
    mode === "none"
      ? noCache
      : {
          get: async (key) => {
            if (mode === "degraded") throw Error("Fallo simulado");
            return entries.get(key) ?? null;
          },
          set: async (key, value) => {
            if (mode === "degraded") throw Error("Fallo simulado");
            entries.set(key, value);
          },
        };
  const service = publicationService({
    cache,
    log: (event) => events.push(JSON.parse(event)),
    unitOfWork: (work) => work({}),
    repository: {
      publicGate: async () => {
        state.gates++;
        if (state.dbDown) throw Error("Fallo simulado DB");
        return {
          state: state.status,
          version: 1,
          contentHash: contentHash(dto),
        };
      },
      snapshot: async () => {
        state.snapshots++;
        return dto;
      },
    },
  });
  return { service, state, entries, events };
}

test("lectura fría y caliente conservan guard DB; caliente evita solo snapshot", async () => {
  const { service, state } = fixture();
  expect(await service.query("fiction")).toEqual(dto);
  expect(await service.query("fiction")).toEqual(dto);
  expect(state).toMatchObject({ gates: 2, snapshots: 1 });
});

test.each(["none", "degraded"])(
  "%s sustituye caché sin cambiar DTO ni autoridad de publicación",
  async (mode) => {
    const { service, state, events } = fixture(mode);
    expect(await service.query("fiction")).toEqual(dto);
    expect(await service.query("fiction")).toEqual(dto);
    expect(state).toMatchObject({ gates: 2, snapshots: 2 });
    expect(events).toHaveLength(mode === "degraded" ? 4 : 0);
    state.status = "withdrawn";
    await expect(service.query("fiction")).rejects.toMatchObject({
      status: 404,
    });
  },
);

test("retiro prevalece sobre contenido caliente y caída DB devuelve 503", async () => {
  const { service, state, entries } = fixture();
  await service.query("fiction");
  state.status = "withdrawn";
  await expect(service.query("fiction")).rejects.toMatchObject({ status: 404 });
  expect(entries.size).toBe(1);
  state.dbDown = true;
  await expect(service.query("fiction")).rejects.toMatchObject({
    status: 503,
    code: "PUBLIC_UNAVAILABLE",
  });
  expect(state.snapshots).toBe(1);
});

test.each([
  "{invalid",
  JSON.stringify({ ...dto, lotCode: "AJENO" }),
  JSON.stringify({ ...dto, internalActor: "private-field" }),
])("caché corrupta o contaminada no sustituye snapshot: %s", async (raw) => {
  const { service, entries, state } = fixture();
  await service.query("fiction");
  const key = [...entries.keys()][0];
  entries.set(key, raw);
  expect(await service.query("fiction")).toEqual(dto);
  expect(state.snapshots).toBe(2);
  expect(JSON.parse(entries.get(key))).toEqual(dto);
});
