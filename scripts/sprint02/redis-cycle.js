import assert from "node:assert/strict";
import { createClient } from "redis";
import { cacheKey } from "../../server/modules/publication/domain.js";
import { demoProjection } from "../publication-fixture.js";

export async function redisCycle({
  redisUrl,
  publicId,
  version,
  stop,
  start,
  appLog,
}) {
  const key = cacheKey(publicId, version),
    url = `http://127.0.0.1:3302/api/public/v1/lots/${publicId}`;
  const result = {
    scope:
      "Mismo proceso HTTP y adaptador Redis productivos a través de caída/reconexión reales; datos ficticios.",
    requests: [],
    poisoning: [],
  };
  const read = async (phase) => {
    const before = performance.now();
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const body = await response.json();
    result.requests.push({
      phase,
      status: response.status,
      milliseconds: performance.now() - before,
    });
    assert.equal(response.status, 200);
    assert.deepEqual(body, demoProjection);
  };
  const witness = () => {
    const client = createClient({
      url: redisUrl,
      socket: { connectTimeout: 200, reconnectStrategy: false },
    });
    client.on("error", () => {});
    return client;
  };
  let client = witness();
  try {
    await client.connect();
    assert.equal(await client.ping(), "PONG");
    await read("available");
    assert.deepEqual(JSON.parse(await client.get(key)), demoProjection);
    await client.close();
    await stop();
    client = witness();
    let reachable = false;
    try {
      await client.connect();
      reachable = (await client.ping()) === "PONG";
    } catch {}
    assert.equal(reachable, false, "Caída real de Redis requerida");
    await read("redis-down-fallback");
    await start();
    const before = performance.now();
    while (!appLog().includes('"event":"public_cache_recovered"')) {
      if (performance.now() - before > 12000)
        throw new Error("Adaptador original no se reconectó en12s");
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    result.reconnectObservedMilliseconds = performance.now() - before;
    if (client.isOpen) client.destroy();
    client = witness();
    await client.connect();
    assert.equal(await client.ping(), "PONG");
    await read("recovered");
    await read("recovered-warm");
    assert.deepEqual(JSON.parse(await client.get(key)), demoProjection);
    for (const [name, raw] of [
      ["corrupt-json", "{"],
      [
        "private-property",
        JSON.stringify({ ...demoProjection, privateNote: "FICTION_INTERNAL" }),
      ],
      [
        "wrong-hash",
        JSON.stringify({ ...demoProjection, lotCode: "FICTITIOUS-OTHER" }),
      ],
    ]) {
      await client.set(key, raw, { EX: 300 });
      await read(name);
      assert.deepEqual(JSON.parse(await client.get(key)), demoProjection);
      result.poisoning.push({ name, responseAndRepairedCacheValid: true });
    }
    result.events = appLog()
      .split("\n")
      .filter((line) => line.includes('"event":"public_cache_'))
      .map((line) => JSON.parse(line));
    assert.ok(
      result.events.some(
        (event) => event.event === "public_cache_connection_degraded",
      ),
    );
    assert.ok(
      result.events.some((event) => event.event === "public_cache_recovered"),
    );
    result.passed = true;
    return result;
  } catch (error) {
    result.passed = false;
    result.failure = { name: error.name, message: error.message };
    error.measurement = result;
    throw error;
  } finally {
    if (client.isOpen) client.destroy();
  }
}
