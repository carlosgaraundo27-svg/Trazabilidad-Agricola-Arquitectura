import { afterAll, beforeAll, expect, jest, test } from "@jest/globals";
import { connectDatabase } from "../../server/db.js";
import { compose } from "../../server/composition.js";
import { migrate } from "../../scripts/migrate.js";
import { seed, ids } from "../../scripts/seed.js";
import { logisticsLot } from "../../scripts/logistics-fixture.js";
import {
  publicationLot,
  demoProjection,
} from "../../scripts/publication-fixture.js";
import { preLotInput } from "../../server/modules/harvest/domain.js";
import { syncInput } from "../../server/modules/harvest/sync-domain.js";
import { shipmentReportInput } from "../../server/modules/reports/domain.js";
import { shipmentInput } from "../../server/modules/logistics/domain.js";
import {
  producerInput,
  parcelInput,
} from "../../server/modules/producers/domain.js";

jest.setTimeout(30000);
const password = "Fiction-Jest-business-2026!";
let db, services, operator, field, publisher;
const login = async (email, s = services) =>
  s.access.authenticate((await s.access.login(email, password)).token);
const origin = {
  parcelId: ids.parcel,
  harvestedAt: "2026-01-02T12:00:00Z",
  quantity: "73.125",
  unit: "kg",
};
const version = (shipment) => ({
  expectedVersion: shipment.version,
  expectedInventoryVersion: shipment.inventory.version,
});
beforeAll(async () => {
  const url = process.env.JEST_DATABASE_URL;
  if (url) {
    const target = new URL(url);
    if (
      target.hostname !== "127.0.0.1" ||
      target.port !== "55442" ||
      target.pathname !== "/jest_business"
    )
      throw new Error("Jest requiere PostgreSQL dedicado jest_business:55442");
  }
  // Sin URL explícita usa solo WASM en memoria; nunca lee DATABASE_URL/.env.
  db = await connectDatabase(
    url ? { DATABASE_URL: url } : { DB_MODE: "pglite" },
  );
  await migrate(db);
  await seed(db, password);
  services = compose(db, { baseUrl: "https://public.example.test" });
  [operator, field, publisher] = await Promise.all([
    login("inventario@example.test"),
    login("campo@example.test"),
    login("publicacion@example.test"),
  ]);
});
afterAll(async () => {
  if (db) await db.close();
});

async function admitLot(result = "accepted") {
  const lot = await logisticsLot(services, password, { result });
  const input = {
    lotId: lot.id,
    verifiedKg: lot.totalKg,
    reference: "JEST-FICTICIO",
    evidenceRef: "Conteo ficticio",
  };
  const entry = (
    await services.logistics.admit(operator, input, crypto.randomUUID())
  ).item;
  return { lot, entry };
}
async function reservedShipment() {
  const { lot, entry } = await admitLot();
  const released = (
    await services.logistics.release(
      operator,
      entry.id,
      { expectedVersion: entry.version, reason: "Ficticio" },
      crypto.randomUUID(),
    )
  ).item;
  let shipment = (
    await services.logistics.createShipment(
      operator,
      shipmentInput.parse({
        stockEntryId: released.id,
        destinationLabel: "Destino ficticio",
        transport: {
          guideReference: "JEST-" + crypto.randomUUID(),
          vehicleLabel: "Unidad",
          plate: "FIC",
          driverName: "Persona ficticia",
          sealReference: "Sello",
        },
      }),
      crypto.randomUUID(),
    )
  ).item;
  shipment = (
    await services.logistics.reserve(
      operator,
      shipment.id,
      version(shipment),
      crypto.randomUUID(),
    )
  ).item;
  return { lot, shipment };
}

test("captura persistida acepta replay único y revocación de parcela domina recibo", async () => {
  const id = crypto.randomUUID(),
    input = syncInput.parse({ schemaVersion: 1, ...origin });
  const first = await services.harvestSync.accept(field, id, input);
  expect((await services.harvestSync.accept(field, id, input)).item).toEqual(
    first.item,
  );
  await expect(
    services.harvestSync.accept(field, id, { ...input, quantity: "73.126" }),
  ).rejects.toMatchObject({ status: 409 });
  await db.query(
    "DELETE FROM access.parcel_assignments WHERE user_id=$1 AND parcel_id=$2",
    [field.id, ids.parcel],
  );
  try {
    await expect(
      services.harvestSync.accept(field, id, input),
    ).rejects.toMatchObject({ status: 404 });
  } finally {
    await db.query(
      "INSERT INTO access.parcel_assignments(user_id,parcel_id,organization_id) VALUES($1,$2,$3)",
      [field.id, ids.parcel, ids.org],
    );
  }
  const count = (
    await db.query(
      "SELECT count(*)::int AS n FROM harvest.sync_receipts WHERE client_capture_id=$1",
      [id],
    )
  ).rows[0].n;
  expect(count).toBe(1);
});

