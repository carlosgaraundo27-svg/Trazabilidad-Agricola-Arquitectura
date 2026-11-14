import { AppError } from "../../shared/errors.js";
export function harvestService({ repository, unitOfWork, access, producers }) {
  return {
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
        const item = await repository.create(tx, actor, input, key);
        await access.audit(tx, actor, "prelot:create", item.id);
        return { replayed: false, item };
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
