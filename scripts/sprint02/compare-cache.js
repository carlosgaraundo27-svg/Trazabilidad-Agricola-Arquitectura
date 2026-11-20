import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { createClient } from "redis";
import { connectDatabase } from "../../server/db.js";
import { publicationService } from "../../server/modules/publication/application.js";
import { publicationRepository } from "../../server/modules/publication/repository.js";
import { cacheKey } from "../../server/modules/publication/domain.js";
import { noCache, redisCache } from "../../server/adapters/public-cache.js";
import { demoProjection } from "../publication-fixture.js";
import { labConfig, requireLab } from "./lab-config.js";

const config = labConfig(process.env);
const mode = process.env.SPRINT02_CACHE_MODE || "cold";
if (!["none", "cold", "warm", "degraded"].includes(mode))
  throw Error("Modo de caché inválido.");
const fixture = JSON.parse(
  await readFile(".local/sprint02/lab-fixture.json", "utf8"),
);
const { publicId, version } = fixture.publications[0];
const db = await connectDatabase(config);
const events = [];
const cache =
  mode === "none"
    ? noCache
    : redisCache(config.redisUrl, (e) => events.push(JSON.parse(e)));
const witness = createClient({
  url: config.redisUrl,
  socket: { connectTimeout: 150, reconnectStrategy: false },
});
witness.on("error", () => {});
const counts = { sql: 0, gate: 0, snapshot: 0, hits: 0, misses: 0, errors: 0 };
try {
  await requireLab(db);
  if (mode !== "none") {
    let reachable = false;
    try {
      await witness.connect();
      reachable = (await witness.ping()) === "PONG";
    } catch {}
    if ((mode === "degraded") === reachable)
      throw Error(
        "Degradado exige Redis detenido en el laboratorio; fría/caliente exigen Redis disponible.",
      );
    if (reachable) {
      const deadline = Date.now() + 3000;
      while (true) {
        try {
          await cache.get(cacheKey(publicId, version));
          break;
        } catch {
          if (Date.now() >= deadline)
            throw Error("Adaptador Redis no disponible.");
        }
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }
  }
  const repository = publicationRepository();
  const service = publicationService({
    repository: {
      publicGate: async (...args) => {
        counts.gate++;
        return repository.publicGate(...args);
      },
      snapshot: async (...args) => {
        counts.snapshot++;
        return repository.snapshot(...args);
      },
    },
    unitOfWork: (work) =>
      db.transaction((tx) =>
        work({
          query: (...args) => {
            counts.sql++;
            return tx.query(...args);
          },
        }),
      ),
    cache: {
      ...cache,
      get: async (key) => {
        try {
          const result = await cache.get(key);
          counts[result === null ? "misses" : "hits"]++;
          return result;
        } catch (error) {
          counts.errors++;
          throw error;
        }
      },
    },
    log: (event) => events.push(JSON.parse(event)),
  });
  if (mode === "warm") await service.query(publicId);
  for (const key of Object.keys(counts)) counts[key] = 0;
  events.length = 0;
  const milliseconds = [];
  for (let i = 0; i < 50; i++) {
    if (mode === "cold") await witness.del(cacheKey(publicId, version));
    const start = performance.now();
    const dto = await service.query(publicId);
    milliseconds.push(performance.now() - start);
    assert.deepEqual(dto, demoProjection);
  }
  const sorted = [...milliseconds].sort((a, b) => a - b);
  assert.equal(
    counts.gate,
    50,
    "Cada consulta debe verificar publicación en DB",
  );
  assert.equal(counts.snapshot, mode === "warm" ? 0 : 50);
  if (mode === "warm") assert.equal(counts.hits, 50);
  if (mode === "degraded") assert.equal(counts.errors, 50);
  const result = {
    sourceSha: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    fixtureSha: fixture.sourceSha,
    measuredAt: new Date().toISOString(),
    mode,
    requests: 50,
    counts,
    milliseconds,
    p95: sorted[Math.ceil(sorted.length * 0.95) - 1],
    events,
    limitation:
      "Caso de uso y PostgreSQL/Redis reales, secuencial; excluye HTTP, red cliente y concurrencia. Fría = clave Redis ausente, no buffers PostgreSQL fríos.",
  };
  await writeFile(
    `.local/sprint02/cache-${mode}.json`,
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(
    `Comparación ${mode} registrada; revisar resultados antes de afirmar mejora.`,
  );
} finally {
  if (witness.isOpen) witness.destroy();
  await cache.close();
  await db.close();
}
