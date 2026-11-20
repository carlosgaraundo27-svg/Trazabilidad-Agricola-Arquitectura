import { test } from "node:test";
import assert from "node:assert/strict";
import { connectDatabase } from "../../server/db.js";
import { migrate } from "../../scripts/migrate.js";
import { seed, ids } from "../../scripts/seed.js";
import { compose } from "../../server/composition.js";

test("catálogo offline: sesión vigente, ámbito mínimo y límite sin parcial", async (t) => {
  const db = await connectDatabase({ DB_MODE: "pglite" });
  t.after(() => db.close());
  await migrate(db);
  await seed(db, "Fiction-only-catalog-2026!");
  const s = compose(db);
  const session = await s.access.login(
    "campo@example.test",
    "Fiction-only-catalog-2026!",
  );
  const actor = await s.access.authenticate(session.token);
  const catalog = await s.harvestSync.catalog(actor);
  assert.deepEqual(catalog.parcels, [
    { id: ids.parcel, name: "Parcela demo Norte" },
  ]);
  assert.deepEqual(catalog.owner, {
    organizationId: ids.org,
    actorId: ids.collector,
  });
  assert.deepEqual(catalog.units, ["kg", "unidad"]);
  assert.deepEqual(catalog.quantity, { wholeDigits: 9, decimalPlaces: 3 });
  assert.match(catalog.version, /^[a-f0-9]{64}$/);
  assert.ok(Number.isFinite(Date.parse(catalog.generatedAt)));
  await db.query("DELETE FROM access.parcel_assignments WHERE user_id=$1", [
    ids.collector,
  ]);
  assert.deepEqual((await s.harvestSync.catalog(actor)).parcels, []);
  await db.query("UPDATE access.users SET role='viewer' WHERE id=$1", [
    ids.collector,
  ]);
  await assert.rejects(
    () => s.harvestSync.catalog(actor),
    (e) => e.status === 403,
  );
  await db.query("UPDATE access.users SET role='collector' WHERE id=$1", [
    ids.collector,
  ]);
  await db.query(
    "INSERT INTO producers.parcels(id,organization_id,producer_id,name,latitude,longitude) SELECT md5(i::text)::uuid,$1,$2,'Ficticia '||i,-12,-76 FROM generate_series(1,1001) i",
    [ids.org, ids.producer],
  );
  await db.query(
    "INSERT INTO access.parcel_assignments SELECT $1,id,$2 FROM producers.parcels WHERE organization_id=$2",
    [ids.collector, ids.org],
  );
  await assert.rejects(
    () => s.harvestSync.catalog(actor),
    (e) => e.status === 503 && e.code === "CATALOG_TOO_LARGE",
  );
  await db.query(
    "UPDATE access.sessions SET expires_at=now()-interval '1 second'",
  );
  await assert.rejects(
    () => s.harvestSync.catalog(actor),
    (e) => e.status === 401,
  );
});
