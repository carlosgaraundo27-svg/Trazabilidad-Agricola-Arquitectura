import { test } from "node:test";
import assert from "node:assert/strict";
import { connectDatabase } from "../../server/db.js";
import { migrate } from "../../scripts/migrate.js";
import { seed, ids } from "../../scripts/seed.js";
import { compose } from "../../server/composition.js";
import { createApp } from "../../server/http.js";
const password = "Fiction-only-2026!";
test("integración HTTP + SQL del primer recorrido", async (t) => {
  if (process.env.TEST_ALLOW_DB_WRITE !== "true")
    throw Error("Use una DB de pruebas vacía y TEST_ALLOW_DB_WRITE=true.");
  const db = await connectDatabase();
  const server = createApp({ db, services: compose(db), log: () => {} }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await db.close();
  });
  await migrate(db);
  await migrate(db);
  await seed(db, password);
  await seed(db, password);
  const base = "http://127.0.0.1:" + server.address().port + "/api/v1";
  async function call(path, method = "GET", body, auth = {}, headers = {}) {
    const res = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(auth.cookie
          ? { Cookie: auth.cookie, "X-CSRF-Token": auth.csrfToken }
          : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: res.status,
      body: res.status === 204 ? null : await res.json(),
      cookie: res.headers.get("set-cookie")?.split(";")[0],
    };
  }
  async function login(email) {
    const r = await call("/auth/login", "POST", { email, password });
    assert.equal(r.status, 200);
    return { cookie: r.cookie, csrfToken: r.body.csrfToken };
  }
  const admin = await login("admin@example.test"),
    collector = await login("campo@example.test"),
    other = await login("otro@example.test"),
    viewer = await login("lector@example.test");
  const input = {
    parcelId: ids.parcel,
    harvestedAt: "2026-01-02T12:00:00Z",
    quantity: "45.250",
    unit: "kg",
  };
  const create = (body, key = crypto.randomUUID(), auth = collector) =>
    call("/pre-lots", "POST", body, auth, { "Idempotency-Key": key });
  await t.test("credenciales, sesión, CSRF, origen y rol", async () => {
    assert.equal((await call("/producers")).status, 401);
    assert.equal(
      (
        await call("/auth/login", "POST", {
          email: "admin@example.test",
          password: "incorrect",
        })
      ).status,
      401,
    );
    assert.equal(
      (await call("/producers", "POST", { name: "X" }, collector)).status,
      403,
    );
    assert.equal(
      (await call("/producers", "GET", undefined, viewer)).status,
      403,
    );
    assert.equal((await create(input, crypto.randomUUID(), admin)).status, 403);
    assert.equal(
      (
        await call("/producers", "POST", { name: "X" }, admin, {
          "X-CSRF-Token": "bad",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call("/producers", "POST", { name: "X" }, admin, {
          Origin: "https://evil.test",
        })
      ).status,
      403,
    );
    assert.equal(
      (await call("/auth/me", "GET", undefined, admin)).body.user.role,
      "admin",
    );
  });
  await t.test(
    "alta de productor y parcela; aislamiento por organización",
    async () => {
      const producer = await call(
        "/producers",
        "POST",
        { name: "Finca ficticia creada" },
        admin,
      );
      assert.equal(producer.status, 201);
      const parcel = await call(
        "/parcels",
        "POST",
        {
          producerId: producer.body.id,
          name: "Parcela creada",
          latitude: -12,
          longitude: -76,
        },
        admin,
      );
      assert.equal(parcel.status, 201);
      assert.equal(
        (
          await call(
            "/parcels",
            "POST",
            {
              producerId: ids.otherProducer,
              name: "Ajena",
              latitude: 0,
              longitude: 0,
            },
            admin,
          )
        ).status,
        404,
      );
      const own = (await call("/producers", "GET", undefined, admin)).body
        .items;
      assert.ok(!own.some((p) => p.id === ids.otherProducer));
      const assigned = (await call("/parcels", "GET", undefined, collector))
        .body.items;
      assert.deepEqual(
        assigned.map((p) => p.id),
        [ids.parcel],
      );
      assert.deepEqual(
        (await call("/producers?offset=100", "GET", undefined, admin)).body
          .items,
        [],
      );
      assert.equal(
        (await call("/producers?offset=-1", "GET", undefined, admin)).status,
        422,
      );
    },
  );
  await t.test("rechaza entradas inválidas sin escribir", async () => {
    const count = async () =>
      Number(
        (await db.query("SELECT count(*) AS n FROM harvest.pre_lots")).rows[0]
          .n,
      );
    const before = await count();
    for (const quantity of ["0", "-3", "NaN", "3.0001"])
      assert.equal((await create({ ...input, quantity })).status, 422);
    assert.equal(
      (await create({ ...input, harvestedAt: "2999-01-01T00:00:00Z" })).status,
      422,
    );
    assert.equal(
      (await create({ ...input, organizationId: ids.otherOrg })).status,
      422,
    );
    assert.equal(
      (await create({ ...input, parcelId: ids.otherParcel })).status,
      404,
    );
    assert.equal(
      (await create({ ...input, parcelId: ids.unassigned })).status,
      404,
    );
    assert.equal(
      (await create({ ...input, parcelId: crypto.randomUUID() })).status,
      404,
    );
    assert.equal(
      (await call("/pre-lots", "POST", input, collector)).status,
      400,
    );
    assert.equal(await count(), before);
  });
  let accepted, key;
  await t.test(
    "captura, reintento concurrente, conflicto y persistencia",
    async () => {
      key = crypto.randomUUID();
      const responses = await Promise.all([
        create(input, key),
        create(input, key),
        create(input, key),
      ]);
      assert.deepEqual(responses.map((r) => r.status).sort(), [200, 200, 201]);
      accepted = responses[0].body;
      assert.ok(responses.every((r) => r.body.id === accepted.id));
      assert.equal(accepted.createdBy, ids.collector);
      assert.equal(accepted.quantity, "45.250");
      assert.equal(
        (await create({ ...input, quantity: "46" }, key)).status,
        409,
      );
      assert.equal(
        Number(
          (
            await db.query(
              "SELECT count(*) AS n FROM access.audit WHERE resource_id=$1",
              [accepted.id],
            )
          ).rows[0].n,
        ),
        1,
      );
      assert.equal(
        (await call("/pre-lots", "GET", undefined, other)).body.items.length,
        0,
      );
      const fresh = createApp({
        db,
        services: compose(db),
        log: () => {},
      }).listen(0, "127.0.0.1");
      await new Promise((r) => fresh.once("listening", r));
      try {
        const r = await fetch(
          "http://127.0.0.1:" + fresh.address().port + "/api/v1/pre-lots",
          { headers: { Cookie: collector.cookie } },
        );
        assert.ok((await r.json()).items.some((p) => p.id === accepted.id));
      } finally {
        await new Promise((r) => fresh.close(r));
      }
    },
  );
  await t.test(
    "revocar asignación bloquea incluso reintento aceptado",
    async () => {
      await db.query(
        "DELETE FROM access.parcel_assignments WHERE user_id=$1 AND parcel_id=$2",
        [ids.collector, ids.parcel],
      );
      assert.equal((await create(input, key)).status, 404);
      await db.query("INSERT INTO access.parcel_assignments VALUES($1,$2,$3)", [
        ids.collector,
        ids.parcel,
        ids.org,
      ]);
    },
  );
  await t.test(
    "fallo real de auditoría revierte cosecha y pre-lote",
    async () => {
      await db.query(
        "ALTER TABLE access.audit ADD CONSTRAINT test_reject CHECK(action <> 'prelot:create') NOT VALID",
      );
      const before = Number(
        (await db.query("SELECT count(*) AS n FROM harvest.harvests")).rows[0]
          .n,
      );
      try {
        assert.equal((await create(input)).status, 500);
        assert.equal(
          Number(
            (await db.query("SELECT count(*) AS n FROM harvest.harvests"))
              .rows[0].n,
          ),
          before,
        );
      } finally {
        await db.query("ALTER TABLE access.audit DROP CONSTRAINT test_reject");
      }
    },
  );
  await t.test(
    "CHECK y FK rechazan corrupción y otra organización",
    async () => {
      await assert.rejects(() =>
        db.query(
          "INSERT INTO producers.parcels(id,organization_id,producer_id,name,latitude,longitude) VALUES($1,$2,$3,$4,$5,$6)",
          [crypto.randomUUID(), ids.org, ids.producer, "Inválida", 91, 0],
        ),
      );
      await assert.rejects(() =>
        db.query("INSERT INTO access.parcel_assignments VALUES($1,$2,$3)", [
          ids.collector,
          ids.otherParcel,
          ids.org,
        ]),
      );
    },
  );
  await t.test("cuenta inactiva, sesión vencida y logout", async () => {
    await db.query("UPDATE access.users SET active=false WHERE id=$1", [
      ids.viewer,
    ]);
    assert.equal(
      (await call("/auth/me", "GET", undefined, viewer)).status,
      401,
    );
    await db.query("UPDATE access.users SET active=true WHERE id=$1", [
      ids.viewer,
    ]);
    await db.query(
      "UPDATE access.sessions SET expires_at=now()-interval '1 hour' WHERE user_id=$1",
      [ids.otherCollector],
    );
    assert.equal((await call("/auth/me", "GET", undefined, other)).status, 401);
    assert.equal((await call("/auth/logout", "POST", {}, admin)).status, 204);
    assert.equal((await call("/auth/me", "GET", undefined, admin)).status, 401);
  });
  await t.test("errores HTTP seguros y límite de autenticación", async () => {
    const malformed = await fetch(base + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{bad",
    });
    assert.equal(malformed.status, 400);
    assert.equal((await malformed.json()).error.code, "INVALID_JSON");
    const large = await call("/auth/login", "POST", {
      email: "x@example.test",
      password: "x".repeat(17000),
    });
    assert.equal(large.status, 413);
    let limited;
    for (let n = 0; n < 21; n++)
      limited = await call("/auth/login", "POST", {
        email: "missing@example.test",
        password: "invalid",
      });
    assert.equal(limited.status, 429);
  });
  await t.test("migración down/up en base desechable", async () => {
    const { readFile } = await import("node:fs/promises");
    const sql = await readFile(
      new URL("../../migrations/001_initial.down.sql", import.meta.url),
      "utf8",
    );
    await db.transaction(async (tx) => {
      for (const statement of sql
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean))
        await tx.query(statement);
      await tx.query("DELETE FROM public.schema_migrations WHERE version=$1", [
        "001",
      ]);
    });
    await migrate(db);
    assert.equal(
      Number(
        (await db.query("SELECT count(*) AS n FROM harvest.pre_lots")).rows[0]
          .n,
      ),
      0,
    );
  });
});
