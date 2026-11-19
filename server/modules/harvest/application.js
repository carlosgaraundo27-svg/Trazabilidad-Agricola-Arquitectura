import { AppError, missing } from "../../shared/errors.js";
export function harvestService({ repository, unitOfWork, access, producers }) {
  // Internal port: callers must authorize and validate origin in the same UoW.
  async function record(tx, actor, input, key) {
    const item = await repository.create(tx, actor, input, key);
    await access.audit(tx, actor, "prelot:create", item.id);
    return item;
  }
  return {
    record,
    async intakeOrigin(tx, actor, preLotId) {
      const origin = await repository.intakeOrigin(tx, actor, preLotId);
      if (!origin) throw missing();
      return {
        ...origin,
        ...(await producers.intakeOrigin(tx, actor, origin.parcelId)),
      };
    },
    async intakeOrigins(tx, actor, offset) {
      const rows = await repository.intakeOrigins(tx, actor, offset);
      const origins = new Map(
        (
          await producers.intakeOrigins(
            tx,
            actor,
            rows.map((r) => r.parcelId),
          )
        ).map((r) => [r.parcelId, r]),
      );
      return rows.map((row) => {
        const origin = origins.get(row.parcelId);
        if (!origin) throw missing();
        return { ...row, ...origin };
      });
    },
    async create(actor, input, key) {
      access.authorize(actor, "prelot:create");
      return unitOfWork(async (tx) => {
        await producers.requireHarvestOrigin(tx, actor, input.parcelId);
        await repository.lockKey(tx, actor, key);
        const existing = await repository.findRequest(tx, actor, key);
        if (existing) {
          if (
            Object.keys(input).some(
              (field) => input[field] !== existing.request_payload[field],
            )
          )
            throw new AppError(
              409,
              "IDEMPOTENCY_CONFLICT",
              "La clave ya se usó con otro contenido.",
            );
          return {
            replayed: true,
            item: await repository.get(tx, existing.id),
          };
        }
        return { replayed: false, item: await record(tx, actor, input, key) };
      });
    },
    async list(actor, offset = 0) {
      access.authorize(actor, "prelot:read");
      return unitOfWork(async (tx) =>
        repository.list(tx, actor, await access.scope(tx, actor), offset),
      );
    },
  };
}
