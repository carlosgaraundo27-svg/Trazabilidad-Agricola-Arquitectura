import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { connectDatabase } from "../../server/db.js";
import { ids } from "../seed.js";
import { labConfig, requireLab } from "./lab-config.js";
import { sourceSha } from "./git.js";
import { syncInput } from "../../server/modules/harvest/sync-domain.js";
import { captureAckMatches } from "./measurement-policy.js";

const config = labConfig(process.env);
const db = await connectDatabase(config);
const base = "http://127.0.0.1:3302";
const records = Array.from({ length: 50 }, (_, index) => {
  const payload = syncInput.parse({
    schemaVersion: 1,
    parcelId: ids.parcel,
    harvestedAt: "2026-01-02T12:00:00Z",
    quantity: `${index + 1}.125`,
    unit: "kg",
  });
  return {
    id: randomUUID(),
    payload,
    hash: createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
  };
});
const counts = async () =>
  (
    await db.query(`SELECT
  (SELECT count(*) FROM harvest.harvests)::int AS harvests,
  (SELECT count(*) FROM harvest.pre_lots)::int AS prelots,
  (SELECT count(*) FROM harvest.sync_receipts)::int AS receipts,
  (SELECT count(*) FROM access.audit WHERE action='prelot:create')::int AS audits`)
  ).rows[0];
const output = {
  sourceSha: sourceSha(),
  measuredAt: new Date().toISOString(),
  scope:
    "Servidor HTTP/PostgreSQL real en loopback de runner independiente. Cola solo en memoria: no Android, SQLite, durabilidad ni conectividad de campo.",
  requests: [],
  replays: [],
  objectiveSeconds: 60,
};
try {
  await requireLab(db);
  const login = await fetch(base + "/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify({
      email: "campo@example.test",
      password: process.env.SPRINT02_DEMO_PASSWORD,
    }),
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(login.status, 200);
  const session = await login.json();
  const cookie = login.headers
    .getSetCookie()
    .map((v) => v.split(";")[0])
    .join("; ");
  const send = async (record) => {
    const start = performance.now();
    const response = await fetch(`${base}/api/v1/sync/pre-lots/${record.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Origin: base,
        Cookie: cookie,
        "X-CSRF-Token": session.csrfToken,
        "Idempotency-Key": record.id,
      },
      body: JSON.stringify(record.payload),
      signal: AbortSignal.timeout(5000),
    });
    const body = await response.json();
    return {
      id: record.id,
      hash: record.hash,
      status: response.status,
      milliseconds: performance.now() - start,
      preLotId: body.preLotId ?? null,
      validAck: captureAckMatches(record, body),
      code: body.error?.code ?? null,
    };
  };
  output.before = await counts();
  const start = performance.now();
  // Un trabajador secuencial, igual que el contrato foreground; no alterar política.
  for (const record of records) output.requests.push(await send(record));
  output.elapsedSeconds = (performance.now() - start) / 1000;
  output.after = await counts();
  for (const record of records.slice(0, 5))
    output.replays.push(await send(record));
  output.afterFiveReplays = await counts();
  output.allAccepted = output.requests.every(
    (r) => r.status === 201 && r.validAck,
  );
  output.withinProposed60s = output.allAccepted && output.elapsedSeconds <= 60;
  const delta = Object.fromEntries(
    Object.entries(output.before).map(([key, value]) => [
      key,
      output.after[key] - value,
    ]),
  );
  output.deltas = delta;
  assert.equal(
    output.allAccepted,
    true,
    "Las50 capturas deben ser aceptadas, no429/5xx",
  );
  for (const value of Object.values(delta)) assert.equal(value, 50);
  assert.equal(new Set(output.requests.map((r) => r.preLotId)).size, 50);
  assert.equal(
    output.replays.every(
      (r, index) =>
        r.status === 200 &&
        r.validAck &&
        r.preLotId === output.requests[index].preLotId,
    ),
    true,
  );
  assert.deepEqual(output.afterFiveReplays, output.after);
} catch (error) {
  output.failure = { name: error.name, message: error.message };
  process.exitCode = 1;
} finally {
  await writeFile(
    ".local/sprint02/sync50.json",
    JSON.stringify(output, null, 2) + "\n",
  );
  await db.close();
}
