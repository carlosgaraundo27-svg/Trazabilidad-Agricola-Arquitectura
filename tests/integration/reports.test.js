import { test } from "node:test";
import assert from "node:assert/strict";
import { connectDatabase } from "../../server/db.js";
import { compose } from "../../server/composition.js";
import { createApp } from "../../server/http.js";
import { migrate } from "../../scripts/migrate.js";
import { seed } from "../../scripts/seed.js";
import { reportsFixture, reportIds } from "../../scripts/reports-fixture.js";
import { intakeIds } from "../../scripts/seed-intake.js";
import { logisticsIds } from "../../scripts/seed-logistics.js";

test("ROP-01 HTTP: hechos, precisión, fechas, cursor y aislamiento", async (t) => {
  assert.equal(
    process.env.TEST_ALLOW_DB_WRITE,
    "true",
    "Base aislada requerida",
  );
  const db = await connectDatabase();
  t.after(() => db.close());
  await migrate(db);
  const password = "Fiction-only-2026!";
  await seed(db, password);
  const services = compose(db);
  const fixtures = await reportsFixture(db, password);
  const server = createApp({ db, services, log: () => {} }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise((r) => server.once("listening", r));
  t.after(() => new Promise((r) => server.close(r)));
  const base = "http://127.0.0.1:" + server.address().port;
  const login = async (email) => {
    const r = await fetch(base + "/api/v1/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(r.status, 200);
    return r.headers.get("set-cookie").split(";")[0];
  };
  const owner = await login("inventario@example.test");
  const query = {
    centerId: intakeIds.center,
    from: "2026-01-03T00:00:00Z",
    to: "2026-01-04T00:00:00Z",
  };
  const call = async (changes = {}, cookie = owner) => {
    const r = await fetch(
      base +
        "/api/v1/reports/shipments?" +
        new URLSearchParams({ ...query, ...changes }),
      { headers: cookie ? { Cookie: cookie } : {} },
    );
    return {
      status: r.status,
      body: await r.json(),
      cache: r.headers.get("cache-control"),
    };
  };
  const facts = async () =>
    (
      await db.query(
        "SELECT row_to_json(t) AS fact FROM (SELECT s.*, (SELECT row_to_json(d) FROM logistics.deliveries d WHERE d.shipment_id=s.id) AS delivery FROM logistics.shipments s WHERE s.id=ANY($1::uuid[]) ORDER BY s.id) t",
        [reportIds],
      )
    ).rows;
  const before = await facts();
  await t.test(
    "una fila por despacho, null pendiente y decimales sin datos privados",
    async () => {
      const r = await call();
      assert.equal(r.status, 200);
      assert.equal(r.cache, "no-store");
      assert.deepEqual(
        r.body.items.map((x) => x.shipmentId),
        reportIds.slice(0, 3),
      );
      const [a, b, c] = r.body.items;
      assert.equal(a.quantityKg, "999999999.999");
      assert.equal(a.receivedKg, "999999999.999");
      assert.equal(a.durationSeconds, "5400.001");
      assert.equal(a.departedAt, "2026-01-03T10:00:00.123Z");
      assert.equal(c.durationSeconds, "0.000");
      assert.equal(b.quantityKg, "0.001");
      for (const key of ["receivedKg", "deliveredAt", "durationSeconds"])
        assert.equal(b[key], null);
      assert.ok(
        r.body.items.every((x) => x.unit === "kg" && x.dataIssue === false),
      );
      assert.deepEqual(
        Object.keys(a).sort(),
        [
          "shipmentId",
          "centerId",
          "centerName",
          "lotId",
          "state",
          "quantityKg",
          "receivedKg",
          "unit",
          "departedAt",
          "deliveredAt",
          "durationSeconds",
          "dataIssue",
        ].sort(),
      );
      assert.equal(r.body.timeZone, "UTC");
      assert.equal(r.body.dateField, "departedAt");
      assert.ok(Number.isFinite(Date.parse(r.body.generatedAt)));
      assert.ok(
        (
          await db.query(
            "SELECT count(*)::int AS n FROM inventory.events WHERE shipment_id=$1",
            [a.shipmentId],
          )
        ).rows[0].n > 1,
      );
      const pub = await fetch(base + "/api/public/v1/reports/shipments");
      assert.equal(pub.status, 404);
    },
  );
  await t.test(
    "fronteras de salida y offsets equivalentes, estado y lote",
    async () => {
      const bounded = await call({
        from: "2026-01-03T10:00:00.123Z",
        to: "2026-01-03T11:30:00.123Z",
      });
      assert.deepEqual(
        bounded.body.items.map((x) => x.shipmentId),
        reportIds.slice(0, 2),
      );
      const equivalent = await call({
        from: "2026-01-03T05:00:00.123-05:00",
        to: "2026-01-03T06:30:00.123-05:00",
      });
      assert.deepEqual(equivalent.body.items, bounded.body.items);
      const transit = await call({ state: "in_transit" });
      assert.deepEqual(
        transit.body.items.map((x) => x.shipmentId),
        [reportIds[1]],
      );
      const lot = await call({ lotId: fixtures[2].lotId, state: "delivered" });
      assert.deepEqual(
        lot.body.items.map((x) => x.shipmentId),
        [reportIds[2]],
      );
      const empty = await call({ lotId: crypto.randomUUID() });
      assert.deepEqual(empty.body.items, []);
      assert.equal(empty.body.nextCursor, null);
      assert.equal((await call({ limit: "101" })).status, 422);
      assert.equal(
        (await call({ organizationId: intakeIds.center })).status,
        422,
      );
    },
  );
  await t.test(
    "cursor exclusivo recorre empate sin perder o repetir, última página",
    async () => {
      const seen = [];
      let cursor = {};
      for (let i = 0; i < 3; i++) {
        const r = await call({ limit: "1", ...cursor });
        assert.equal(r.status, 200);
        assert.equal(r.body.items.length, 1);
        seen.push(r.body.items[0].shipmentId);
        cursor = r.body.nextCursor
          ? {
              afterDepartedAt: r.body.nextCursor.departedAt,
              afterShipmentId: r.body.nextCursor.shipmentId,
            }
          : {};
        assert.equal(r.body.nextCursor === null, i === 2);
      }
      assert.deepEqual(seen, reportIds.slice(0, 3));
      assert.equal(new Set(seen).size, 3);
    },
  );
  await t.test(
    "sesión y concesión actuales antes de consultar cualquier centro",
    async () => {
      assert.equal((await call({}, "")).status, 401);
      const foreign = await login("inventario-ajeno@example.test");
      const otherCenter = await login("inventario2@example.test");
      for (const [cookie, centerId] of [
        [foreign, intakeIds.otherCenter],
        [otherCenter, intakeIds.center2],
      ]) {
        const ownCenter = await call({ centerId }, cookie);
        assert.equal(ownCenter.status, 200);
        assert.deepEqual(ownCenter.body.items, []);
      }
      for (const cookie of [
        foreign,
        otherCenter,
        await login("admin@example.test"),
      ]) {
        const r = await call({}, cookie);
        assert.equal(r.status, 403);
        assert.equal(r.body.items, undefined);
      }
      assert.equal(
        (await call({ centerId: intakeIds.otherCenter })).status,
        403,
      );
      const first = await call({ limit: "1" });
      await db.query(
        "DELETE FROM access.center_grants WHERE user_id=$1 AND action='shipment:read' AND center_id=$2",
        [logisticsIds.operator, intakeIds.center],
      );
      try {
        assert.equal(
          (
            await call({
              afterDepartedAt: first.body.nextCursor.departedAt,
              afterShipmentId: first.body.nextCursor.shipmentId,
            })
          ).status,
          403,
        );
      } finally {
        await db.query(
          "INSERT INTO access.center_grants VALUES($1,$2,$3,'shipment:read')",
          [
            logisticsIds.operator,
            intakeIds.center,
            (await services.access.authenticate(owner.split("=")[1]))
              .organizationId,
          ],
        );
      }
      const expired = await login("inventario@example.test");
      await db.query(
        "UPDATE access.sessions SET expires_at=now()-interval '1 second' WHERE user_id=$1",
        [logisticsIds.operator],
      );
      assert.equal((await call({}, expired)).status, 401);
    },
  );
  assert.deepEqual(
    await facts(),
    before,
    "El reporte no modifica hechos históricos",
  );
});
