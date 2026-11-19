import { test } from "node:test";
import assert from "node:assert/strict";
import { connectDatabase } from "../../server/db.js";
import { startTestServer } from "../e2e/global-setup.js";
import { ids } from "../../scripts/seed.js";

test("recibo sync persiste tras detener y crear otro proceso Node", async (t) => {
  assert.equal(process.env.TEST_ALLOW_DB_WRITE, "true");
  let server = await startTestServer({ ...process.env, E2E_PORT: "0" });
  const db = await connectDatabase();
  t.after(async () => {
    await server.stop();
    await db.close();
  });
  const login = await fetch(
    "http://127.0.0.1:" + server.port + "/api/v1/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "campo@example.test",
        password: process.env.DEMO_PASSWORD,
      }),
    },
  );
  assert.equal(login.status, 200);
  const auth = await login.json(),
    cookie = login.headers.getSetCookie()[0].split(";")[0],
    id = crypto.randomUUID();
  const body = {
    schemaVersion: 1,
    parcelId: ids.parcel,
    harvestedAt: "2026-01-02T12:00:00Z",
    quantity: "17.125",
    unit: "kg",
  };
  const call = () =>
    fetch("http://127.0.0.1:" + server.port + "/api/v1/sync/pre-lots/" + id, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
        "X-CSRF-Token": auth.csrfToken,
        "Idempotency-Key": id,
      },
      body: JSON.stringify(body),
    });
  const first = await call();
  assert.equal(first.status, 201);
  const accepted = await first.json();
  const before = (
    await db.query(
      "SELECT count(*)::int AS n FROM access.audit WHERE resource_id=$1",
      [accepted.preLotId],
    )
  ).rows[0].n;
  const pid = server.child.pid;
  await server.stop();
  server = await startTestServer({ ...process.env, E2E_PORT: "0" });
  assert.notEqual(server.child.pid, pid);
  const replay = await call();
  assert.equal(replay.status, 200);
  assert.deepEqual(await replay.json(), { ...accepted, replayed: true });
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int AS n FROM access.audit WHERE resource_id=$1",
        [accepted.preLotId],
      )
    ).rows[0].n,
    before,
  );
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int AS n FROM harvest.sync_receipts WHERE organization_id=$1 AND client_capture_id=$2",
        [ids.org, id],
      )
    ).rows[0].n,
    1,
  );
});
