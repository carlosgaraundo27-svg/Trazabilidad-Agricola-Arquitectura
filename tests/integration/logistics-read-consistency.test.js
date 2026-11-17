import { test } from "node:test";
import assert from "node:assert/strict";
import { connectDatabase } from "../../server/db.js";
import { compose } from "../../server/composition.js";
import { migrate } from "../../scripts/migrate.js";
import { seed } from "../../scripts/seed.js";
import { logisticsLot } from "../../scripts/logistics-fixture.js";
import { shipmentInput } from "../../server/modules/logistics/domain.js";

test("lectura logística conserva snapshot al competir con salida", async (t) => {
  assert.equal(
    process.env.TEST_ALLOW_DB_WRITE,
    "true",
    "Base desechable requerida",
  );
  const db = await connectDatabase();
  t.after(() => db.close());
  await migrate(db);
  await seed(db, "Fiction-only-2026!");
  const s = compose(db);
  const actor = await s.access.authenticate(
    (await s.access.login("inventario@example.test", "Fiction-only-2026!"))
      .token,
  );
  for (const view of ["getShipment", "events"])
    await t.test(view, async () => {
      const lot = await logisticsLot(s, "Fiction-only-2026!");
      let entry = (
        await s.logistics.admit(
          actor,
          {
            lotId: lot.id,
            verifiedKg: lot.totalKg,
            reference: "SNAPSHOT",
            evidenceRef: "Conteo ficticio",
          },
          crypto.randomUUID(),
        )
      ).item;
      entry = (
        await s.logistics.release(
          actor,
          entry.id,
          {
            expectedVersion: entry.version,
            reason: "Liberación ficticia",
          },
          crypto.randomUUID(),
        )
      ).item;
      let shipment = (
        await s.logistics.createShipment(
          actor,
          shipmentInput.parse({
            stockEntryId: entry.id,
            destinationLabel: "Destino ficticio",
            transport: {
              guideReference: "SNAP-" + lot.id,
              vehicleLabel: "Unidad ficticia",
              plate: "DEMO-001",
              driverName: "Persona ficticia privada",
              sealReference: "DEMO-S",
            },
          }),
          crypto.randomUUID(),
        )
      ).item;
      shipment = (
        await s.logistics.reserve(
          actor,
          shipment.id,
          {
            expectedVersion: shipment.version,
            expectedInventoryVersion: shipment.inventory.version,
          },
          crypto.randomUUID(),
        )
      ).item;

      let reached, release;
      const atBarrier = new Promise((resolve) => {
        reached = resolve;
      });
      const barrier = new Promise((resolve) => {
        release = resolve;
      });
      const reader = compose({
        transaction: (fn) =>
          db.transaction((tx) =>
            fn({
              query: async (sql, params) => {
                const result = await tx.query(sql, params);
                if (sql.startsWith("SELECT kind,sum(amount_kg)")) {
                  reached();
                  await barrier;
                }
                return result;
              },
            }),
          ),
      }).logistics;
      const reading =
        view === "events"
          ? reader.events(actor, shipment.id, { offset: 0 })
          : reader.getShipment(actor, shipment.id);
      // Observe failures immediately while the barrier is pending; assert them below.
      reading.catch(() => {});
      let departure, timer;
      try {
        await Promise.race([
          atBarrier,
          new Promise((_, reject) => {
            timer = setTimeout(
              () => reject(new Error("El lector no alcanzó la barrera")),
              5000,
            );
          }),
        ]);
        const instant = (
          await db.query(
            "SELECT date_trunc('milliseconds',clock_timestamp()) AS instant",
          )
        ).rows[0].instant.toISOString();
        departure = s.logistics.depart(
          actor,
          shipment.id,
          {
            expectedVersion: shipment.version,
            expectedInventoryVersion: shipment.inventory.version,
            departedAt: instant,
          },
          crypto.randomUUID(),
        );
        departure.catch(() => {});
        const deadline = Date.now() + 5000;
        let blocked = false;
        while (Date.now() < deadline) {
          blocked =
            (
              await db.query(
                "SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%inventory.entries%' AND query LIKE '%FOR UPDATE%'",
              )
            ).rowCount > 0;
          if (blocked) break;
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        assert.ok(
          blocked,
          "La salida espera el snapshot compartido del lector",
        );
      } finally {
        clearTimeout(timer);
        release();
      }
      const [before, after] = await Promise.all([reading, departure]);
      if (view === "getShipment") {
        assert.equal(before.state, "reserved");
        assert.equal(before.version, shipment.version);
        assert.equal(before.inventory.onHandKg, lot.totalKg);
        assert.equal(before.inventory.reservedKg, lot.totalKg);
        assert.equal(before.inventory.inTransitKg, "0.000");
      } else {
        assert.equal(before.snapshotVersion, shipment.version);
        assert.equal(before.items.at(-1).kind, "reserved");
        assert.equal(before.items.at(-1).version, shipment.version);
        assert.equal(
          before.items.some((e) => e.kind === "dispatched"),
          false,
        );
      }
      assert.equal(after.item.state, "in_transit");
      assert.equal(after.item.version, shipment.version + 1);
      assert.equal(after.item.inventory.onHandKg, "0.000");
      assert.equal(after.item.inventory.reservedKg, "0.000");
      assert.equal(after.item.inventory.inTransitKg, lot.totalKg);
      const history = await s.logistics.events(actor, shipment.id, {
        offset: 0,
      });
      assert.equal(history.snapshotVersion, after.item.version);
      assert.equal(history.items.at(-1).kind, "dispatched");
      assert.equal(history.items.at(-1).version, after.item.version);
    });
});
