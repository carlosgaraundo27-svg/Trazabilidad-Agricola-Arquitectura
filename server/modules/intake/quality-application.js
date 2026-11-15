import { createHash } from "node:crypto";
import { AppError, missing } from "../../shared/errors.js";
import { emptyCapture, discardPercentage } from "./quality-domain.js";
const conflict = () =>
  new AppError(
    409,
    "QUALITY_CONFLICT",
    "Evaluación existente, cerrada o versión desactualizada. Consulte el estado actual.",
  );
const decorate = (item, events) => ({
  ...item,
  events,
  discardPercentage: discardPercentage(item.capture.discard),
  decisionMode: "manual_academic",
  dispatchAuthorized: false,
});
export function qualityService({
  repository,
  unitOfWork,
  access,
  traceability,
}) {
  async function requireResource(tx, actor, id, action) {
    const item = await repository.get(tx, actor, id);
    if (!item) throw missing();
    try {
      await access.requireCenter(tx, actor, item.centerId, action);
    } catch (e) {
      if (e.status === 403) throw missing();
      throw e;
    }
    return item;
  }
  async function response(tx, actor, id) {
    const item = await repository.get(tx, actor, id);
    return decorate(item, await repository.events(tx, actor, id));
  }
  async function validateCapture(tx, actor, item, capture) {
    const lot = await traceability.qualityLot(tx, actor, item.lotId);
    const receipts = new Set(lot.contributions.map((c) => c.receiptId));
    for (const temp of capture.temperatures) {
      const time = Date.parse(temp.measuredAt),
        consolidated = Date.parse(lot.createdAt);
      if (
        (temp.stage === "receipt" &&
          (!receipts.has(temp.sourceReceiptId) || time > consolidated)) ||
        (temp.stage === "post_consolidation" && time < consolidated)
      )
        throw new AppError(
          422,
          "TEMPERATURE_SOURCE",
          "La etapa, momento o recepción de la temperatura no corresponde al lote.",
        );
    }
  }
  async function command(actor, key, action, input, work) {
    try {
      return await unitOfWork(async (tx) => {
        const resource = input.lotId
          ? await traceability.qualityLot(tx, actor, input.lotId)
          : await requireResource(tx, actor, input.id, action);
        if (!resource) throw missing();
        if (input.lotId) {
          try {
            await access.requireCenter(tx, actor, resource.centerId, action);
          } catch (e) {
            if (e.status === 403) throw missing();
            throw e;
          }
        }
        await repository.lockRequest(tx, actor, key);
        const hash = createHash("sha256")
          .update(JSON.stringify({ action, input }))
          .digest("hex");
        const old = await repository.request(tx, actor, key);
        if (old) {
          if (old.request_hash !== hash)
            throw new AppError(
              409,
              "IDEMPOTENCY_CONFLICT",
              "La clave ya corresponde a otra operación o contenido.",
            );
          return { replayed: true, item: old.response };
        }
        const id = await work(tx, resource);
        await access.audit(tx, actor, action, id);
        const item = await response(tx, actor, id);
        await repository.saveRequest(
          tx,
          actor,
          key,
          resource.centerId,
          hash,
          item,
        );
        return { replayed: false, item };
      });
    } catch (e) {
      if (e.code === "23505") throw conflict();
      throw e;
    }
  }
  return {
    async lots(actor, { centerId, offset }) {
      return unitOfWork(async (tx) => {
        await access.requireCenter(tx, actor, centerId, "quality:read");
        const lots = await traceability.list(tx, actor, centerId, offset),
          evaluations = await repository.projection(
            tx,
            actor,
            centerId,
            lots.map((l) => l.id),
          );
        return lots.map(({ qualityStatus, ...lot }) => {
          const e = evaluations.find((e) => e.lotId === lot.id);
          return {
            ...lot,
            consolidationQualityStatus: qualityStatus,
            evaluationId: e?.id ?? null,
            evaluationState: e?.evaluationState ?? null,
            qualityResult: e?.qualityResult ?? null,
            dispatchAuthorized: false,
          };
        });
      });
    },
    async get(actor, id) {
      return unitOfWork(async (tx) => {
        await requireResource(tx, actor, id, "quality:read");
        return response(tx, actor, id);
      });
    },
    create(actor, input, key) {
      return command(actor, key, "quality:create", input, async (tx, lot) => {
        const id = await repository.create(tx, actor, lot, emptyCapture());
        await repository.event(
          tx,
          actor,
          null,
          await repository.get(tx, actor, id),
          "created",
        );
        return id;
      });
    },
    update(actor, id, input, key) {
      return command(
        actor,
        key,
        "quality:update",
        { id, ...input },
        async (tx) => {
          const old = await repository.get(tx, actor, id, true);
          if (
            old.evaluationState !== "draft" ||
            old.version !== input.expectedVersion
          )
            throw conflict();
          const { expectedVersion, ...capture } = input;
          await validateCapture(tx, actor, old, capture);
          await repository.update(tx, actor, id, capture);
          await repository.event(
            tx,
            actor,
            old,
            await repository.get(tx, actor, id),
            "updated",
          );
          return id;
        },
      );
    },
  };
}
