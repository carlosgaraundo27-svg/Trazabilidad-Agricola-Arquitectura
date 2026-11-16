import { test } from "node:test";
import assert from "node:assert/strict";
import { connectDatabase } from "../../server/db.js";
import { compose } from "../../server/composition.js";
import { createApp } from "../../server/http.js";
import { migrate } from "../../scripts/migrate.js";
import { seed } from "../../scripts/seed.js";
import { logisticsLot } from "../../scripts/logistics-fixture.js";
import { shipmentInput } from "../../server/modules/logistics/domain.js";

test("Logística revierte operación, movimiento, evento, auditoría y clave ante fallos reales", async (t) => {
  if (process.env.TEST_ALLOW_DB_WRITE !== "true")
    throw Error("Base desechable requerida");
  const db = await connectDatabase();
  await migrate(db);
  await seed(db, "Fiction-only-2026!");
  const s = compose(db);
  const auth = await s.access.login(
      "inventario@example.test",
      "Fiction-only-2026!",
    ),
    actor = await s.access.authenticate(auth.token);
  const server = createApp({ db, services: s, log: () => {} }).listen(
    0,
    "127.0.0.1",
  );
  await new Promise((r) => server.once("listening", r));
  t.after(async () => {
    await new Promise((r) => server.close(r));
    await db.close();
  });
  const call = async (path, body, key, method = "POST") => {
    const r = await fetch(
      "http://127.0.0.1:" + server.address().port + "/api/v1" + path,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          Cookie: "session=" + auth.token,
          "X-CSRF-Token": auth.csrfToken,
          "Idempotency-Key": key,
        },
        body: JSON.stringify(body),
      },
    );
    return { status: r.status, body: await r.json() };
  };
  const versions = (shipment) => ({
    expectedVersion: shipment.version,
    expectedInventoryVersion: shipment.inventory.version,
  });
  async function fixture(stage) {
    const lot = await logisticsLot(s, "Fiction-only-2026!");
    const admission = {
      lotId: lot.id,
      verifiedKg: lot.totalKg,
      reference: "ACTUAL",
      evidenceRef: "Conteo físico ficticio",
    };
    if (stage === "absent") return { lot, admission };
    let entry = (await s.logistics.admit(actor, admission, crypto.randomUUID()))
      .item;
    if (stage === "admitted") return { lot, entry };
    entry = (
      await s.logistics.release(
        actor,
        entry.id,
        { expectedVersion: entry.version, reason: "Liberar" },
        crypto.randomUUID(),
      )
    ).item;
    if (stage === "released") return { lot, entry };
    let shipment = (
      await s.logistics.createShipment(
        actor,
        shipmentInput.parse({
          stockEntryId: entry.id,
          transport: {
            guideReference: "R-" + crypto.randomUUID(),
            vehicleLabel: "Unidad demo",
            plate: "DEMO-001",
            driverName: "Persona ficticia",
            sealReference: "DEMO-S",
          },
          destinationLabel: "Destino ficticio",
        }),
        crypto.randomUUID(),
      )
    ).item;
    if (stage === "reserved" || stage === "in_transit")
      shipment = (
        await s.logistics.reserve(
          actor,
          shipment.id,
          versions(shipment),
          crypto.randomUUID(),
        )
      ).item;
    if (stage === "in_transit")
      shipment = (
        await s.logistics.depart(
          actor,
          shipment.id,
          {
            ...versions(shipment),
            departedAt: new Date(shipment.createdAt).toISOString(),
          },
          crypto.randomUUID(),
        )
      ).item;
    return { lot, entry: shipment.inventory, shipment };
  }
  const cases = [
    [
      "admisión",
      "absent",
      (f) => ["/inventory/entries", f.admission],
      "inventory.entries",
      "inventory.movements",
    ],
    [
      "liberación",
      "admitted",
      (f) => [
        `/inventory/entries/${f.entry.id}/release`,
        { expectedVersion: f.entry.version, reason: "Liberar" },
      ],
      "inventory.entries",
    ],
    [
      "preparación",
      "released",
      (f) => ["/shipments", { stockEntryId: f.entry.id }],
      "logistics.shipments",
    ],
    [
      "corrección",
      "draft",
      (f) => [
        `/shipments/${f.shipment.id}/transport`,
        {
          expectedVersion: f.shipment.version,
          transport: { ...f.shipment.transport, plate: "DEMO-002" },
          destinationLabel: "Destino corregido",
          reason: "Corrección auditada",
        },
        "PUT",
      ],
      "logistics.shipments",
    ],
    [
      "reserva",
      "draft",
      (f) => [`/shipments/${f.shipment.id}/reservation`, versions(f.shipment)],
      "logistics.shipments",
      "inventory.entries",
      "inventory.movements",
    ],
    [
      "cancelación",
      "reserved",
      (f) => [
        `/shipments/${f.shipment.id}/cancellation`,
        { ...versions(f.shipment), reason: "Cancelar reserva" },
      ],
      "logistics.shipments",
      "inventory.entries",
      "inventory.movements",
    ],
    [
      "salida",
      "reserved",
      (f) => [
        `/shipments/${f.shipment.id}/departure`,
        { ...versions(f.shipment), departedAt: new Date().toISOString() },
      ],
      "logistics.shipments",
      "inventory.entries",
      "inventory.movements",
    ],
    [
      "entrega",
      "in_transit",
      (f) => [
        `/shipments/${f.shipment.id}/delivery`,
        {
          ...versions(f.shipment),
          receivedKg: f.shipment.quantityKg,
          deliveredAt: new Date().toISOString(),
          evidenceRef: "Entrega ficticia",
        },
      ],
      "logistics.shipments",
      "inventory.entries",
      "inventory.movements",
      "logistics.deliveries",
    ],
  ];
  const snapshot = async () =>
    (
      await db.query(
        `SELECT jsonb_build_object('entries',(SELECT jsonb_agg(e ORDER BY e.id) FROM inventory.entries e),'shipments',(SELECT jsonb_agg(s ORDER BY s.id) FROM logistics.shipments s),'movements',(SELECT count(*) FROM inventory.movements),'events',(SELECT count(*) FROM inventory.events),'requests',(SELECT count(*) FROM inventory.requests),'deliveries',(SELECT count(*) FROM logistics.deliveries),'guides',(SELECT count(*) FROM logistics.guide_references),'audit',(SELECT count(*) FROM access.audit)) AS value`,
      )
    ).rows[0].value;
  await db.query(
    "CREATE FUNCTION public.fail_logistics_write() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected write failure'; END; $$",
  );
  try {
    for (const [name, stage, build, ...tables] of cases) {
      const f = await fixture(stage);
      for (const table of [
        ...tables,
        "inventory.events",
        "access.audit",
        "inventory.requests",
      ]) {
        await t.test(`${name}: rollback ante fallo en ${table}`, async () => {
          const before = await snapshot(),
            key = crypto.randomUUID();
          const [path, body, method] = build(f);
          await db.query(
            `CREATE TRIGGER fail_logistics_write BEFORE INSERT OR UPDATE ON ${table} FOR EACH ROW EXECUTE FUNCTION public.fail_logistics_write()`,
          );
          try {
            const r = await call(path, body, key, method);
            assert.equal(r.status, 500, JSON.stringify(r.body));
            assert.equal(JSON.stringify(r.body).includes("injected"), false);
          } finally {
            await db.query(`DROP TRIGGER fail_logistics_write ON ${table}`);
          }
          assert.deepEqual(await snapshot(), before);
          assert.equal(
            (
              await db.query(
                "SELECT count(*) FROM inventory.requests WHERE request_key=$1",
                [key],
              )
            ).rows[0].count,
            "0",
          );
        });
      }
      const [path, body, method] = build(f);
      const success = await call(path, body, crypto.randomUUID(), method);
      assert.equal(
        success.status,
        method === "PUT" ? 200 : 201,
        JSON.stringify(success.body),
      );
    }
  } finally {
    await db.query("DROP FUNCTION public.fail_logistics_write()");
  }
});
