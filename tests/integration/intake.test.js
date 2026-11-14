import { test } from "node:test";
import assert from "node:assert/strict";
import { connectDatabase } from "../../server/db.js";
import { migrate } from "../../scripts/migrate.js";
import { seed, ids } from "../../scripts/seed.js";
import { intakeIds } from "../../scripts/seed-intake.js";
import { compose } from "../../server/composition.js";
import { createApp } from "../../server/http.js";
const password = "Fiction-only-2026!";
test("Acopio HTTP y PostgreSQL: integridad y ámbito", async (t) => {
  if (process.env.TEST_ALLOW_DB_WRITE !== "true")
    throw Error("DB de pruebas requerida.");
  const db = await connectDatabase();
  await migrate(db);
  await migrate(db);
  await seed(db, password);
  const server = createApp({ db, services: compose(db), log: () => {} }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await db.close();
  });
  const base = "http://127.0.0.1:" + server.address().port + "/api/v1";
  async function call(path, method = "GET", body, auth = {}, key) {
    const r = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(auth.cookie
          ? { Cookie: auth.cookie, "X-CSRF-Token": auth.csrf }
          : {}),
        ...(key ? { "Idempotency-Key": key } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return {
      status: r.status,
      body: await r.json(),
      cookie: r.headers.get("set-cookie")?.split(";")[0],
    };
  }
  async function login(email) {
    const r = await call("/auth/login", "POST", { email, password });
    assert.equal(r.status, 200);
    return { cookie: r.cookie, csrf: r.body.csrfToken };
  }
  const op = await login("acopio@example.test"),
    reviewer = await login("responsable@example.test"),
    c2 = await login("acopio2@example.test"),
    dual = await login("doble@example.test"),
    field = await login("campo@example.test");
  async function prelot(
    quantity = "100",
    parcelId = ids.parcel,
    harvestedAt = "2026-01-02T12:00:00Z",
    unit = "kg",
  ) {
    const r = await call(
      "/pre-lots",
      "POST",
      { parcelId, harvestedAt, quantity, unit },
      field,
      crypto.randomUUID(),
    );
    assert.equal(r.status, 201);
    return r.body;
  }
  const receive = (
    p,
    grossKg = p.quantity,
    auth = op,
    key = crypto.randomUUID(),
    extra = {},
  ) =>
    call(
      "/intake/receipts",
      "POST",
      {
        centerId: intakeIds.center,
        preLotId: p.id,
        reference: "T-" + p.id,
        grossKg,
        tareKg: "0",
        evidence: "Ticket ficticio",
        ...extra,
      },
      auth,
      key,
    );
  const confirm = (r, auth = op, key = crypto.randomUUID()) =>
    call(`/intake/receipts/${r.id}/confirmation`, "POST", {}, auth, key);
  const review = (r, auth = reviewer, key = crypto.randomUUID()) =>
    call(
      `/intake/receipts/${r.id}/reviews`,
      "POST",
      { note: "Medición y origen revisados para el prototipo" },
      auth,
      key,
    );
  const consolidate = (
    receipts,
    auth = op,
    key = crypto.randomUUID(),
    centerId = intakeIds.center,
  ) =>
    call(
      "/lots",
      "POST",
      { centerId, receiptIds: receipts.map((r) => r.id) },
      auth,
      key,
    );
  await t.test(
    "recibe, confirma y consolida composición exacta sin calidad ni despacho",
    async () => {
      const pa = await prelot(),
        pb = await prelot("40");
      const ra = await receive(pa),
        rb = await receive(pb);
      assert.equal(ra.status, 201);
      assert.equal(rb.status, 201);
      assert.equal(ra.body.netKg, "100.000");
      assert.equal(ra.body.status, "weighed");
      assert.equal((await confirm(ra.body)).status, 201);
      assert.equal((await confirm(rb.body)).status, 201);
      const key = crypto.randomUUID();
      const lot = await consolidate([ra.body, rb.body], op, key);
      assert.equal(lot.status, 201);
      assert.equal(lot.body.totalKg, "140.000");
      assert.equal(lot.body.qualityStatus, "pending_quality");
      assert.equal(lot.body.dispatchAuthorized, false);
      assert.deepEqual(
        new Set(lot.body.contributions.map((a) => a.origin.id)),
        new Set([pa.id, pb.id]),
      );
      assert.deepEqual(
        (await consolidate([rb.body, ra.body], op, key)).body,
        lot.body,
      );
      const listed = await call(
        "/lots?centerId=" + intakeIds.center,
        "GET",
        undefined,
        op,
      );
      assert.equal(
        listed.body.items.find((l) => l.id === lot.body.id).totalKg,
        "140.000",
      );
      assert.equal(
        (
          await db.query(
            "SELECT quantity::text FROM harvest.harvests WHERE id=$1",
            [pa.harvestId],
          )
        ).rows[0].quantity,
        "100.000",
      );
    },
  );
  await t.test(
    "discrepancia requiere revisión y confirmación separadas; no autoaprobación",
    async () => {
      const p = await prelot(),
        r = await receive(p, "98", dual);
      assert.equal(r.body.status, "pending_review");
      assert.equal(r.body.differenceKg, "-2.000");
      assert.equal((await confirm(r.body)).status, 409);
      assert.equal((await consolidate([r.body])).status, 409);
      assert.equal((await review(r.body, dual)).status, 403);
      assert.equal((await review(r.body)).status, 201);
      assert.equal((await consolidate([r.body])).status, 409);
      assert.equal((await confirm(r.body)).status, 201);
      assert.equal((await consolidate([r.body])).body.totalKg, "98.000");
    },
  );
  await t.test(
    "permisos por centro y acción, origen ajeno y administrador sin herencia",
    async () => {
      const p = await prelot(),
        r = await receive(p);
      assert.equal((await receive(await prelot(), "100", c2)).status, 403);
      assert.equal((await confirm(r.body, c2)).status, 404);
      assert.equal(
        (
          await call(
            "/intake/receipts?centerId=" + intakeIds.center,
            "GET",
            undefined,
            c2,
          )
        ).status,
        403,
      );
      assert.equal(
        (await call("/lots?centerId=" + intakeIds.center, "GET", undefined, c2))
          .status,
        403,
      );
      assert.equal((await receive(await prelot(), "100", field)).status, 403);
      const admin = await login("admin@example.test");
      assert.equal((await receive(await prelot(), "100", admin)).status, 403);
      assert.equal(
        (await call("/intake/centers", "GET", undefined, c2)).body.items[0].id,
        intakeIds.center2,
      );
      const otherField = await login("otro@example.test");
      const alien = await call(
        "/pre-lots",
        "POST",
        {
          parcelId: ids.otherParcel,
          harvestedAt: "2026-01-02T12:00:00Z",
          quantity: "100",
          unit: "kg",
        },
        otherField,
        crypto.randomUUID(),
      );
      assert.equal(alien.status, 201);
      assert.equal((await receive(alien.body)).status, 404);
    },
  );
  await t.test(
    "rechaza mezcla por parcela/productor o fecha local sin consumir saldo",
    async () => {
      const admin = await login("admin@example.test");
      const producer = await call(
        "/producers",
        "POST",
        { name: "Otro productor ficticio" },
        admin,
      );
      const parcel = await call(
        "/parcels",
        "POST",
        {
          producerId: producer.body.id,
          name: "Otra parcela ficticia",
          latitude: -12,
          longitude: -76,
        },
        admin,
      );
      await db.query("INSERT INTO access.parcel_assignments VALUES($1,$2,$3)", [
        ids.collector,
        parcel.body.id,
        ids.org,
      ]);
      const receipts = [];
      for (const p of [
        await prelot(),
        await prelot("40", parcel.body.id),
        await prelot("30", ids.parcel, "2026-01-03T12:00:00Z"),
      ]) {
        const r = await receive(p);
        assert.equal(r.status, 201);
        await confirm(r.body);
        receipts.push(r.body);
      }
      assert.equal((await consolidate(receipts.slice(0, 2))).status, 422);
      assert.equal((await consolidate([receipts[0], receipts[2]])).status, 422);
      const list = await call(
        "/intake/receipts?centerId=" + intakeIds.center,
        "GET",
        undefined,
        op,
      );
      for (const r of receipts)
        assert.equal(
          list.body.items.find((x) => x.id === r.id).availableKg,
          r.netKg,
        );
      const c2r = await receive(
        await prelot(),
        "100",
        c2,
        crypto.randomUUID(),
        { centerId: intakeIds.center2 },
      );
      assert.equal(c2r.status, 201);
      await confirm(c2r.body, c2);
      assert.equal((await consolidate([receipts[0], c2r.body])).status, 404);
    },
  );
  await t.test(
    "unicidad física: pre-lote completo y referencia por centro",
    async () => {
      const p = await prelot(),
        reference = "REF-" + crypto.randomUUID();
      assert.equal(
        (await receive(p, "100", op, crypto.randomUUID(), { reference }))
          .status,
        201,
      );
      assert.equal(
        (
          await receive(p, "100", op, crypto.randomUUID(), {
            reference: reference + "-otra",
          })
        ).status,
        409,
      );
      assert.equal(
        (
          await receive(await prelot(), "100", op, crypto.randomUUID(), {
            reference,
          })
        ).status,
        409,
      );
      assert.equal(
        (
          await receive(await prelot(), "100", c2, crypto.randomUUID(), {
            reference,
            centerId: intakeIds.center2,
          })
        ).status,
        201,
      );
    },
  );
  await t.test(
    "recepción/revisión/confirmación idempotentes y revalidación tras revocar concesión",
    async () => {
      const p = await prelot(),
        key = crypto.randomUUID();
      const responses = await Promise.all([
        receive(p, "98", op, key),
        receive(p, "98", op, key),
      ]);
      assert.deepEqual(responses.map((r) => r.status).sort(), [200, 201]);
      assert.equal(responses[0].body.id, responses[1].body.id);
      const r = responses[0].body,
        rk = crypto.randomUUID(),
        ck = crypto.randomUUID();
      assert.equal((await receive(p, "97", op, key)).status, 409);
      const approved = await review(r, reviewer, rk);
      assert.equal(approved.status, 201);
      assert.deepEqual((await review(r, reviewer, rk)).body, approved.body);
      const confirmed = await confirm(r, op, ck);
      assert.equal(confirmed.status, 201);
      assert.deepEqual((await confirm(r, op, ck)).body, confirmed.body);
      assert.equal((await confirm(r, op, key)).status, 409);
      await db.query(
        "DELETE FROM access.center_grants WHERE user_id=$1 AND center_id=$2 AND action='intake:receive'",
        [intakeIds.operator, intakeIds.center],
      );
      try {
        assert.equal((await receive(p, "98", op, key)).status, 403);
      } finally {
        await db.query("INSERT INTO access.center_grants VALUES($1,$2,$3,$4)", [
          intakeIds.operator,
          intakeIds.center,
          ids.org,
          "intake:receive",
        ]);
      }
    },
  );
  await t.test(
    "doble consumo concurrente con claves distintas y replay concurrente de lote",
    async () => {
      const r = (await receive(await prelot())).body;
      await confirm(r);
      const results = await Promise.all([consolidate([r]), consolidate([r])]);
      assert.deepEqual(results.map((x) => x.status).sort(), [201, 409]);
      assert.equal(
        Number(
          (
            await db.query(
              "SELECT count(*) AS n FROM traceability.contributions WHERE receipt_id=$1",
              [r.id],
            )
          ).rows[0].n,
        ),
        1,
      );
      const r2 = (await receive(await prelot())).body;
      await confirm(r2);
      const key = crypto.randomUUID();
      const replay = await Promise.all([
        consolidate([r2], op, key),
        consolidate([r2], op, key),
      ]);
      assert.deepEqual(replay.map((x) => x.status).sort(), [200, 201]);
      assert.deepEqual(replay[0].body, replay[1].body);
    },
  );
  await t.test(
    "dimensiones distintas no se convierten y exceso no modifica declaración",
    async () => {
      const p = await prelot("20", ids.parcel, undefined, "unidad"),
        r = await receive(p, "18");
      assert.equal(r.body.differenceKg, null);
      assert.equal(r.body.reviewReason, "different_unit");
      assert.equal(r.body.origin.quantity, "20.000");
      assert.equal(r.body.origin.unit, "unidad");
      assert.equal((await confirm(r.body)).status, 409);
      await review(r.body);
      await confirm(r.body);
      assert.equal((await consolidate([r.body])).body.totalKg, "18.000");
      const over = await receive(await prelot(), "103");
      assert.equal(over.body.differenceKg, "3.000");
      assert.equal(over.body.origin.quantity, "100.000");
    },
  );
  await t.test(
    "fallos reales de evento revierten recepción, revisión, confirmación y lote",
    async () => {
      async function failEvent(table, kind, action, check) {
        await db.query(
          `ALTER TABLE ${table} ADD CONSTRAINT test_event_failure CHECK(kind<>'${kind}') NOT VALID`,
        );
        try {
          const result = await action();
          assert.equal(result.status, 500);
          assert.equal(result.body.error.code, "INTERNAL_ERROR");
          await check();
        } finally {
          await db.query(
            `ALTER TABLE ${table} DROP CONSTRAINT test_event_failure`,
          );
        }
      }
      const p = await prelot();
      await failEvent(
        "intake.events",
        "received",
        () => receive(p),
        async () =>
          assert.equal(
            Number(
              (
                await db.query(
                  "SELECT count(*) AS n FROM intake.receipts WHERE pre_lot_id=$1",
                  [p.id],
                )
              ).rows[0].n,
            ),
            0,
          ),
      );
      const r = (await receive(p, "98")).body;
      await failEvent(
        "intake.events",
        "reviewed",
        () => review(r),
        async () =>
          assert.equal(
            Number(
              (
                await db.query(
                  "SELECT count(*) AS n FROM intake.reviews WHERE receipt_id=$1",
                  [r.id],
                )
              ).rows[0].n,
            ),
            0,
          ),
      );
      await review(r);
      await failEvent(
        "intake.events",
        "confirmed",
        () => confirm(r),
        async () =>
          assert.equal(
            Number(
              (
                await db.query(
                  "SELECT count(*) AS n FROM intake.confirmations WHERE receipt_id=$1",
                  [r.id],
                )
              ).rows[0].n,
            ),
            0,
          ),
      );
      await confirm(r);
      const before = Number(
        (await db.query("SELECT count(*) AS n FROM traceability.lots")).rows[0]
          .n,
      );
      await failEvent(
        "traceability.events",
        "consolidated",
        () => consolidate([r]),
        async () => {
          assert.equal(
            Number(
              (await db.query("SELECT count(*) AS n FROM traceability.lots"))
                .rows[0].n,
            ),
            before,
          );
          assert.equal(
            Number(
              (
                await db.query(
                  "SELECT count(*) AS n FROM traceability.contributions WHERE receipt_id=$1",
                  [r.id],
                )
              ).rows[0].n,
            ),
            0,
          );
        },
      );
      assert.equal((await consolidate([r])).status, 201);
    },
  );
  await t.test(
    "fallo de auditoría revierte recepción e idempotencia",
    async () => {
      const p = await prelot(),
        key = crypto.randomUUID();
      await db.query(
        "ALTER TABLE access.audit ADD CONSTRAINT test_intake_audit CHECK(action NOT LIKE 'intake:%') NOT VALID",
      );
      try {
        assert.equal((await receive(p, "100", op, key)).status, 500);
        assert.equal(
          Number(
            (
              await db.query(
                "SELECT count(*) AS n FROM intake.requests WHERE request_key=$1",
                [key],
              )
            ).rows[0].n,
          ),
          0,
        );
      } finally {
        await db.query(
          "ALTER TABLE access.audit DROP CONSTRAINT test_intake_audit",
        );
      }
      assert.equal((await receive(p, "100", op, key)).status, 201);
    },
  );
  await t.test(
    "SQL protege hechos cerrados, autoaprobación y aporte completo",
    async () => {
      const r = (await receive(await prelot(), "98", dual)).body;
      await assert.rejects(
        () =>
          db.query(
            "INSERT INTO intake.reviews(id,receipt_id,organization_id,approved_by,note) VALUES($1,$2,$3,$4,$5)",
            [
              crypto.randomUUID(),
              r.id,
              ids.org,
              intakeIds.dual,
              "Autoaprobación",
            ],
          ),
        { code: "23514" },
      );
      await review(r);
      await confirm(r);
      const lot = (await consolidate([r])).body;
      await assert.rejects(
        () =>
          db.query("UPDATE intake.receipts SET gross_kg=150 WHERE id=$1", [
            r.id,
          ]),
        { code: "23514" },
      );
      await assert.rejects(
        () => db.query("DELETE FROM intake.events WHERE receipt_id=$1", [r.id]),
        { code: "23514" },
      );
      await assert.rejects(
        () =>
          db.query(
            "UPDATE traceability.contributions SET amount_kg=1 WHERE lot_id=$1",
            [lot.id],
          ),
        { code: "23514" },
      );
      const extra = (await receive(await prelot())).body;
      await confirm(extra);
      await assert.rejects(
        () =>
          db.transaction(async (tx) => {
            await tx.query(
              "INSERT INTO traceability.contributions(id,lot_id,receipt_id,organization_id,center_id,amount_kg,origin,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
              [
                crypto.randomUUID(),
                lot.id,
                extra.id,
                ids.org,
                intakeIds.center,
                extra.netKg,
                JSON.stringify(extra.origin),
                intakeIds.operator,
              ],
            );
            throw Error("Se aceptó agregar composición a un lote cerrado");
          }),
        { code: "23514" },
      );
    },
  );
});