test("fallo de auditoría revierte cosecha, pre-lote y recibo en la misma transacción", async () => {
  const count = async () =>
    (
      await db.query(
        "SELECT (SELECT count(*) FROM harvest.harvests)::int AS harvests,(SELECT count(*) FROM harvest.pre_lots)::int AS prelots,(SELECT count(*) FROM harvest.sync_receipts)::int AS receipts",
      )
    ).rows[0];
  const before = await count();
  const broken = compose({
    ...db,
    transaction: (work) =>
      db.transaction((tx) =>
        work({
          query: (sql, values) => {
            if (sql.includes("INSERT INTO access.audit"))
              throw new Error("AUDIT_FAILURE_FICTION");
            return tx.query(sql, values);
          },
        }),
      ),
  });
  await expect(
    broken.harvestSync.accept(
      field,
      crypto.randomUUID(),
      syncInput.parse({ schemaVersion: 1, ...origin }),
    ),
  ).rejects.toThrow("AUDIT_FAILURE_FICTION");
  expect(await count()).toEqual(before);
});

test("solo el recolector asignado registra pre-lote, no admin ni parcela ajena", async () => {
  const admin = await login("admin@example.test");
  await expect(
    services.harvest.create(
      admin,
      preLotInput.parse(origin),
      crypto.randomUUID(),
    ),
  ).rejects.toMatchObject({ status: 403 });
  await expect(
    services.harvest.create(
      field,
      preLotInput.parse({ ...origin, parcelId: ids.otherParcel }),
      crypto.randomUUID(),
    ),
  ).rejects.toMatchObject({ status: 404 });
  expect(
    (await services.harvest.list(field)).every(
      (row) =>
        row.organizationId === undefined || row.organizationId === ids.org,
    ),
  ).toBe(true);
});

test("recorrido real cosecha/acopio/calidad/reserva/salida/entrega conserva masa y replay", async () => {
  let { shipment } = await reservedShipment();
  expect(shipment.inventory).toMatchObject({
    onHandKg: "73.125",
    reservedKg: "73.125",
    unreservedKg: "0.000",
  });
  shipment = (
    await services.logistics.depart(
      operator,
      shipment.id,
      {
        ...version(shipment),
        departedAt: new Date(shipment.createdAt).toISOString(),
      },
      crypto.randomUUID(),
    )
  ).item;
  expect(shipment.inventory).toMatchObject({
    onHandKg: "0.000",
    inTransitKg: "73.125",
  });
  const key = crypto.randomUUID(),
    input = {
      ...version(shipment),
      receivedKg: "73.125",
      deliveredAt: new Date(shipment.departedAt).toISOString(),
      evidenceRef: "Entrega ficticia",
    };
  const delivered = await services.logistics.deliver(
    operator,
    shipment.id,
    input,
    key,
  );
  expect(delivered.item.inventory).toMatchObject({
    admittedKg: "73.125",
    onHandKg: "0.000",
    inTransitKg: "0.000",
    deliveredKg: "73.125",
  });
  expect(
    await services.logistics.deliver(operator, shipment.id, input, key),
  ).toEqual({
    replayed: true,
    item: JSON.parse(JSON.stringify(delivered.item)),
  });
  await expect(
    services.logistics.cancel(
      operator,
      shipment.id,
      { ...version(delivered.item), reason: "Ficticio" },
      crypto.randomUUID(),
    ),
  ).rejects.toMatchObject({ code: "LOGISTICS_CONFLICT" });
});

test("Calidad rechazada no libera inventario y peso discrepante no fabrica merma", async () => {
  const { lot, entry } = await admitLot("rejected");
  await expect(
    services.logistics.release(
      operator,
      entry.id,
      { expectedVersion: entry.version, reason: "Ficticio" },
      crypto.randomUUID(),
    ),
  ).rejects.toMatchObject({ code: "QUALITY_NOT_APPROVED" });
  expect(await services.logistics.getEntry(operator, entry.id)).toMatchObject({
    disposition: "quarantine",
    onHandKg: lot.totalKg,
    dispatchableKg: "0.000",
  });
  const other = await logisticsLot(services, password, { result: null });
  await expect(
    services.logistics.admit(
      operator,
      {
        lotId: other.id,
        verifiedKg: "1.000",
        reference: "Ficticio",
        evidenceRef: "Ficticio",
      },
      crypto.randomUUID(),
    ),
  ).rejects.toMatchObject({ code: "ADMISSION_QUANTITY" });
});

test("cancelar reserva devuelve disponibilidad, sin crear otra admisión", async () => {
  const { shipment } = await reservedShipment();
  const cancelled = (
    await services.logistics.cancel(
      operator,
      shipment.id,
      { ...version(shipment), reason: "Ficticio" },
      crypto.randomUUID(),
    )
  ).item;
  expect(cancelled.inventory).toMatchObject({
    admittedKg: "73.125",
    onHandKg: "73.125",
    reservedKg: "0.000",
    unreservedKg: "73.125",
  });
  const history = await services.logistics.movements(
    operator,
    cancelled.stockEntryId,
    { offset: 0 },
  );
  expect(history.items.filter((row) => row.kind === "admitted")).toHaveLength(
    1,
  );
});

