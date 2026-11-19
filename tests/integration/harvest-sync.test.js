import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { connectDatabase } from "../../server/db.js";
import { compose } from "../../server/composition.js";
import { createApp } from "../../server/http.js";
import { migrate } from "../../scripts/migrate.js";
import { seed, ids } from "../../scripts/seed.js";
import { syncInput } from "../../server/modules/harvest/sync-domain.js";

const password = "Fiction-only-2026!";
const input = {
  schemaVersion: 1,
  parcelId: ids.parcel,
  harvestedAt: "2026-01-02T12:00:00Z",
  quantity: "37.125",
  unit: "kg",
};
test("recibos sync: contrato HTTP, PostgreSQL, permisos, carreras y rollback", async (t) => {
  assert.equal(
    process.env.TEST_ALLOW_DB_WRITE,
    "true",
    "DB de pruebas aislada requerida",
  );
  const db = await connectDatabase();
  await migrate(db);
  await seed(db, password);
  const s = compose(db);
  const auth = await s.access.login("campo@example.test", password);
  const actor = await s.access.authenticate(auth.token);
  let server;
  const start = async () => {
    server = createApp({ db, services: compose(db), log: () => {} }).listen(
      0,
      "127.0.0.1",
    );
    await new Promise((r) => server.once("listening", r));
  };
  await start();
  t.after(async () => {
    await new Promise((r) => server.close(r));
    await db.close();
  });
  const call = async (id, body = input, session = auth, extra = {}) => {
    const r = await fetch(
      `http://127.0.0.1:${server.address().port}/api/v1/sync/pre-lots/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: "session=" + session.token,
          "X-CSRF-Token": session.csrfToken,
          "Idempotency-Key": id,
          ...extra,
        },
        body: JSON.stringify(body),
      },
    );
    return {
      status: r.status,
      body: await r.json(),
      retryAfter: r.headers.get("retry-after"),
    };
  };
  const counts = async () => {
    const result = {};
    for (const table of [
      "harvest.harvests",
      "harvest.pre_lots",
      "harvest.sync_receipts",
      "access.audit",
    ])
      result[table] = (
        await db.query("SELECT count(*)::int AS n FROM " + table)
      ).rows[0].n;
    return result;
  };
  const id = crypto.randomUUID();
  let accepted;
  await t.test(
    "201, DTO explícito, respuesta descartada y replay tras reinicio de aplicación",
    async () => {
      const first = await call(id);
      assert.equal(first.status, 201);
      accepted = first.body;
      assert.deepEqual(
        Object.keys(first.body).sort(),
        [
          "acceptedAt",
          "clientCaptureId",
          "harvestId",
          "payload",
          "preLotId",
          "replayed",
          "status",
        ].sort(),
      );
      assert.equal(first.body.status, "registrado");
      assert.equal(first.body.replayed, false);
      const before = await counts();
      await new Promise((r) => server.close(r));
      await start();
      const repeat = await call(id);
      assert.equal(repeat.status, 200);
      assert.deepEqual(repeat.body, { ...accepted, replayed: true });
      assert.deepEqual(await counts(), before);
      const record = (
        await db.query("SELECT request_key FROM harvest.pre_lots WHERE id=$1", [
          accepted.preLotId,
        ])
      ).rows[0];
      assert.notEqual(
        record.request_key,
        id,
        "No colisionar con las claves del endpoint online",
      );
    },
  );
  await t.test(
    "canonización y cambio de contenido bajo el mismo ID",
    async () => {
      const normalized = await call(id.toUpperCase(), {
        ...input,
        harvestedAt: "2026-01-02T07:00:00-05:00",
        parcelId: ids.parcel.toUpperCase(),
      });
      assert.equal(normalized.status, 200);
      assert.equal(normalized.body.preLotId, accepted.preLotId);
      const before = await counts();
      for (const change of [
        { quantity: "38.000" },
        { unit: "unidad" },
        { harvestedAt: "2026-01-01T12:00:00Z" },
      ])
        assert.equal((await call(id, { ...input, ...change })).status, 409);
      assert.deepEqual(await counts(), before);
    },
  );
  await t.test(
    "dos peticiones simultáneas: un alta/recibo/audit y mismo resultado",
    async () => {
      const before = await counts(),
        key = crypto.randomUUID();
      const results = await Promise.all([call(key), call(key)]);
      assert.deepEqual(results.map((r) => r.status).sort(), [200, 201]);
      assert.equal(results[0].body.preLotId, results[1].body.preLotId);
      const after = await counts();
      for (const table of Object.keys(before))
        assert.equal(after[table] - before[table], 1, table);
    },
  );
  await t.test(
    "pérdida real de respuesta después del commit y reconciliación",
    async () => {
      const key = crypto.randomUUID(),
        before = await counts();
      let committed = false;
      const proxy = createServer(async (req, res) => {
        const chunks = [];
        for await (const chunk of req) chunks.push(chunk);
        const upstream = await call(
          key,
          JSON.parse(Buffer.concat(chunks).toString()),
        );
        committed = upstream.status === 201;
        res.destroy(); // Server committed, but the client receives no HTTP response.
      }).listen(0, "127.0.0.1");
      await new Promise((resolve) => proxy.once("listening", resolve));
      try {
        await assert.rejects(
          fetch("http://127.0.0.1:" + proxy.address().port, {
            method: "PUT",
            body: JSON.stringify(input),
          }),
          { name: "TypeError" },
        );
        assert.equal(committed, true);
      } finally {
        await new Promise((resolve) => proxy.close(resolve));
      }
      await new Promise((resolve) => server.close(resolve));
      await start();
      const reconciled = await call(key);
      assert.equal(reconciled.status, 200);
      const stored = (
        await db.query(
          "SELECT result FROM harvest.sync_receipts WHERE organization_id=$1 AND client_capture_id=$2",
          [ids.org, key],
        )
      ).rows[0].result;
      assert.deepEqual(reconciled.body, { ...stored, replayed: true });
      const after = await counts();
      for (const table of Object.keys(before))
        assert.equal(after[table] - before[table], 1, table);
    },
  );
  await t.test(
    "carrera con distinto contenido conserva una sola intención",
    async () => {
      const key = crypto.randomUUID(),
        before = await counts();
      const results = await Promise.all([
        call(key),
        call(key, { ...input, quantity: "38.000" }),
      ]);
      assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
      const winner = results.find((r) => r.status === 201).body;
      assert.equal((await call(key, winner.payload)).status, 200);
      const after = await counts();
      for (const table of Object.keys(before))
        assert.equal(after[table] - before[table], 1, table);
    },
  );
  await t.test("sesión, CSRF, Origin, clave y body estrictos", async () => {
    const key = crypto.randomUUID();
    assert.equal(
      (await call(key, input, { token: "bad", csrfToken: "bad" })).status,
      401,
    );
    assert.equal(
      (await call(key, input, auth, { "X-CSRF-Token": "bad" })).status,
      403,
    );
    assert.equal(
      (await call(key, input, auth, { Origin: "https://ajeno.example.test" }))
        .status,
      403,
    );
    assert.equal(
      (await call(key, input, auth, { "Idempotency-Key": crypto.randomUUID() }))
        .status,
      400,
    );
    assert.equal((await call("not-uuid")).status, 422);
    for (const change of [
      { actorId: ids.collector },
      { quantity: "37.1250" },
      { schemaVersion: 2 },
    ])
      assert.equal((await call(key, { ...input, ...change })).status, 422);
  });
  await t.test(
    "permisos y asignaciones actuales se revalidan incluso antes de replay",
    async () => {
      const before = await counts();
      await db.query(
        "DELETE FROM access.parcel_assignments WHERE user_id=$1 AND parcel_id=$2",
        [ids.collector, ids.parcel],
      );
      try {
        assert.equal((await call(id)).status, 404);
      } finally {
        await db.query(
          "INSERT INTO access.parcel_assignments VALUES($1,$2,$3)",
          [ids.collector, ids.parcel, ids.org],
        );
      }
      await db.query("UPDATE access.users SET role='viewer' WHERE id=$1", [
        ids.collector,
      ]);
      try {
        await assert.rejects(
          s.harvestSync.accept(actor, id, syncInput.parse(input)),
          { status: 403 },
        );
      } finally {
        await db.query("UPDATE access.users SET role='collector' WHERE id=$1", [
          ids.collector,
        ]);
      }
      await db.query("UPDATE access.users SET active=false WHERE id=$1", [
        ids.collector,
      ]);
      try {
        await assert.rejects(
          s.harvestSync.accept(actor, id, syncInput.parse(input)),
          { status: 401 },
        );
      } finally {
        await db.query("UPDATE access.users SET active=true WHERE id=$1", [
          ids.collector,
        ]);
      }
      assert.deepEqual(await counts(), before);
      const expired = await s.access.login("campo@example.test", password),
        stale = await s.access.authenticate(expired.token);
      await db.query(
        "UPDATE access.sessions SET expires_at=now()-interval '1 second' WHERE user_id=$1 AND csrf_token=$2",
        [ids.collector, expired.csrfToken],
      );
      await assert.rejects(
        s.harvestSync.accept(stale, id, syncInput.parse(input)),
        { status: 401 },
      );
      const revoked = await s.access.login("campo@example.test", password),
        stale2 = await s.access.authenticate(revoked.token);
      await s.access.logout(revoked.token);
      await assert.rejects(
        s.harvestSync.accept(stale2, id, syncInput.parse(input)),
        { status: 401 },
      );
    },
  );
  await t.test(
    "otro dueño de organización no obtiene recibo; otra organización tiene su espacio",
    async () => {
      const user = crypto.randomUUID();
      await db.query(
        "INSERT INTO access.users(id,organization_id,email,password_hash,role) SELECT $1,organization_id,'sync-second@example.test',password_hash,role FROM access.users WHERE id=$2",
        [user, ids.collector],
      );
      await db.query("INSERT INTO access.parcel_assignments VALUES($1,$2,$3)", [
        user,
        ids.parcel,
        ids.org,
      ]);
      const other = await s.access.login("sync-second@example.test", password);
      const denied = await call(id, input, other);
      assert.equal(denied.status, 409);
      assert.equal(
        JSON.stringify(denied.body).includes(accepted.preLotId),
        false,
      );
      const foreign = await s.access.login("otro@example.test", password);
      assert.equal((await call(id, input, foreign)).status, 404);
      const own = await call(
        id,
        { ...input, parcelId: ids.otherParcel },
        foreign,
      );
      assert.equal(own.status, 201);
      assert.notEqual(own.body.preLotId, accepted.preLotId);
    },
  );
  await t.test(
    "sesión que vence mientras espera la identidad no recupera un recibo",
    async () => {
      const short = await s.access.login("campo@example.test", password),
        stale = await s.access.authenticate(short.token);
      await db.query(
        "UPDATE access.sessions SET expires_at=clock_timestamp()+interval '1 second' WHERE user_id=$1 AND csrf_token=$2",
        [ids.collector, short.csrfToken],
      );
      let pending;
      await db.transaction(async (tx) => {
        await tx.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
          "harvest-sync:" + ids.org + ":" + id,
        ]);
        pending = s.harvestSync.accept(stale, id, syncInput.parse(input)).then(
          (value) => ({ value }),
          (error) => ({ error }),
        );
        const deadline = Date.now() + 3000;
        let waiting = false;
        while (Date.now() < deadline) {
          waiting = (
            await db.query(
              "SELECT EXISTS(SELECT 1 FROM pg_locks l JOIN pg_stat_activity a ON a.pid=l.pid WHERE a.datname=current_database() AND l.locktype='advisory' AND NOT l.granted) AS waiting",
            )
          ).rows[0].waiting;
          if (waiting) break;
          await new Promise((resolve) => setImmediate(resolve));
        }
        assert.equal(waiting, true, "Barrera real de espera por identidad");
        await tx.query("SELECT pg_sleep(1.1)");
      });
      assert.equal((await pending).error?.status, 401);
    },
  );
  await t.test(
    "fallos SQL reales en cada escritura revierten todo; mismo ID recuperable",
    async () => {
      await db.query(
        "CREATE FUNCTION public.fail_sync_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'sync rollback fixture'; END $$",
      );
      try {
        for (const table of [
          "harvest.harvests",
          "harvest.pre_lots",
          "access.audit",
          "harvest.sync_receipts",
        ]) {
          const key = crypto.randomUUID(),
            before = await counts();
          await db.query(
            "CREATE TRIGGER fail_sync BEFORE INSERT ON " +
              table +
              " FOR EACH ROW EXECUTE FUNCTION public.fail_sync_test()",
          );
          try {
            assert.equal((await call(key)).status, 500);
            assert.deepEqual(await counts(), before);
          } finally {
            await db.query("DROP TRIGGER fail_sync ON " + table);
          }
          assert.equal((await call(key)).status, 201);
        }
      } finally {
        await db.query("DROP FUNCTION public.fail_sync_test()");
      }
    },
  );
  await t.test(
    "recibo inmutable y down bloqueado con datos aceptados",
    async () => {
      await assert.rejects(
        db.query(
          "UPDATE harvest.sync_receipts SET payload_hash=repeat('a',64)",
        ),
        { code: "55000" },
      );
      await assert.rejects(db.query("DELETE FROM harvest.sync_receipts"), {
        code: "55000",
      });
      await assert.rejects(db.query("TRUNCATE harvest.sync_receipts"), {
        code: "55000",
      });
      const down = await readFile(
        new URL("../../migrations/008_harvest_sync.down.sql", import.meta.url),
        "utf8",
      );
      await assert.rejects(
        db.transaction((tx) => tx.query(down)),
        { code: "55000" },
      );
      assert.equal((await call(id)).status, 200);
    },
  );
  await t.test(
    "cuota de consulta devuelve429 y Retry-After sin quitar autenticación",
    async () => {
      // Fresh router instance isolates the route quota; no timeouts/config reduced.
      await new Promise((r) => server.close(r));
      await start();
      for (let i = 0; i < 60; i++) assert.equal((await call(id)).status, 200);
      const limited = await call(id);
      assert.equal(limited.status, 429);
      assert.ok(Number(limited.retryAfter) > 0);
    },
  );
});
