import { test } from "node:test";
import assert from "node:assert/strict";
import { connectDatabase } from "../../server/db.js";
import { compose } from "../../server/composition.js";
import { migrate } from "../../scripts/migrate.js";
import { seed } from "../../scripts/seed.js";
import { logisticsLot } from "../../scripts/logistics-fixture.js";
import { logisticsIds } from "../../scripts/seed-logistics.js";
import { intakeIds } from "../../scripts/seed-intake.js";
import { shipmentInput } from "../../server/modules/logistics/domain.js";

test("SQL de Logística protege identidad, masa, ámbito e históricos", async (t) => {
  if (process.env.TEST_ALLOW_DB_WRITE !== "true")
    throw Error("Base desechable requerida");
  const db = await connectDatabase();
  t.after(() => db.close());
  await migrate(db);
  await seed(db, "Fiction-only-2026!");
  const s = compose(db);
  const actor = await s.access.authenticate(
    (await s.access.login("inventario@example.test", "Fiction-only-2026!"))
      .token,
  );
  const lot = await logisticsLot(s, "Fiction-only-2026!");
  const input = {
    lotId: lot.id,
    verifiedKg: lot.totalKg,
    reference: "SQL-DEMO",
    evidenceRef: "Conteo ficticio",
  };
  await assert.rejects(
    () =>
      db.query(
        "INSERT INTO inventory.entries(id,lot_id,organization_id,center_id,admitted_kg,reference,evidence_ref,created_by) VALUES($1,$2,$3,$4,70,'SQL','Ficticio',$5)",
        [
          crypto.randomUUID(),
          lot.id,
          actor.organizationId,
          intakeIds.center,
          actor.id,
        ],
      ),
    { code: "23514" },
  );
  const entry = (await s.logistics.admit(actor, input, crypto.randomUUID()))
    .item;
  await assert.rejects(
    () =>
      db.query(
        "UPDATE inventory.entries SET admitted_kg=1000,version=version+1 WHERE id=$1",
        [entry.id],
      ),
    { code: "23514" },
  );
  await assert.rejects(
    () =>
      db.query(
        "INSERT INTO inventory.movements(id,entry_id,organization_id,center_id,kind,amount_kg,actor_id) VALUES($1,$2,$3,$4,'admitted',70,$5)",
        [
          crypto.randomUUID(),
          entry.id,
          actor.organizationId,
          intakeIds.center,
          actor.id,
        ],
      ),
    { code: "23514" },
  );
  await assert.rejects(
    () =>
      db.query(
        "INSERT INTO inventory.movements(id,entry_id,organization_id,center_id,kind,amount_kg,actor_id) VALUES($1,$2,$3,$4,'admitted',73.125,$5)",
        [
          crypto.randomUUID(),
          entry.id,
          actor.organizationId,
          intakeIds.center,
          actor.id,
        ],
      ),
    { code: "23505" },
  );
  const shipment = (
    await s.logistics.createShipment(
      actor,
      shipmentInput.parse({ stockEntryId: entry.id }),
      crypto.randomUUID(),
    )
  ).item;
  await assert.rejects(
    () =>
      db.query(
        "UPDATE logistics.shipments SET quantity_kg=70,version=version+1 WHERE id=$1",
        [shipment.id],
      ),
    { code: "23514" },
  );
  await assert.rejects(
    () =>
      db.query(
        "UPDATE logistics.shipments SET state='in_transit',version=version+1,departed_at=clock_timestamp() WHERE id=$1",
        [shipment.id],
      ),
    { code: "23514" },
  );
  await assert.rejects(
    () =>
      db.query(
        "INSERT INTO inventory.events(id,entry_id,organization_id,center_id,actor_id,kind,version,payload) VALUES($1,$2,$3,$4,$5,'admitted',99,'{}')",
        [
          crypto.randomUUID(),
          entry.id,
          actor.organizationId,
          intakeIds.center2,
          actor.id,
        ],
      ),
    { code: "23503" },
  );
  for (const table of [
    "inventory.events",
    "inventory.movements",
    "inventory.requests",
    "logistics.guide_references",
    "logistics.deliveries",
  ]) {
    await assert.rejects(() => db.query(`TRUNCATE ${table}`), {
      code: "23514",
    });
  }
  await assert.rejects(
    () => db.query("DELETE FROM inventory.entries WHERE id=$1", [entry.id]),
    { code: "23514" },
  );
  await assert.rejects(
    () =>
      db.query("DELETE FROM logistics.shipments WHERE id=$1", [shipment.id]),
    { code: "23514" },
  );
  await assert.rejects(
    () =>
      db.query(
        "UPDATE inventory.requests SET response='{}' WHERE actor_id=$1",
        [logisticsIds.operator],
      ),
    { code: "23514" },
  );
  const pending = await logisticsLot(s, "Fiction-only-2026!", { result: null });
  const quarantined = (
    await s.logistics.admit(
      actor,
      { ...input, lotId: pending.id, verifiedKg: pending.totalKg },
      crypto.randomUUID(),
    )
  ).item;
  await assert.rejects(
    () =>
      db.query(
        "UPDATE inventory.entries SET disposition='released',version=version+1,release_evaluation_id=$1,release_evaluation_version=3,release_reason='Ficticio',released_by=$2,released_at=clock_timestamp() WHERE id=$3",
        [entry.qualitySummary.id, actor.id, quarantined.id],
      ),
    { code: "23514" },
  );
  const current = await s.logistics.getEntry(actor, entry.id);
  assert.equal(current.onHandKg, "73.125");
  assert.equal(current.disposition, "quarantine");
  assert.deepEqual(current.contributions, entry.contributions);
});
