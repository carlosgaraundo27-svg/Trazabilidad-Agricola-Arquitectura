import { test } from "node:test";
import assert from "node:assert/strict";
import { connectDatabase } from "../../server/db.js";
import { migrate } from "../../scripts/migrate.js";
import { seed, ids } from "../../scripts/seed.js";
import { intakeIds } from "../../scripts/seed-intake.js";
import { qualityIds } from "../../scripts/seed-quality.js";
import { compose } from "../../server/composition.js";
import { createApp } from "../../server/http.js";
test("Calidad HTTP/PostgreSQL: captura autorizada persistida y auditada", async (t) => {
  if (process.env.TEST_ALLOW_DB_WRITE !== "true")
    throw Error("DB dedicada requerida");
  const db = await connectDatabase();
  await migrate(db);
  await seed(db, "Fiction-only-2026!");
  const server = createApp({ db, services: compose(db), log: () => {} }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise((r) => server.once("listening", r));
  t.after(async () => {
    await new Promise((r) => server.close(r));
    await db.close();
  });
  const base = "http://127.0.0.1:" + server.address().port + "/api/v1";
  const call = async (path, method = "GET", body, auth = {}, key) => {
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
  };
  const login = async (email) => {
    const r = await call("/auth/login", "POST", {
      email,
      password: "Fiction-only-2026!",
    });
    assert.equal(r.status, 200);
    return { cookie: r.cookie, csrf: r.body.csrfToken };
  };
  const field = await login("campo@example.test"),
    op = await login("acopio@example.test"),
    qa = await login("calidad@example.test"),
    qa2 = await login("calidad2@example.test");
  const makeLot = async () => {
    const receipts = [];
    for (let i = 0; i < 2; i++) {
      const p = await call(
        "/pre-lots",
        "POST",
        {
          parcelId: ids.parcel,
          harvestedAt: "2026-01-02T12:00:00Z",
          quantity: "100",
          unit: "kg",
        },
        field,
        crypto.randomUUID(),
      );
      assert.equal(p.status, 201);
      const r = await call(
        "/intake/receipts",
        "POST",
        {
          centerId: intakeIds.center,
          preLotId: p.body.id,
          reference: "Q-" + p.body.id,
          grossKg: "100",
          tareKg: "0",
          evidence: "Ticket ficticio",
        },
        op,
        crypto.randomUUID(),
      );
      assert.equal(r.status, 201);
      assert.equal(
        (
          await call(
            "/intake/receipts/" + r.body.id + "/confirmation",
            "POST",
            {},
            op,
            crypto.randomUUID(),
          )
        ).status,
        201,
      );
      receipts.push(r.body.id);
    }
    const l = await call(
      "/lots",
      "POST",
      { centerId: intakeIds.center, receiptIds: receipts },
      op,
      crypto.randomUUID(),
    );
    assert.equal(l.status, 201);
    return l.body;
  };
  const lot = await makeLot();
  let evaluation;
  await t.test(
    "creación única por lote, replay normalizado y acceso por centro",
    async () => {
      const key = crypto.randomUUID(),
        input = { lotId: lot.id };
      const r = await call("/quality/evaluations", "POST", input, qa, key);
      assert.equal(r.status, 201);
      evaluation = r.body;
      assert.equal(evaluation.evaluationState, "draft");
      assert.equal(evaluation.version, 1);
      assert.equal(evaluation.qualityResult, null);
      const replay = await call(
        "/quality/evaluations",
        "POST",
        { lotId: lot.id.toUpperCase() },
        qa,
        key.toUpperCase(),
      );
      assert.equal(replay.status, 200);
      assert.deepEqual(replay.body, r.body);
      assert.equal(
        (
          await call(
            "/quality/evaluations",
            "POST",
            input,
            qa,
            crypto.randomUUID(),
          )
        ).status,
        409,
      );
      assert.equal(
        (
          await call(
            "/quality/evaluations/" + evaluation.id,
            "GET",
            undefined,
            qa2,
          )
        ).status,
        404,
      );
      assert.equal(
        (
          await call(
            "/quality/evaluations/" + evaluation.id,
            "GET",
            undefined,
            op,
          )
        ).status,
        404,
      );
      assert.equal(
        (
          await call(
            "/quality/lots?centerId=" + intakeIds.center,
            "GET",
            undefined,
            qa2,
          )
        ).status,
        403,
      );
      const list = await call(
        "/quality/lots?centerId=" + intakeIds.center,
        "GET",
        undefined,
        qa,
      );
      assert.equal(list.status, 200);
      assert.equal(
        list.body.items.find((x) => x.id === lot.id).evaluationId,
        evaluation.id,
      );
      assert.equal(
        (await call("/quality/evaluations/" + evaluation.id)).status,
        401,
      );
    },
  );
  await t.test(
    "captura incompleta persistida, SQL y auditoría transaccionales",
    async () => {
      const body = {
        expectedVersion: evaluation.version,
        sample: null,
        weights: [],
        dryMatter: null,
        discard: null,
        temperatures: [],
      };
      const r = await call(
        "/quality/evaluations/" + evaluation.id,
        "PUT",
        body,
        qa,
        crypto.randomUUID(),
      );
      assert.equal(r.status, 200);
      evaluation = r.body;
      assert.equal(r.body.version, 2);
      const read = await call(
        "/quality/evaluations/" + evaluation.id,
        "GET",
        undefined,
        qa,
      );
      assert.deepEqual(read.body, r.body);
      assert.equal(read.body.events.length, 2);
      assert.equal(read.body.dispatchAuthorized, false);
      assert.equal(
        (
          await db.query(
            "SELECT count(*) FROM access.audit WHERE resource_id=$1",
            [evaluation.id],
          )
        ).rows[0].count,
        "2",
      );
      assert.equal(
        (
          await call(
            "/quality/evaluations/" + evaluation.id,
            "PUT",
            body,
            qa,
            crypto.randomUUID(),
          )
        ).status,
        409,
      );
    },
  );
  const metadata = {
    measuredAt: "2026-01-02T20:00:00.000Z",
    observedBy: "Responsable ficticio",
    provenance: "Informe ficticio",
    method: "Método documentado ficticio",
  };
  const fullCapture = () => ({
    sample: {
      reference: "M-" + lot.id,
      sampledAt: metadata.measuredAt,
      sampledBy: "Responsable ficticio",
      provenance: "Muestra del lote ficticio",
    },
    weights: [
      { ...metadata, fruitReference: "F1", value: "210.25", unit: "g/fruto" },
    ],
    dryMatter: { ...metadata, value: "23.10", unit: "%" },
    discard: {
      ...metadata,
      inspectedCount: 3,
      discardedCount: 1,
      unit: "frutos",
    },
    temperatures: [
      ...lot.contributions.map((c) => ({
        ...metadata,
        value: "18.10",
        unit: "°C",
        stage: "receipt",
        sourceReceiptId: c.receiptId,
      })),
      {
        ...metadata,
        measuredAt: new Date().toISOString(),
        value: "-1.50",
        unit: "°C",
        stage: "post_consolidation",
        sourceReceiptId: null,
      },
    ],
  });
  const update = (
    capture,
    version = evaluation.version,
    auth = qa,
    key = crypto.randomUUID(),
  ) =>
    call(
      "/quality/evaluations/" + evaluation.id,
      "PUT",
      { expectedVersion: version, ...capture },
      auth,
      key,
    );
  await t.test(
    "unidades, conteos, precisión, futuro y vínculos de recepción inválidos no alteran borrador",
    async () => {
      const before = await call(
        "/quality/evaluations/" + evaluation.id,
        "GET",
        undefined,
        qa,
      );
      for (const mutate of [
        (c) => (c.weights[0].unit = "kg"),
        (c) => (c.dryMatter.unit = "humidity"),
        (c) => (c.temperatures[0].unit = "°F"),
        (c) => (c.weights[0].value = "1.001"),
        (c) => (c.dryMatter.value = "100.01"),
        (c) => (c.discard.discardedCount = 4),
        (c) => (c.discard.inspectedCount = 0),
        (c) => (c.temperatures[0].sourceReceiptId = crypto.randomUUID()),
        (c) => (c.temperatures[0].measuredAt = "2999-01-01T00:00:00Z"),
        (c) => (c.temperatures[2].measuredAt = "2020-01-01T00:00:00Z"),
        (c) => (c.actorId = ids.admin),
      ]) {
        const capture = fullCapture();
        mutate(capture);
        assert.equal((await update(capture)).status, 422);
      }
      assert.deepEqual(
        (
          await call(
            "/quality/evaluations/" + evaluation.id,
            "GET",
            undefined,
            qa,
          )
        ).body,
        before.body,
      );
      assert.equal(
        (await update(fullCapture(), evaluation.version, qa2)).status,
        404,
      );
    },
  );
  await t.test(
    "fallos reales de eventos/auditoría revierten datos, versión y clave de borrador",
    async () => {
      for (const target of ["quality.events", "access.audit"]) {
        const before = (
            await call(
              "/quality/evaluations/" + evaluation.id,
              "GET",
              undefined,
              qa,
            )
          ).body,
          key = crypto.randomUUID();
        await db.query(
          "CREATE FUNCTION public.quality_test_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'quality test failure'; END; $$",
        );
        await db.query(
          "CREATE TRIGGER quality_test_failure BEFORE INSERT ON " +
            target +
            " FOR EACH ROW EXECUTE FUNCTION public.quality_test_fail()",
        );
        try {
          assert.equal(
            (await update(fullCapture(), evaluation.version, qa, key)).status,
            500,
          );
        } finally {
          await db.query("DROP TRIGGER quality_test_failure ON " + target);
          await db.query("DROP FUNCTION public.quality_test_fail()");
        }
        assert.deepEqual(
          (
            await call(
              "/quality/evaluations/" + evaluation.id,
              "GET",
              undefined,
              qa,
            )
          ).body,
          before,
        );
        assert.equal(
          (
            await db.query(
              "SELECT count(*) FROM quality.requests WHERE request_key=$1",
              [key],
            )
          ).rows[0].count,
          "0",
        );
      }
    },
  );
  await t.test(
    "captura completa exacta y dos ediciones concurrentes con versión esperada",
    async () => {
      const capture = fullCapture(),
        version = evaluation.version;
      const parallel = await Promise.all([
        update(capture, version),
        update(capture, version),
      ]);
      assert.deepEqual(parallel.map((r) => r.status).sort(), [200, 409]);
      evaluation = parallel.find((r) => r.status === 200).body;
      assert.equal(evaluation.discardPercentage, "33.33");
      assert.equal(evaluation.capture.temperatures.length, 3);
      assert.equal(evaluation.capture.weights[0].value, "210.25");
      assert.equal(evaluation.qualityResult, null);
    },
  );
  await t.test(
    "permiso revocado bloquea replay y calidad no concede revisión de discrepancias",
    async () => {
      const key = crypto.randomUUID(),
        capture = fullCapture(),
        version = evaluation.version;
      const r = await update(capture, version, qa, key);
      assert.equal(r.status, 200);
      evaluation = r.body;
      assert.equal(
        (await update({ ...capture, weights: [] }, version, qa, key)).status,
        409,
      );
      await db.query(
        "DELETE FROM access.center_grants WHERE user_id=$1 AND action='quality:update'",
        [qualityIds.responsible],
      );
      try {
        assert.equal((await update(capture, version, qa, key)).status, 404);
      } finally {
        await db.query(
          "INSERT INTO access.center_grants VALUES($1,$2,$3,'quality:update')",
          [qualityIds.responsible, intakeIds.center, ids.org],
        );
      }
      assert.equal(
        (
          await db.query(
            "SELECT count(*) FROM access.center_grants WHERE user_id=$1 AND action='intake:review'",
            [qualityIds.responsible],
          )
        ).rows[0].count,
        "0",
      );
    },
  );
  await t.test(
    "historia y claves inmutables; sin cambios en masa, aportes o consolidación",
    async () => {
      for (const sql of [
        "UPDATE quality.events SET kind=kind WHERE evaluation_id=$1",
        "DELETE FROM quality.events WHERE evaluation_id=$1",
        "DELETE FROM quality.evaluations WHERE id=$1",
      ])
        await assert.rejects(
          db.query(sql, [evaluation.id]),
          (e) => e.code === "23514",
        );
      await assert.rejects(
        db.query("TRUNCATE quality.events"),
        (e) => e.code === "23514",
      );
      const stored = (
        await call("/lots?centerId=" + intakeIds.center, "GET", undefined, op)
      ).body.items.find((l) => l.id === lot.id);
      assert.deepEqual(stored, lot);
      assert.equal(stored.totalKg, "200.000");
      assert.equal(stored.dispatchAuthorized, false);
    },
  );
});
