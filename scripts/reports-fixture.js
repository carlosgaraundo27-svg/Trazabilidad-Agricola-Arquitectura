import { compose } from "../server/composition.js";
import { logisticsLot } from "./logistics-fixture.js";

export const reportIds = [1, 2, 3, 4].map(
  (n) => "b1000000-0000-4000-8000-" + String(n).padStart(12, "0"),
);
export async function reportsFixture(db, password) {
  if (process.env.TEST_ALLOW_DB_WRITE !== "true")
    throw new Error("ROP-01 requiere base aislada y autorización de fixtures.");
  const services = compose(db);
  const actor = await services.access.authenticate(
    (await services.access.login("inventario@example.test", password)).token,
  );
  const rows = [];
  const quantities = ["999999999.999", "0.001", "17.125", "5.000"];
  for (const [index, id] of reportIds.entries()) {
    const lot = await logisticsLot(services, password, {
      quantities: [quantities[index]],
    });
    let entry = (
      await services.logistics.admit(
        actor,
        {
          lotId: lot.id,
          verifiedKg: lot.totalKg,
          reference: "ROP-FICTICIO",
          evidenceRef: "Conteo ficticio",
        },
        crypto.randomUUID(),
      )
    ).item;
    entry = (
      await services.logistics.release(
        actor,
        entry.id,
        {
          expectedVersion: entry.version,
          reason: "Liberación ficticia ROP",
        },
        crypto.randomUUID(),
      )
    ).item;
    // New synthetic drafts only; historical dates are set on INSERT, never by
    // changing an existing fact or disabling its triggers.
    await db.query(
      "INSERT INTO logistics.shipments(id,entry_id,organization_id,center_id,quantity_kg,transport,destination_label,created_by,updated_by,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$8,'2026-01-03T09:00:00Z')",
      [
        id,
        entry.id,
        actor.organizationId,
        entry.centerId,
        entry.sourceKg,
        JSON.stringify({
          guideReference: ("ROP-" + id).toUpperCase(),
          vehicleLabel: "Unidad ficticia privada",
          plate: "PRIVADO-ROP",
          driverName: "Chofer ficticio privado",
          sealReference: "PRECINTO-PRIVADO",
        }),
        "Destino privado ficticio",
        actor.id,
      ],
    );
    let shipment = await services.logistics.getShipment(actor, id);
    if (index < 3) {
      shipment = (
        await services.logistics.reserve(
          actor,
          id,
          {
            expectedVersion: shipment.version,
            expectedInventoryVersion: shipment.inventory.version,
          },
          crypto.randomUUID(),
        )
      ).item;
      shipment = (
        await services.logistics.depart(
          actor,
          id,
          {
            expectedVersion: shipment.version,
            expectedInventoryVersion: shipment.inventory.version,
            departedAt:
              index === 2
                ? "2026-01-03T11:30:00.123Z"
                : "2026-01-03T10:00:00.123Z",
          },
          crypto.randomUUID(),
        )
      ).item;
      if (index !== 1)
        shipment = (
          await services.logistics.deliver(
            actor,
            id,
            {
              expectedVersion: shipment.version,
              expectedInventoryVersion: shipment.inventory.version,
              receivedKg: shipment.quantityKg,
              evidenceRef: "Recibo privado ficticio",
              deliveredAt:
                index === 0
                  ? "2026-01-03T11:30:00.124Z"
                  : "2026-01-03T11:30:00.123Z",
            },
            crypto.randomUUID(),
          )
        ).item;
    }
    rows.push(shipment);
  }
  return rows;
}
