import { test } from "node:test";
import assert from "node:assert/strict";
import { publicationService } from "../../server/modules/publication/application.js";
import { contentHash } from "../../server/modules/publication/domain.js";
test("guard PostgreSQL domina caché caliente, retiro fallido y actualización de versión", async () => {
  const id = crypto.randomUUID(),
    dto = {
      lotCode: "DEMO",
      stages: [
        { stage: "harvest", date: "2026-01-01", description: "Ficticio" },
      ],
    };
  let gate = {
      publicId: id,
      version: 1,
      state: "published",
      contentHash: contentHash(dto),
    },
    reads = 0,
    gets = 0;
  const values = new Map();
  const service = publicationService({
    repository: {
      publicGate: async () => gate,
      snapshot: async () => {
        reads++;
        return dto;
      },
    },
    unitOfWork: (fn) => fn({}),
    cache: {
      get: async (k) => {
        gets++;
        return values.get(k);
      },
      set: async (k, v) => values.set(k, v),
      delete: async () => {
        throw Error("Redis caído");
      },
    },
  });
  assert.deepEqual(await service.query(id), dto);
  assert.deepEqual(await service.query(id), dto);
  assert.equal(reads, 1);
  gate = { ...gate, state: "withdrawn", version: 2 };
  await assert.rejects(service.query(id), (e) => e.status === 404);
  assert.equal(gets, 2);
  assert.equal(values.size, 1);
  gate = { ...gate, state: "published", version: 3 };
  await service.query(id);
  assert.equal(reads, 2);
});
test("Redis falla o devuelve contenido contaminado: DB; DB caída: 503 sin consultar Redis", async () => {
  const id = crypto.randomUUID(),
    dto = {
      lotCode: "DEMO",
      stages: [
        { stage: "harvest", date: "2026-01-01", description: "Ficticio" },
      ],
    };
  let failDb = false,
    gets = 0;
  const service = publicationService({
    repository: {
      publicGate: async () => {
        if (failDb) throw Error("DB caída");
        return {
          publicId: id,
          state: "published",
          version: 1,
          contentHash: contentHash(dto),
        };
      },
      snapshot: async () => dto,
    },
    unitOfWork: (fn) => fn({}),
    cache: {
      get: async () => {
        gets++;
        return JSON.stringify({ ...dto, note: "privado" });
      },
      set: async () => {
        throw Error("fallo SET");
      },
    },
  });
  assert.deepEqual(await service.query(id), dto);
  failDb = true;
  await assert.rejects(service.query(id), (e) => e.status === 503);
  assert.equal(gets, 1);
});
