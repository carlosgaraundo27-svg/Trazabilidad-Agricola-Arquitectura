import { test } from "node:test";
import assert from "node:assert/strict";
import { connectDatabase } from "../../server/db.js";
import { migrate } from "../../scripts/migrate.js";
import { seed, ids } from "../../scripts/seed.js";
import { intakeIds } from "../../scripts/seed-intake.js";
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
});
