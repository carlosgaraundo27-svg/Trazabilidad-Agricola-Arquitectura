import { createHash } from "node:crypto";
import { AppError, missing } from "../../shared/errors.js";
import { localHarvestDate, measurement } from "./domain.js";
const conflict = (message) => new AppError(409, "INTAKE_CONFLICT", message);
export function intakeService({
  repository,
  unitOfWork,
  access,
  harvest,
  traceability,
}) {
  async function decorate(tx, actor, centerId, rows) {
    const consumed = new Map(
      (
        await traceability.consumed(
          tx,
          actor,
          centerId,
          rows.map((r) => r.id),
        )
      ).map((r) => [r.receiptId, r]),
    );
    return rows.map((r) => ({
      ...r,
      enabledKg: r.status === "confirmed" ? r.netKg : "0.000",
      consumedKg: consumed.get(r.id)?.amountKg ?? "0.000",
      availableKg:
        r.status === "confirmed" && !consumed.has(r.id) ? r.netKg : "0.000",
      lotId: consumed.get(r.id)?.lotId ?? null,
    }));
  }
  async function command(actor, key, action, input, work) {
    try {
      return await unitOfWork(async (tx) => {
        const receipt = input.receiptId
          ? await repository.get(tx, actor, input.receiptId)
          : null;
        if (input.receiptId && !receipt) throw missing();
        const centerId = input.centerId ?? receipt.centerId;
        try {
          await access.requireCenter(tx, actor, centerId, action);
        } catch (error) {
          if (receipt && error.status === 403) throw missing();
          throw error;
        }
        await repository.lockRequest(tx, actor, key);
        const hash = createHash("sha256")
          .update(JSON.stringify({ action, input }))
          .digest("hex");
        const existing = await repository.request(tx, actor, key);
        if (existing) {
          if (existing.request_hash !== hash)
            throw new AppError(
              409,
              "IDEMPOTENCY_CONFLICT",
              "La clave ya se usó con otro contenido u operación.",
            );
          return { replayed: true, item: existing.response };
        }
        const item = await work(tx, centerId);
        await access.audit(tx, actor, action, item.id);
        await repository.saveRequest(
          tx,
          actor,
          key,
          centerId,
          action,
          hash,
          item,
        );
        return { replayed: false, item };
      });
    } catch (error) {
      if (error.code === "23505")
        throw conflict("Pre-lote, referencia, revisión o saldo ya utilizado.");
      throw error;
    }
  }
  async function lockedReceipt(tx, actor, centerId, id) {
    await repository.lockReceipts(tx, actor, centerId, [id]);
    const r = await repository.get(tx, actor, id);
    if (!r || r.centerId !== centerId) throw missing();
    return r;
  }
  return {
    async origins(actor, { centerId, offset }) {
      return unitOfWork(async (tx) => {
        await access.requireCenter(tx, actor, centerId, "intake:read");
        return (await harvest.intakeOrigins(tx, actor, offset)).map((r) => ({
          ...r,
          localHarvestDate: localHarvestDate(r.harvestedAt),
        }));
      });
    },
    async list(actor, { centerId, offset }) {
      return unitOfWork(async (tx) => {
        await repository.readSnapshot(tx);
        await access.requireCenter(tx, actor, centerId, "intake:read");
        return decorate(
          tx,
          actor,
          centerId,
          await repository.list(tx, actor, centerId, offset),
        );
      });
    },
    async lots(actor, { centerId, offset }) {
      return unitOfWork(async (tx) => {
        await access.requireCenter(tx, actor, centerId, "intake:read");
        return traceability.list(tx, actor, centerId, offset);
      });
    },
    receive(actor, input, key) {
      return command(
        actor,
        key,
        "intake:receive",
        input,
        async (tx, centerId) => {
          const source = await harvest.intakeOrigin(tx, actor, input.preLotId);
          const origin = {
            id: source.id,
            harvestId: source.harvestId,
            parcelId: source.parcelId,
            producerId: source.producerId,
            organizationId: source.organizationId,
            producerName: source.producerName,
            parcelName: source.parcelName,
            harvestedAt: new Date(source.harvestedAt).toISOString(),
            localHarvestDate: localHarvestDate(source.harvestedAt),
            quantity: source.quantity,
            unit: source.unit,
          };
          const measured = measurement(input, origin);
          const id = await repository.create(
            tx,
            actor,
            input,
            origin,
            measured,
          );
          await repository.event(tx, actor, id, "received", measured);
          return (
            await decorate(tx, actor, centerId, [
              await repository.get(tx, actor, id),
            ])
          )[0];
        },
      );
    },
    review(actor, receiptId, input, key) {
      return command(
        actor,
        key,
        "intake:review",
        { receiptId, ...input },
        async (tx, centerId) => {
          const r = await lockedReceipt(tx, actor, centerId, receiptId);
          if (r.capturedBy === actor.id)
            throw new AppError(
              403,
              "SELF_APPROVAL",
              "La revisión requiere una persona distinta del capturador.",
            );
          if (r.status !== "pending_review")
            throw conflict("La recepción no tiene una discrepancia pendiente.");
          await repository.review(tx, actor, receiptId, input.note);
          await repository.event(tx, actor, receiptId, "reviewed", {
            note: input.note,
          });
          return (
            await decorate(tx, actor, centerId, [
              await repository.get(tx, actor, receiptId),
            ])
          )[0];
        },
      );
    },
    confirm(actor, receiptId, key) {
      return command(
        actor,
        key,
        "intake:confirm",
        { receiptId },
        async (tx, centerId) => {
          const r = await lockedReceipt(tx, actor, centerId, receiptId);
          if (r.status !== "weighed")
            throw conflict(
              "La recepción requiere revisión o ya fue confirmada.",
            );
          await repository.confirm(tx, actor, receiptId);
          await repository.event(tx, actor, receiptId, "confirmed", {
            netKg: r.netKg,
          });
          return (
            await decorate(tx, actor, centerId, [
              await repository.get(tx, actor, receiptId),
            ])
          )[0];
        },
      );
    },
    consolidate(actor, input, key) {
      return command(
        actor,
        key,
        "lot:consolidate",
        input,
        async (tx, centerId) => {
          await repository.lockReceipts(tx, actor, centerId, input.receiptIds);
          const receipts = [];
          for (const id of input.receiptIds) {
            const r = await repository.get(tx, actor, id);
            if (!r || r.centerId !== centerId) throw missing();
            receipts.push(r);
          }
          if (receipts.some((r) => r.status !== "confirmed"))
            throw conflict(
              "Confirme todas las recepciones y sus revisiones antes de consolidar.",
            );
          if (
            (await traceability.consumed(tx, actor, centerId, input.receiptIds))
              .length
          )
            throw conflict("Una recepción seleccionada ya fue consumida.");
          return traceability.consolidate(tx, actor, receipts);
        },
      );
    },
  };
}