test("publicación y retiro SQL conservan DTO y otro centro no obtiene acceso", async () => {
  const lot = await publicationLot(services, password);
  const input = { ...demoProjection, expectedVersion: 0 },
    key = crypto.randomUUID();
  const published = await services.publication.publish(
    publisher,
    lot.id,
    input,
    key,
  );
  expect(await services.publication.query(published.item.publicId)).toEqual(
    demoProjection,
  );
  expect(
    (await services.publication.publish(publisher, lot.id, input, key))
      .replayed,
  ).toBe(true);
  const other = await login("publicacion2@example.test");
  await expect(services.publication.get(other, lot.id)).rejects.toMatchObject({
    status: 404,
  });
  await services.publication.withdraw(
    publisher,
    lot.id,
    { expectedVersion: published.item.version },
    crypto.randomUUID(),
  );
  await expect(
    services.publication.query(published.item.publicId),
  ).rejects.toMatchObject({ status: 404 });
});

test("logout revoca sesión persistida y credenciales incorrectas no crean otra", async () => {
  await expect(
    services.access.login("campo@example.test", "incorrect-fiction"),
  ).rejects.toMatchObject({ status: 401 });
  const session = await services.access.login("campo@example.test", password);
  await services.access.logout(session.token);
  await expect(
    services.access.authenticate(session.token),
  ).rejects.toMatchObject({ status: 401 });
  await expect(services.access.authenticate("invalid")).rejects.toMatchObject({
    status: 401,
  });
});

test("reporte SQL devuelve solo salidas del lote y deniega un centro sin concesión", async () => {
  const { lot, shipment } = await reservedShipment();
  const departedAt = new Date(shipment.createdAt).toISOString();
  await services.logistics.depart(
    operator,
    shipment.id,
    { ...version(shipment), departedAt },
    crypto.randomUUID(),
  );
  const input = shipmentReportInput.parse({
    centerId: shipment.centerId,
    lotId: lot.id,
    from: new Date(Date.parse(departedAt) - 1000).toISOString(),
    to: new Date(Date.parse(departedAt) + 1000).toISOString(),
    limit: 1,
  });
  const report = await services.reports.shipments(operator, input);
  expect(report.items).toHaveLength(1);
  expect(report.items[0]).toMatchObject({
    shipmentId: shipment.id,
    quantityKg: "73.125",
    deliveredAt: null,
  });
  const viewer = await login("lector@example.test");
  await expect(services.reports.shipments(viewer, input)).rejects.toMatchObject(
    { status: 403 },
  );
});

test("alta productor/parcela exige admin y origen propio; collector no ve productor sin asignación", async () => {
  const admin = await login("admin@example.test");
  const producer = await services.producers.createProducer(
    admin,
    producerInput.parse({ name: " Productor ficticio Jest " }),
  );
  expect(producer.name).toBe("Productor ficticio Jest");
  const parcel = parcelInput.parse({
    producerId: producer.id,
    name: "Parcela ficticia",
    latitude: -12,
    longitude: -76,
  });
  expect(
    (await services.producers.createParcel(admin, parcel)).producerId,
  ).toBe(producer.id);
  await expect(
    services.producers.createProducer(field, { name: "Ficticio" }),
  ).rejects.toMatchObject({ status: 403 });
  await expect(
    services.producers.createParcel(admin, {
      ...parcel,
      producerId: ids.otherProducer,
    }),
  ).rejects.toMatchObject({ status: 404 });
  expect(
    (await services.producers.listProducers(field)).map((row) => row.id),
  ).not.toContain(producer.id);
  expect(
    (await services.producers.listParcels(field)).map((row) => row.id),
  ).toContain(ids.parcel);
});

test("Calidad incompleta y versión vieja no se cierran ni autorizan despacho", async () => {
  const lot = await logisticsLot(services, password, { result: "draft" });
  const quality = await login("calidad@example.test");
  const item = (
    await services.quality.lots(quality, { centerId: lot.centerId, offset: 0 })
  ).find((row) => row.id === lot.id);
  const evaluation = await services.quality.get(quality, item.evaluationId);
  const close = {
    expectedVersion: evaluation.version,
    result: "accepted",
    note: "Ficticio",
  };
  await expect(
    services.quality.close(quality, evaluation.id, close, crypto.randomUUID()),
  ).rejects.toMatchObject({ code: "QUALITY_INCOMPLETE" });
  await expect(
    services.quality.close(
      quality,
      evaluation.id,
      { ...close, expectedVersion: evaluation.version + 1 },
      crypto.randomUUID(),
    ),
  ).rejects.toMatchObject({ code: "QUALITY_CONFLICT" });
  expect(await services.quality.get(quality, evaluation.id)).toMatchObject({
    evaluationState: "draft",
    dispatchAuthorized: false,
  });
});
