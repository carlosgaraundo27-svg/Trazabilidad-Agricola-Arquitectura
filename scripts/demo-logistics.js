import { connectDatabase } from "../server/db.js";
import { compose } from "../server/composition.js";
import { migrate } from "./migrate.js";
import { seed } from "./seed.js";
import { logisticsLot } from "./logistics-fixture.js";
import { shipmentInput } from "../server/modules/logistics/domain.js";
if (
  process.env.NODE_ENV === "production" ||
  process.env.ALLOW_DEMO_SEED !== "true"
)
  throw new Error(
    "Solo demo ficticia con ALLOW_DEMO_SEED=true; nunca producción.",
  );
const db = await connectDatabase();
try {
  await migrate(db);
  await seed(db, process.env.DEMO_PASSWORD);
  const services = compose(db);
  // Each invocation creates new, explicitly fictional source facts; it does not backfill existing lots.
  const lot = await logisticsLot(services, process.env.DEMO_PASSWORD);
  if (!process.argv.includes("--complete")) {
    console.log(
      JSON.stringify(
        {
          fictional: true,
          lotId: lot.id,
          totalKg: lot.totalKg,
          inventoryAdmitted: false,
          message:
            "Calidad manual ficticia closed/accepted. Admitir, liberar y operar explícitamente desde la UI.",
        },
        null,
        2,
      ),
    );
  } else {
    const actor = await services.access.authenticate(
        (
          await services.access.login(
            "inventario@example.test",
            process.env.DEMO_PASSWORD,
          )
        ).token,
      ),
      service = services.logistics;
    let entry = (
      await service.admit(
        actor,
        {
          lotId: lot.id,
          verifiedKg: lot.totalKg,
          reference: "DEMO-" + lot.id,
          evidenceRef: "Conteo actual ficticio para demostración",
        },
        crypto.randomUUID(),
      )
    ).item;
    entry = (
      await service.release(
        actor,
        entry.id,
        {
          expectedVersion: entry.version,
          reason: "Liberación logística explícita ficticia",
        },
        crypto.randomUUID(),
      )
    ).item;
    let shipment = (
      await service.createShipment(
        actor,
        shipmentInput.parse({
          stockEntryId: entry.id,
          transport: {
            guideReference: "DEMO-GR-" + lot.id,
            vehicleLabel: "Unidad ficticia",
            plate: "DEMO-001",
            driverName: "Persona ficticia",
            sealReference: "DEMO-P001",
          },
          destinationLabel: "Destino ficticio",
        }),
        crypto.randomUUID(),
      )
    ).item;
    const versions = () => ({
      expectedVersion: shipment.version,
      expectedInventoryVersion: shipment.inventory.version,
    });
    shipment = (
      await service.reserve(actor, shipment.id, versions(), crypto.randomUUID())
    ).item;
    const now = async () =>
      (
        await db.query(
          "SELECT date_trunc('milliseconds',clock_timestamp()) AS instant",
        )
      ).rows[0].instant.toISOString();
    shipment = (
      await service.depart(
        actor,
        shipment.id,
        { ...versions(), departedAt: await now() },
        crypto.randomUUID(),
      )
    ).item;
    shipment = (
      await service.deliver(
        actor,
        shipment.id,
        {
          ...versions(),
          receivedKg: shipment.quantityKg,
          deliveredAt: await now(),
          evidenceRef: "Recepción total ficticia, sin transporte real",
        },
        crypto.randomUUID(),
      )
    ).item;
    console.log(
      JSON.stringify(
        {
          fictional: true,
          lotId: lot.id,
          shipmentId: shipment.id,
          state: shipment.state,
          quantityKg: shipment.quantityKg,
          onHandKg: shipment.inventory.onHandKg,
          inTransitKg: shipment.inventory.inTransitKg,
          deliveredKg: shipment.inventory.deliveredKg,
        },
        null,
        2,
      ),
    );
  }
} finally {
  await db.close();
}
