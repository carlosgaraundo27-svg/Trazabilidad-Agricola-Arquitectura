import { ids } from "../../scripts/seed.js";
import { intakeIds } from "../../scripts/seed-intake.js";
import { preLotInput } from "../../server/modules/harvest/domain.js";
import { receiptInput } from "../../server/modules/intake/domain.js";
import { lotInput } from "../../server/modules/traceability/domain.js";
export const demoProjection = {
  lotCode: "VV-DEMO-001",
  stages: [
    {
      stage: "harvest",
      date: "2026-01-02",
      description: "Cosecha ficticia documentada.",
    },
    {
      stage: "consolidation",
      date: "2026-01-03",
      description: "Consolidación ficticia del lote.",
    },
  ],
};
export async function publicationLot(services, password) {
  const actor = async (email) =>
    services.access.authenticate(
      (await services.access.login(email, password)).token,
    );
  const field = await actor("campo@example.test"),
    op = await actor("acopio@example.test");
  const pre = (
    await services.harvest.create(
      field,
      preLotInput.parse({
        parcelId: ids.parcel,
        harvestedAt: "2026-01-02T12:00:00Z",
        quantity: "100",
        unit: "kg",
      }),
      crypto.randomUUID(),
    )
  ).item;
  const receipt = (
    await services.intake.receive(
      op,
      receiptInput.parse({
        centerId: intakeIds.center,
        preLotId: pre.id,
        reference: "PUB-" + pre.id,
        grossKg: "100",
        tareKg: "0",
        evidence: "Nota privada ficticia NO PUBLICAR",
      }),
      crypto.randomUUID(),
    )
  ).item;
  await services.intake.confirm(op, receipt.id, crypto.randomUUID());
  return (
    await services.intake.consolidate(
      op,
      lotInput.parse({ centerId: intakeIds.center, receiptIds: [receipt.id] }),
      crypto.randomUUID(),
    )
  ).item;
}
