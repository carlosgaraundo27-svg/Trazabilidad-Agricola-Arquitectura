import { createHash } from "node:crypto";
import { AppError, missing } from "../../shared/errors.js";
import {
  emptyCapture,
  discardPercentage,
  captureInput,
} from "./quality-domain.js";
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
  intake,
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
    // Hold a shared row lock so capture/version and its events describe one state.
    const item = await repository.get(tx, actor, id, "share");
    const lot = await traceability.qualityLot(tx, actor, item.lotId);
    const receiptTemperatures = await intake.originalTemperatures(
      tx,
      actor,
      item.centerId,
      lot.contributions.map((c) => c.receiptId),
    );
    return {
      ...decorate(item, await repository.events(tx, actor, id)),
      receiptTemperatures,
      missingReceiptTemperatureIds: lot.contributions
        .filter(
          (c) =>
            !receiptTemperatures.some(
              (r) => r.receiptId === c.receiptId && r.temperature,
            ),
        )
        .map((c) => c.receiptId)
        .sort(),
    };
  }
  async function validateCapture(tx, actor, item, capture) {
    const lot = await traceability.qualityLot(tx, actor, item.lotId);
    for (const temp of capture.temperatures) {
      const time = Date.parse(temp.measuredAt),
        consolidated = Date.parse(lot.createdAt);
      if (
        temp.stage !== "post_consolidation" ||
        temp.sourceReceiptId !== null ||
        time < consolidated
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
    close(actor, id, input, key) {
      return command(
        actor,
        key,
        "quality:close",
        { id, ...input },
        async (tx) => {
          const old = await repository.get(tx, actor, id, true);
          if (
            old.evaluationState !== "draft" ||
            old.version !== input.expectedVersion
          )
            throw conflict();
          const capture = captureInput.parse(old.capture);
          if (
            !capture.sample ||
            !capture.weights.length ||
            !capture.dryMatter ||
            !capture.discard
          )
            throw new AppError(
              422,
              "QUALITY_INCOMPLETE",
              "Complete muestra, pesos individuales, materia seca y conteos antes de cerrar.",
            );
          await validateCapture(tx, actor, old, capture);
          const current = await response(tx, actor, id);
          if (current.missingReceiptTemperatureIds.length)
            throw new AppError(
              422,
              "RECEIPT_TEMPERATURES_MISSING",
              "Faltan temperaturas originales de recepción. Consulte las recepciones pendientes en la evaluación.",
            );
          await repository.close(tx, actor, id, input);
          await repository.event(
            tx,
            actor,
            old,
            await repository.get(tx, actor, id),
            "closed",
            current.receiptTemperatures,
          );
          return id;
        },
      );
    },
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
