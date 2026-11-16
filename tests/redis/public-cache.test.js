import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "redis";
import { redisCache } from "../../server/adapters/public-cache.js";
import { publicationService } from "../../server/modules/publication/application.js";
import {
  contentHash,
  cacheKey,
} from "../../server/modules/publication/domain.js";
test("Redis real: fría, caliente, TTL, actualización, retiro con DELETE fallido y recuperación", async (t) => {
  if (!process.env.REDIS_URL)
    throw Error("Configure REDIS_URL de pruebas; esta prueba no se omite.");
  const cache = redisCache(process.env.REDIS_URL, () => {}),
    witness = createClient({ url: process.env.REDIS_URL });
  witness.on("error", () => {});
  await witness.connect();
  t.after(async () => {
    await cache.close();
    witness.destroy();
  });
  const id = crypto.randomUUID(),
    dto = {
      lotCode: "REDIS-DEMO",
      stages: [
        { stage: "harvest", date: "2026-01-02", description: "Ficticio" },
      ],
    };
  let gate = {
      publicId: id,
      version: 1,
      state: "published",
      contentHash: contentHash(dto),
    },
    reads = 0;
  const deadline = Date.now() + 5000;
  while (true) {
    try {
      await cache.set(cacheKey(id, 0), "ready", 10);
      break;
    } catch (e) {
      if (Date.now() > deadline) throw e;
      await new Promise((r) => setTimeout(r, 20));
    }
  }
  const service = publicationService({
    repository: {
      publicGate: async () => gate,
      snapshot: async () => {
        reads++;
        return dto;
      },
    },
    unitOfWork: (fn) => fn({}),
    cache,
  });
  assert.deepEqual(await service.query(id), dto);
  assert.equal(reads, 1);
  const key = cacheKey(id, 1),
    ttl = await witness.ttl(key);
  assert.ok(ttl > 0 && ttl <= 300);
  assert.deepEqual(JSON.parse(await witness.get(key)), dto);
  assert.deepEqual(await service.query(id), dto);
  assert.equal(reads, 1);
  gate = { ...gate, version: 2 };
  await service.query(id);
  assert.equal(reads, 2);
  gate = { ...gate, version: 3, state: "withdrawn" };
  const broken = publicationService({
    repository: { publicGate: async () => gate },
    unitOfWork: (fn) => fn({}),
    cache: {
      ...cache,
      delete: async () => {
        throw Error("DELETE fallido");
      },
    },
  });
  await assert.rejects(broken.query(id), (e) => e.status === 404);
  assert.ok(await witness.get(key));
  await cache.delete(key);
  assert.equal(await witness.get(key), null);
  await witness.del(cacheKey(id, 0), cacheKey(id, 2));
});
test("adaptador Redis caído falla sin cola offline ni bloquear la aplicación", async () => {
  const cache = redisCache("redis://127.0.0.1:1", () => {});
  try {
    await assert.rejects(async () => cache.get("unavailable"));
    await assert.rejects(async () => cache.set("unavailable", "x", 1));
    await assert.rejects(async () => cache.delete("unavailable"));
  } finally {
    await cache.close();
  }
});
