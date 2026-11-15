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
  const originalTemperature = () => ({
    value: "18.10",
    unit: "°C",
    measuredAt: "2026-01-02T20:00:00.123Z",
    observedBy: "Responsable ficticio",
    provenance: "Ticket original ficticio",
    method: "Lectura manual documentada",
  });
  const makeLot = async (originalCount = 2) => {
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
          ...(i < originalCount ? { temperature: originalTemperature() } : {}),
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
        (c) => (c.temperatures[0].measuredAt = "2020-01-01T00:00:00Z"),
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
      assert.equal(evaluation.capture.temperatures.length, 1);
      assert.equal(evaluation.receiptTemperatures.length, 2);
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
  const closure = (item, auth = qa, key = crypto.randomUUID(), extra = {}) =>
    call(
      "/quality/evaluations/" + item.id + "/closure",
      "POST",
      {
        expectedVersion: item.version,
        result: "accepted",
        note: "Decisión manual ficticia justificada",
        ...extra,
      },
      auth,
      key,
    );
  await t.test(
    "originales pertenecen a recepción, son inmutables y mantienen responsable/auditoría",
    async () => {
      const read = (
        await call(
          "/quality/evaluations/" + evaluation.id,
          "GET",
          undefined,
          qa,
        )
      ).body;
      assert.deepEqual(read.missingReceiptTemperatureIds, []);
      for (const row of read.receiptTemperatures) {
        assert.equal(row.temperature.value, "18.10");
        assert.equal(row.temperature.unit, "°C");
        assert.equal(row.temperature.measuredAt, "2026-01-02T20:00:00.123Z");
        assert.equal(row.temperature.recordedBy, intakeIds.operator);
        assert.ok(row.temperature.recordedAt);
      }
      for (const sql of [
        "UPDATE intake.receipt_temperatures SET value_c=19 WHERE receipt_id=$1",
        "DELETE FROM intake.receipt_temperatures WHERE receipt_id=$1",
      ])
        await assert.rejects(
          db.query(sql, [lot.contributions[0].receiptId]),
          (e) => e.code === "23514",
        );
      await assert.rejects(
        db.query("TRUNCATE intake.receipt_temperatures"),
        (e) => e.code === "23514",
      );
      assert.equal((await closure(evaluation, qa2)).status, 404);
    },
  );
  await t.test(
    "cierre incompleto y sin originales bloqueado aunque exista lectura posterior; sin ruta alternativa",
    async () => {
      const l = await makeLot(1),
        created = await call(
          "/quality/evaluations",
          "POST",
          { lotId: l.id },
          qa,
          crypto.randomUUID(),
        );
      assert.equal(created.status, 201);
      let e = created.body;
      assert.equal((await closure(e)).status, 422);
      const saved = await call(
        "/quality/evaluations/" + e.id,
        "PUT",
        { expectedVersion: e.version, ...fullCapture() },
        qa,
        crypto.randomUUID(),
      );
      assert.equal(saved.status, 200);
      e = saved.body;
      assert.equal(e.missingReceiptTemperatureIds.length, 1);
      assert.equal(
        e.receiptTemperatures.filter((r) => r.temperature === null).length,
        1,
      );
      for (const result of ["accepted", "observed", "rejected"])
        assert.equal(
          (await closure(e, qa, crypto.randomUUID(), { result })).status,
          422,
        );
      const capture = fullCapture();
      capture.temperatures = [];
      const savedAgain = await call(
        "/quality/evaluations/" + e.id,
        "PUT",
        { expectedVersion: e.version, ...capture },
        qa,
        crypto.randomUUID(),
      );
      assert.equal(savedAgain.status, 200);
      e = savedAgain.body;
      assert.equal((await closure(e)).status, 422);
      const missingId = e.missingReceiptTemperatureIds[0];
      const forged = fullCapture();
      forged.temperatures = [
        {
          ...forged.temperatures[0],
          stage: "receipt",
          sourceReceiptId: missingId,
        },
      ];
      assert.equal(
        (
          await call(
            "/quality/evaluations/" + e.id,
            "PUT",
            { expectedVersion: e.version, ...forged },
            qa,
            crypto.randomUUID(),
          )
        ).status,
        422,
      );
      assert.equal(
        (
          await call(
            "/intake/receipts/" + missingId + "/temperature",
            "POST",
            originalTemperature(),
            op,
            crypto.randomUUID(),
          )
        ).status,
        404,
      );
      assert.equal(
        (
          await call(
            "/quality/evaluations/" + e.id + "/approval",
            "POST",
            {},
            qa,
            crypto.randomUUID(),
          )
        ).status,
        404,
      );
      assert.equal(
        (
          await call(
            "/lots",
            "POST",
            {
              centerId: intakeIds.center,
              receiptIds: [missingId],
              qualityResult: "accepted",
            },
            op,
            crypto.randomUUID(),
          )
        ).status,
        422,
      );
      await assert.rejects(
        db.query(
          "INSERT INTO intake.receipt_temperatures(id,receipt_id,organization_id,center_id,value_c,unit,measured_at,observed_by,provenance,method,recorded_by) VALUES($1,$2,$3,$4,18,'°C',now(),'ficticio','evidencia','manual',$5)",
          [
            crypto.randomUUID(),
            missingId,
            ids.org,
            intakeIds.center,
            intakeIds.operator,
          ],
        ),
        (e) => e.code === "23514",
      );
      await assert.rejects(
        db.query(
          "UPDATE quality.evaluations SET state='closed',result='accepted',note='bypass',closed_by=$1,closed_at=now(),version=version+1 WHERE id=$2",
          [qualityIds.responsible, e.id],
        ),
        (e) => e.code === "23514",
      );
      const read = (
        await call("/quality/evaluations/" + e.id, "GET", undefined, qa)
      ).body;
      assert.equal(read.evaluationState, "draft");
      assert.equal(read.qualityResult, null);
      assert.deepEqual(read.missingReceiptTemperatureIds, [missingId]);
    },
  );
  await t.test(
    "fallos reales de evento y auditoría revierten cierre completo y clave",
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
          "CREATE FUNCTION public.quality_close_test_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'quality close failure'; END; $$",
        );
        await db.query(
          "CREATE TRIGGER quality_close_test_failure BEFORE INSERT ON " +
            target +
            " FOR EACH ROW EXECUTE FUNCTION public.quality_close_test_fail()",
        );
        try {
          assert.equal((await closure(evaluation, qa, key)).status, 500);
        } finally {
          await db.query(
            "DROP TRIGGER quality_close_test_failure ON " + target,
          );
          await db.query("DROP FUNCTION public.quality_close_test_fail()");
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
    "cierre atómico concurrente con todas las originales, replay y protección posterior",
    async () => {
      assert.equal(
        (await closure(evaluation, qa, crypto.randomUUID(), { note: " " }))
          .status,
        422,
      );
      const originals = (
        await call(
          "/quality/evaluations/" + evaluation.id,
          "GET",
          undefined,
          qa,
        )
      ).body.receiptTemperatures;
      const keys = [crypto.randomUUID(), crypto.randomUUID()],
        oldVersion = evaluation.version;
      const both = await Promise.all(
        keys.map((k) => closure(evaluation, qa, k)),
      );
      assert.deepEqual(both.map((r) => r.status).sort(), [201, 409]);
      const winner = both.findIndex((r) => r.status === 201),
        closed = both[winner].body;
      assert.equal(closed.evaluationState, "closed");
      assert.equal(closed.qualityResult, "accepted");
      assert.equal(closed.version, oldVersion + 1);
      assert.equal(closed.closedBy, qualityIds.responsible);
      assert.deepEqual(closed.receiptTemperatures, originals);
      const replay = await closure(evaluation, qa, keys[winner]);
      assert.equal(replay.status, 200);
      assert.deepEqual(replay.body, closed);
      assert.equal((await closure(closed)).status, 409);
      assert.equal((await update(fullCapture(), closed.version)).status, 409);
      await assert.rejects(
        db.query(
          "UPDATE quality.evaluations SET note=note,version=version+1 WHERE id=$1",
          [closed.id],
        ),
        (e) => e.code === "23514",
      );
      await assert.rejects(
        db.query("DELETE FROM quality.evaluations WHERE id=$1", [closed.id]),
        (e) => e.code === "23514",
      );
      await assert.rejects(
        db.query("TRUNCATE quality.evaluations CASCADE"),
        (e) => e.code === "23514",
      );
      assert.equal(closed.events.filter((e) => e.kind === "closed").length, 1);
      assert.deepEqual(
        closed.events.at(-1).payload.receiptTemperatures,
        originals,
      );
      const projection = (
        await call(
          "/quality/lots?centerId=" + intakeIds.center,
          "GET",
          undefined,
          qa,
        )
      ).body.items.find((x) => x.id === lot.id);
      assert.equal(projection.qualityResult, "accepted");
      assert.equal(projection.dispatchAuthorized, false);
      assert.deepEqual(
        (
          await call("/lots?centerId=" + intakeIds.center, "GET", undefined, op)
        ).body.items.find((x) => x.id === lot.id),
        lot,
      );
      await db.query(
        "DELETE FROM access.center_grants WHERE user_id=$1 AND action='quality:close'",
        [qualityIds.responsible],
      );
      try {
        assert.equal((await closure(evaluation, qa, keys[winner])).status, 404);
      } finally {
        await db.query(
          "INSERT INTO access.center_grants VALUES($1,$2,$3,'quality:close')",
          [qualityIds.responsible, intakeIds.center, ids.org],
        );
      }
      evaluation = closed;
    },
  );
  await t.test(
    "observado y rechazado cierran manualmente con originales completos sin alterar cantidades ni despacho",
    async () => {
      for (const result of ["observed", "rejected"]) {
        const l = await makeLot(),
          created = await call(
            "/quality/evaluations",
            "POST",
            { lotId: l.id },
            qa,
            crypto.randomUUID(),
          );
        assert.equal(created.status, 201);
        const saved = await call(
          "/quality/evaluations/" + created.body.id,
          "PUT",
          { expectedVersion: created.body.version, ...fullCapture() },
          qa,
          crypto.randomUUID(),
        );
        assert.equal(saved.status, 200);
        const closed = await closure(saved.body, qa, crypto.randomUUID(), {
          result,
        });
        assert.equal(closed.status, 201);
        assert.equal(closed.body.qualityResult, result);
        assert.equal(closed.body.dispatchAuthorized, false);
        const list = (
          await call(
            "/quality/lots?centerId=" + intakeIds.center,
            "GET",
            undefined,
            qa,
          )
        ).body.items.find((x) => x.id === l.id);
        assert.equal(list.qualityResult, result);
        assert.equal(list.dispatchAuthorized, false);
        assert.deepEqual(
          (
            await call(
              "/lots?centerId=" + intakeIds.center,
              "GET",
              undefined,
              op,
            )
          ).body.items.find((x) => x.id === l.id),
          l,
        );
      }
    },
  );
  await t.test(
    "temperatura original rechaza unidades, precisión, fechas, datos incompletos y actor arbitrario",
    async () => {
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
      const input = {
        centerId: intakeIds.center,
        preLotId: p.body.id,
        reference: "NEG-" + p.body.id,
        grossKg: "100",
        tareKg: "0",
        evidence: "Ticket ficticio",
        temperature: originalTemperature(),
      };
      for (const mutate of [
        (v) => (v.unit = "°F"),
        (v) => (v.value = "1.001"),
        (v) => (v.provenance = ""),
        (v) => (v.observedBy = ""),
        (v) => (v.measuredAt = "2999-01-01T00:00:00Z"),
        (v) => (v.recordedBy = ids.admin),
      ]) {
        const temperature = originalTemperature();
        mutate(temperature);
        assert.equal(
          (
            await call(
              "/intake/receipts",
              "POST",
              { ...input, temperature },
              op,
              crypto.randomUUID(),
            )
          ).status,
          422,
        );
      }
      assert.equal(
        (await call("/intake/receipts", "POST", input, qa, crypto.randomUUID()))
          .status,
        403,
      );
      assert.equal(
        (
          await db.query(
            "SELECT count(*) FROM intake.receipts WHERE pre_lot_id=$1",
            [p.body.id],
          )
        ).rows[0].count,
        "0",
      );
    },
  );
  await t.test(
    "original, recepción, evento y auditoría se revierten juntos ante fallo real",
    async () => {
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
      const input = {
        centerId: intakeIds.center,
        preLotId: p.body.id,
        reference: "ROLL-" + p.body.id,
        grossKg: "100",
        tareKg: "0",
        evidence: "Ticket ficticio",
        temperature: originalTemperature(),
      };
      for (const target of ["intake.events", "access.audit"]) {
        const key = crypto.randomUUID();
        await db.query(
          "CREATE FUNCTION public.receipt_original_test_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'receipt original failure'; END; $$",
        );
        await db.query(
          "CREATE TRIGGER receipt_original_test_failure BEFORE INSERT ON " +
            target +
            " FOR EACH ROW EXECUTE FUNCTION public.receipt_original_test_fail()",
        );
        try {
          assert.equal(
            (await call("/intake/receipts", "POST", input, op, key)).status,
            500,
          );
        } finally {
          await db.query(
            "DROP TRIGGER receipt_original_test_failure ON " + target,
          );
          await db.query("DROP FUNCTION public.receipt_original_test_fail()");
        }
        assert.equal(
          (
            await db.query(
              "SELECT count(*) FROM intake.receipts WHERE pre_lot_id=$1",
              [p.body.id],
            )
          ).rows[0].count,
          "0",
        );
        assert.equal(
          (
            await db.query(
              "SELECT count(*) FROM intake.requests WHERE request_key=$1",
              [key],
            )
          ).rows[0].count,
          "0",
        );
      }
      const key = crypto.randomUUID(),
        r = await call("/intake/receipts", "POST", input, op, key);
      assert.equal(r.status, 201);
      assert.equal(r.body.originalTemperature.recordedBy, intakeIds.operator);
      const replay = await call("/intake/receipts", "POST", input, op, key);
      assert.equal(replay.status, 200);
      assert.deepEqual(replay.body, r.body);
    },
  );
});
