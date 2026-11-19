import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { connectDatabase } from "../../server/db.js";
import { migrate } from "../../scripts/migrate.js";
import { seed, ids } from "../../scripts/seed.js";
import { compose } from "../../server/composition.js";
import { preLotInput } from "../../server/modules/harvest/domain.js";

test("008: upgrade conserva históricos, fallo revierte DDL y down vacío conserva datos", async (t) => {
  assert.equal(process.env.TEST_ALLOW_DB_WRITE, "true");
  const db = await connectDatabase();
  t.after(() => db.close());
  await migrate(db);
  await seed(db, "Fiction-only-2026!");
  const down = await readFile(
    new URL("../../migrations/008_harvest_sync.down.sql", import.meta.url),
    "utf8",
  );
  // All destructive schema exercises stay inside a transaction rolled back below.
  await assert.rejects(
    db.transaction(async (tx) => {
      const local = {
        query: (q, p) => tx.query(q, p),
        transaction: (fn) => fn(tx),
      };
      await tx.query(down);
      await tx.query(
        "DELETE FROM public.schema_migrations WHERE version='008'",
      );
      const s = compose(local),
        login = await s.access.login(
          "campo@example.test",
          "Fiction-only-2026!",
        ),
        actor = await s.access.authenticate(login.token);
      const old = await s.harvest.create(
        actor,
        preLotInput.parse({
          parcelId: ids.parcel,
          harvestedAt: "2026-01-02T12:00:00Z",
          quantity: "45.250",
          unit: "kg",
        }),
        crypto.randomUUID(),
      );
      const historical = async () =>
        (
          await tx.query(
            "SELECT row_to_json(t) AS row FROM (SELECT p.*,h.quantity::text,h.harvested_at FROM harvest.pre_lots p JOIN harvest.harvests h ON h.id=p.harvest_id WHERE p.id=$1) t",
            [old.item.id],
          )
        ).rows;
      const before = await historical();
      await tx.query("SAVEPOINT failed_upgrade");
      await tx.query("CREATE TABLE harvest.sync_receipts(dummy integer)");
      await assert.rejects(migrate(local), { code: "42P07" });
      await tx.query("ROLLBACK TO SAVEPOINT failed_upgrade");
      assert.equal(
        (
          await tx.query(
            "SELECT to_regclass('harvest.sync_receipts') AS receipt",
          )
        ).rows[0].receipt,
        null,
      );
      assert.equal(
        (
          await tx.query(
            "SELECT count(*)::int AS n FROM pg_constraint WHERE conname='pre_lots_sync_identity'",
          )
        ).rows[0].n,
        0,
      );
      assert.deepEqual(await historical(), before);
      await migrate(local);
      await migrate(local);
      assert.deepEqual(await historical(), before);
      assert.equal(
        (await tx.query("SELECT count(*)::int AS n FROM harvest.sync_receipts"))
          .rows[0].n,
        0,
      );
      assert.equal(
        (
          await tx.query(
            "SELECT count(*)::int AS n FROM public.schema_migrations WHERE version='008'",
          )
        ).rows[0].n,
        1,
      );
      await tx.query("SAVEPOINT invalid_owner");
      await assert.rejects(
        tx.query(
          "INSERT INTO harvest.sync_receipts(organization_id,client_capture_id,actor_id,pre_lot_id,harvest_id,schema_version,payload_hash,payload,result,accepted_at) VALUES($1,$2,$3,$4,$5,1,repeat('a',64),'{}','{}',now())",
          [
            ids.org,
            crypto.randomUUID(),
            ids.admin,
            old.item.id,
            old.item.harvestId,
          ],
        ),
        { code: "23503" },
      );
      await tx.query("ROLLBACK TO SAVEPOINT invalid_owner");
      await tx.query(down);
      assert.deepEqual(await historical(), before);
      throw Error("rollback-migration-fixture");
    }),
    { message: "rollback-migration-fixture" },
  );
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int AS n FROM public.schema_migrations WHERE version='008'",
      )
    ).rows[0].n,
    1,
  );
});
