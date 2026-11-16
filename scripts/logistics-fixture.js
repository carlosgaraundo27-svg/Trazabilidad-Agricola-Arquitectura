import { ids } from "./seed.js";
import { intakeIds } from "./seed-intake.js";
import { preLotInput } from "../server/modules/harvest/domain.js";
import { receiptInput } from "../server/modules/intake/domain.js";
import { lotInput } from "../server/modules/traceability/domain.js";
import { updateQualityInput } from "../server/modules/intake/quality-domain.js";
export async function logisticsLot(
  services,
  password,
  { result = "accepted", quantities = ["37.125", "36.000"] } = {},
) {
  const actor = async (email) =>
    services.access.authenticate(
      (await services.access.login(email, password)).token,
    );
  const field = await actor("campo@example.test"),
    intake = await actor("acopio@example.test"),
    quality = await actor("calidad@example.test");
  const metadata = {
    measuredAt: "2026-01-02T20:00:00.123Z",
    observedBy: "Persona ficticia",
    provenance: "Documento ficticio",
    method: "Registro manual ficticio",
  };
  const receipts = [];
  for (const quantity of quantities) {
    const p = (
      await services.harvest.create(
        field,
        preLotInput.parse({
          parcelId: ids.parcel,
          harvestedAt: "2026-01-02T12:00:00Z",
          quantity,
          unit: "kg",
        }),
        crypto.randomUUID(),
      )
    ).item;
    const r = (
      await services.intake.receive(
        intake,
        receiptInput.parse({
          centerId: intakeIds.center,
          preLotId: p.id,
          reference: "LOG-" + p.id,
          grossKg: quantity,
          tareKg: "0",
          evidence: "Pesaje ficticio privado",
          temperature: { ...metadata, value: "18.10", unit: "°C" },
        }),
        crypto.randomUUID(),
      )
    ).item;
    await services.intake.confirm(intake, r.id, crypto.randomUUID());
    receipts.push(r.id);
  }
  const lot = (
    await services.intake.consolidate(
      intake,
      lotInput.parse({ centerId: intakeIds.center, receiptIds: receipts }),
      crypto.randomUUID(),
    )
  ).item;
  if (result === null) return lot;
  let q = (
    await services.quality.create(
      quality,
      { lotId: lot.id },
      crypto.randomUUID(),
    )
  ).item;
  if (result === "draft") return lot;
  const capture = {
    sample: {
      reference: "MUESTRA-DEMO",
      sampledAt: metadata.measuredAt,
      sampledBy: metadata.observedBy,
      provenance: metadata.provenance,
    },
    weights: [
      {
        ...metadata,
        fruitReference: "FRUTO-DEMO",
        value: "210.25",
        unit: "g/fruto",
      },
    ],
    dryMatter: { ...metadata, value: "23.10", unit: "%" },
    discard: {
      ...metadata,
      inspectedCount: 3,
      discardedCount: 1,
      unit: "frutos",
    },
    temperatures: [],
  };
  q = (
    await services.quality.update(
      quality,
      q.id,
      updateQualityInput.parse({ expectedVersion: q.version, ...capture }),
      crypto.randomUUID(),
    )
  ).item;
  await services.quality.close(
    quality,
    q.id,
    {
      expectedVersion: q.version,
      result,
      note: "Decisión manual ficticia, sin validación agrícola",
    },
    crypto.randomUUID(),
  );
  return lot;
}
