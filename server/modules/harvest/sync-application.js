import { AppError } from "../../shared/errors.js";
import { payloadDigest } from "./sync-domain.js";

export function harvestSyncService({
  repository,
  unitOfWork,
  access,
  producers,
  harvest,
}) {
  return {
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
