import { AppError } from "../../shared/errors.js";
import { compatibleOrigins } from "./domain.js";
export function traceabilityService({ repository }) {
  return {
    qualityLot: (tx, actor, id) => repository.qualityLot(tx, actor, id),
    consumed: (tx, actor, centerId, ids) =>
      repository.consumed(tx, actor, centerId, ids),
    list: (tx, actor, centerId, offset) =>
      repository.list(tx, actor, centerId, offset),
    async consolidate(tx, actor, receipts) {
      if (
        !compatibleOrigins(
          receipts.map((receipt) => ({
            ...receipt.origin,
            centerId: receipt.centerId,
          })),
        )
      )
        throw new AppError(
          422,
          "INCOMPATIBLE_ORIGINS",
          "Seleccione recepciones del mismo productor, parcela, fecha local, organización y centro.",
        );
      const id = await repository.create(tx, actor, receipts);
      const item = await repository.get(tx, actor, receipts[0].centerId, id);
      await repository.event(tx, actor, id, {
        totalKg: item.totalKg,
        receiptIds: receipts.map((r) => r.id),
      });
      return repository.get(tx, actor, receipts[0].centerId, id);
    },
  };
}
