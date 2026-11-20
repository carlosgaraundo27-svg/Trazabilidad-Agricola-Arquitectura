import { AppError } from "../../shared/errors.js";
import { payloadDigest } from "./sync-domain.js";
import { createHash } from "node:crypto";

export function harvestSyncService({
  repository,
  unitOfWork,
  access,
  producers,
  harvest,
}) {
  return {
    async catalog(actor) {
      return unitOfWork(async (tx) => {
        const current = await access.requireActiveSession(tx, actor);
        access.authorize(current, "prelot:create");
        const parcels = await producers.assignedCatalog(tx, current);
        if (parcels.length > 1000)
          throw new AppError(
            503,
            "CATALOG_TOO_LARGE",
            "El catálogo completo excede el límite técnico; no se descargó parcialmente.",
          );
        const data = {
          owner: {
            organizationId: current.organizationId,
            actorId: current.id,
          },
          parcels,
          units: ["kg", "unidad"],
          quantity: { wholeDigits: 9, decimalPlaces: 3 },
        };
        return {
          ...data,
          version: createHash("sha256")
            .update(JSON.stringify(data))
            .digest("hex"),
          generatedAt: new Date().toISOString(),
        };
      });
    },
    async accept(actor, id, input) {
      return unitOfWork(async (tx) => {
        // Wait for this identity before checking time-sensitive authorization.
        await repository.lock(tx, actor, id);
        const current = await access.requireActiveSession(tx, actor);
        access.authorize(current, "prelot:create");
        await producers.requireHarvestOrigin(tx, current, input.parcelId);
        const digest = payloadDigest(input);
        const existing = await repository.receipt(tx, current, id);
        if (existing) {
          if (
            existing.actor_id !== current.id ||
            existing.payload_hash !== digest ||
            Object.keys(input).some(
              (field) => input[field] !== existing.payload[field],
            )
          )
            throw new AppError(
              409,
              "SYNC_ID_CONTENT_CONFLICT",
              "La identidad de captura ya está confirmada y no admite este envío.",
            );
          return { replayed: true, item: existing.result };
        }
        const { schemaVersion, ...origin } = input;
        // Internal H port joins this UoW; it does not call the online transaction.
        const item = await harvest.record(
          tx,
          current,
          origin,
          crypto.randomUUID(),
        );
        const result = {
          clientCaptureId: id,
          preLotId: item.id,
          harvestId: item.harvestId,
          status: item.status,
          acceptedAt: new Date(item.createdAt).toISOString(),
          payload: { schemaVersion, ...origin },
        };
        await repository.save(tx, current, id, input, digest, result);
        return { replayed: false, item: result };
      });
    },
  };
}
