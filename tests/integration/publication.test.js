import { test } from "node:test";
import assert from "node:assert/strict";
import { connectDatabase } from "../../server/db.js";
import { compose } from "../../server/composition.js";
import { createApp } from "../../server/http.js";
import { migrate } from "../../scripts/migrate.js";
import { seed } from "../../scripts/seed.js";
import { intakeIds } from "../../scripts/seed-intake.js";
import {
  publicationLot,
  demoProjection,
} from "../support/publication-fixture.js";
test("Publicación HTTP/PostgreSQL y caché por puerto", async (t) => {
  if (process.env.TEST_ALLOW_DB_WRITE !== "true")
    throw Error("DB de pruebas requerida");
  const db = await connectDatabase();
  await migrate(db);
  await seed(db, "Fiction-only-2026!");
  const entries = new Map();
  let fail = false,
    failDelete = false,
    hits = 0,
    writes = 0;
  const cache = {
    get: async (key) => {
      if (fail) throw Error("Redis GET caído");
      hits++;
      return entries.get(key);
    },
    set: async (key, value, ttl) => {
      if (fail) throw Error("Redis SET caído");
      assert.equal(ttl, 300);
      writes++;
      entries.set(key, value);
    },
    delete: async (key) => {
      if (fail || failDelete) throw Error("Redis DELETE caído");
      entries.delete(key);
    },
  };
  const services = compose(db, {
    cache,
    baseUrl: "https://public.example.test",
  });
  const lot = await publicationLot(services, "Fiction-only-2026!");
  const server = createApp({ db, services, log: () => {} }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise((r) => server.once("listening", r));
  t.after(async () => {
    await new Promise((r) => server.close(r));
    await db.close();
  });
  const base = "http://127.0.0.1:" + server.address().port;
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
      headers: r.headers,
      body: r.headers.get("Content-Type")?.includes("json")
        ? await r.json()
        : Buffer.from(await r.arrayBuffer()),
    };
  };
  const login = async (email) => {
    const r = await call("/api/v1/auth/login", "POST", {
      email,
      password: "Fiction-only-2026!",
    });
    assert.equal(r.status, 200);
    return {
      cookie: r.headers.get("set-cookie").split(";")[0],
      csrf: r.body.csrfToken,
    };
  };
  const owner = await login("publicacion@example.test"),
    other = await login("publicacion2@example.test"),
    foreign = await login("publicacion-ajena@example.test"),
    admin = await login("admin@example.test");
  const path = "/api/v1/publications/lots/" + lot.id;
  const publish = (
    content = demoProjection,
    version = 0,
    key = crypto.randomUUID(),
    auth = owner,
  ) => call(path, "POST", { expectedVersion: version, ...content }, auth, key);
  let publication;
  await t.test(
    "no publicado, permisos por acción/centro/organización y lista acotada",
    async () => {
      assert.equal(
        (await call(path, "GET", undefined, owner)).body.state,
        "unpublished",
      );
      for (const auth of [other, foreign, admin]) {
        assert.equal((await call(path, "GET", undefined, auth)).status, 404);
        assert.equal(
          (await publish(demoProjection, 0, crypto.randomUUID(), auth)).status,
          404,
        );
      }
      assert.equal((await call(path)).status, 401);
      assert.equal(
        (
          await call(
            "/api/v1/publications/lots?centerId=" + intakeIds.center,
            "GET",
            undefined,
            other,
          )
        ).status,
        403,
      );
      for (const id of [lot.id, "invalid", crypto.randomUUID()])
        assert.equal((await call("/api/public/v1/lots/" + id)).status, 404);
      const list = await call(
        "/api/v1/publications/lots?centerId=" + intakeIds.center,
        "GET",
        undefined,
        owner,
      );
      assert.equal(list.body.limit, 100);
      assert.ok(list.body.items.some((x) => x.id === lot.id));
    },
  );
  await t.test(
    "publicar explícitamente, replay y DTO sin campos ni valores privados",
    async () => {
      assert.equal(
        (await publish({ ...demoProjection, note: "Privado" })).status,
        422,
      );
      const key = crypto.randomUUID(),
        r = await publish(demoProjection, 0, key);
      assert.equal(r.status, 201);
      publication = r.body;
      assert.notEqual(publication.publicId, lot.id);
      assert.match(publication.publicId, /^[a-f0-9-]{36}$/);
      assert.equal(
        publication.url,
        "https://public.example.test/q/" + publication.publicId,
      );
      assert.deepEqual(
        (await publish(demoProjection, 0, key)).body,
        publication,
      );
      assert.equal(
        (await publish({ ...demoProjection, lotCode: "OTHER" }, 0, key)).status,
        409,
      );
      const response = await call(
        "/api/public/v1/lots/" + publication.publicId,
      );
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.deepEqual(response.body, demoProjection);
      const serialized =
        JSON.stringify(response.body) + [...entries.values()].join("");
      for (const secret of [
        lot.id,
        lot.createdBy,
        lot.producerId,
        lot.parcelId,
        "NO PUBLICAR",
        "actorId",
        "organizationId",
        "note",
        "contact",
        "finance",
        "password",
      ])
        assert.equal(serialized.includes(secret), false, String(secret));
      const qr = await call(path + "/qr", "GET", undefined, owner);
      assert.equal(qr.status, 200);
      assert.equal(qr.headers.get("content-type"), "image/png");
      assert.equal(qr.body.subarray(1, 4).toString(), "PNG");
    },
  );
  await t.test(
    "caché fría/caliente y actualización versionada conservan DTO aprobado",
    async () => {
      entries.clear();
      const before = writes;
      assert.deepEqual(
        (await call("/api/public/v1/lots/" + publication.publicId)).body,
        demoProjection,
      );
      assert.equal(writes, before + 1);
      assert.deepEqual(
        (await call("/api/public/v1/lots/" + publication.publicId)).body,
        demoProjection,
      );
      assert.equal(writes, before + 1);
      const newer = { ...demoProjection, lotCode: "VV-DEMO-002" };
      const r = await publish(newer, publication.version);
      assert.equal(r.status, 201);
      publication = r.body;
      assert.deepEqual(
        (await call("/api/public/v1/lots/" + publication.publicId)).body,
        newer,
      );
      const key = [...entries.keys()][0];
      entries.set(key, JSON.stringify({ ...newer, note: "privado" }));
      assert.deepEqual(
        (await call("/api/public/v1/lots/" + publication.publicId)).body,
        newer,
      );
    },
  );
  await t.test(
    "retiro con invalidación fallida impide servir valor caliente conservado",
    async () => {
      failDelete = true;
      const previous = [...entries.entries()],
        before = hits;
      const r = await call(
        path + "/withdrawal",
        "POST",
        { expectedVersion: publication.version },
        owner,
        crypto.randomUUID(),
      );
      assert.equal(r.status, 201);
      publication = r.body;
      assert.deepEqual([...entries.entries()], previous);
      assert.equal(
        (await call("/api/public/v1/lots/" + publication.publicId)).status,
        404,
      );
      assert.equal(hits, before);
      assert.equal(
        (await call(path + "/qr", "GET", undefined, owner)).status,
        404,
      );
    },
  );
  await t.test(
    "Redis indisponible permite republicar, consultar y retirar; luego se recupera",
    async () => {
      fail = true;
      let r = await publish(demoProjection, publication.version);
      assert.equal(r.status, 201);
      publication = r.body;
      assert.deepEqual(
        (await call("/api/public/v1/lots/" + publication.publicId)).body,
        demoProjection,
      );
      const withdrawn = await call(
        path + "/withdrawal",
        "POST",
        { expectedVersion: publication.version },
        owner,
        crypto.randomUUID(),
      );
      assert.equal(withdrawn.status, 201);
      publication = withdrawn.body;
      assert.equal(
        (await call("/api/public/v1/lots/" + publication.publicId)).status,
        404,
      );
      r = await publish(demoProjection, publication.version);
      assert.equal(r.status, 201);
      publication = r.body;
      fail = false;
      failDelete = false;
      entries.clear();
      assert.deepEqual(
        (await call("/api/public/v1/lots/" + publication.publicId)).body,
        demoProjection,
      );
      assert.equal(entries.size, 1);
    },
  );
  await t.test(
    "versión concurrente, permisos revocados antes de replay e historia inmutable",
    async () => {
      const key = crypto.randomUUID(),
        version = publication.version;
      const both = await Promise.all([
        publish(demoProjection, version, key),
        publish({ ...demoProjection, lotCode: "CONCURRENT" }, version),
      ]);
      assert.deepEqual(both.map((r) => r.status).sort(), [201, 409]);
      publication = both.find((r) => r.status === 201).body;
      await db.query(
        "DELETE FROM access.center_grants WHERE user_id=$1 AND action='publication:publish'",
        ["90000000-0000-4000-8000-000000000001"],
      );
      try {
        assert.equal((await publish(demoProjection, version, key)).status, 404);
      } finally {
        await db.query(
          "INSERT INTO access.center_grants VALUES($1,$2,$3,'publication:publish')",
          [
            "90000000-0000-4000-8000-000000000001",
            intakeIds.center,
            lot.organizationId,
          ],
        );
      }
      await assert.rejects(
        db.query("UPDATE publication.history SET state=state WHERE lot_id=$1", [
          lot.id,
        ]),
        (e) => e.code === "23514",
      );
      assert.deepEqual(
        (
          await services.intake.lots(
            await services.access.authenticate(
              (
                await services.access.login(
                  "acopio@example.test",
                  "Fiction-only-2026!",
                )
              ).token,
            ),
            { centerId: intakeIds.center, offset: 0 },
          )
        ).find((x) => x.id === lot.id),
        lot,
      );
    },
  );
  await t.test(
    "fallo de auditoría revierte publicación, revisión y clave",
    async () => {
      const before = (await call(path, "GET", undefined, owner)).body,
        key = crypto.randomUUID();
      await db.query(
        "ALTER TABLE access.audit ADD CONSTRAINT publication_test_fail CHECK(action<>'publication:publish') NOT VALID",
      );
      try {
        assert.equal(
          (await publish(demoProjection, publication.version, key)).status,
          500,
        );
      } finally {
        await db.query(
          "ALTER TABLE access.audit DROP CONSTRAINT publication_test_fail",
        );
      }
      assert.deepEqual(
        (await call(path, "GET", undefined, owner)).body,
        before,
      );
      assert.equal(
        (
          await db.query(
            "SELECT count(*) FROM publication.requests WHERE request_key=$1",
            [key],
          )
        ).rows[0].count,
        "0",
      );
    },
  );
  await t.test(
    "límite público devuelve 429 sin depender de Redis",
    async () => {
      let r;
      for (let i = 0; i < 61; i++)
        r = await call("/api/public/v1/lots/" + crypto.randomUUID());
      assert.equal(r.status, 429);
      assert.ok(r.headers.get("retry-after"));
    },
  );
});
