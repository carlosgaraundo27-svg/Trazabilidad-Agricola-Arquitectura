import { createHash } from "node:crypto";
import { AppError, missing } from "../../shared/errors.js";
import { balances, eligible } from "./domain.js";
const conflict = () =>
  new AppError(
    409,
    "LOGISTICS_CONFLICT",
    "Registro existente, estado o versión desactualizados. Actualice los datos.",
  );
export function logisticsService({
  repository,
  unitOfWork,
  access,
  traceability,
  quality,
}) {
  async function permission(tx, actor, centerId, action) {
    try {
      await access.requireCenter(tx, actor, centerId, action);
    } catch (e) {
      if (e.status === 403) throw missing();
      throw e;
    }
  }
  async function responseEntry(tx, actor, id) {
    const entry = await repository.entry(tx, actor, id, "share");
    const amount = balances(await repository.totals(tx, actor, id));
    if (amount.admittedKg !== entry.sourceKg)
      throw new AppError(
        500,
        "INVENTORY_INVARIANT",
        "Inventario inconsistente. Operación no aplicada.",
      );
    const qualitySummary = await quality.eligibility(tx, actor, entry.lotId);
    return {
      ...entry,
      ...amount,
      unit: "kg",
      qualitySummary,
      dispatchableKg:
        entry.disposition === "released" && eligible(qualitySummary)
          ? amount.unreservedKg
          : "0.000",
      packagingState: "not_managed",
      contributions: (
        await traceability.inventorySource(tx, actor, entry.lotId)
      ).contributions,
    };
  }
  async function command(actor, ref, input, key, action, work) {
    try {
      return await unitOfWork(async (tx) => {
        let initial;
        if (ref.lotId)
          initial = await traceability.identity(tx, actor, ref.lotId);
        else if (ref.shipmentId)
          initial = await repository.shipment(tx, actor, ref.shipmentId);
        else initial = await repository.entry(tx, actor, ref.entryId);
        if (!initial) throw missing();
        await permission(tx, actor, initial.centerId, action);
        await repository.lockRequest(tx, actor, key);
        const hash = createHash("sha256")
          .update(JSON.stringify({ action, ref, input }))
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
        const lotId = ref.lotId ?? initial.lotId;
        await traceability.identity(tx, actor, lotId, "update");
        const entryId = ref.entryId ?? initial.stockEntryId;
        const entry = entryId
          ? await repository.entry(tx, actor, entryId, "update")
          : null;
        const shipment = ref.shipmentId
          ? await repository.shipment(tx, actor, ref.shipmentId, "update")
          : null;
        const source = await traceability.inventorySource(tx, actor, lotId);
        const item = await work(tx, { entry, source, shipment });
        await access.audit(tx, actor, action, item.id);
        await repository.saveRequest(
          tx,
          actor,
          key,
          initial.centerId,
          hash,
          item,
        );
        return { replayed: false, item };
      });
    } catch (e) {
      if (
        e.code === "23505" &&
        [
          "shipments_organization_id_center_id_guide_reference_key",
          "logistics_guide_reference_unique",
        ].includes(e.constraint)
      )
        throw new AppError(
          409,
          "GUIDE_REFERENCE_CONFLICT",
          "La referencia de guía ya está asignada en esta organización y centro, incluso si el despacho fue cancelado.",
        );
      if (e.code === "23505") throw conflict();
      throw e;
    }
  }
  async function requireEntry(tx, actor, id, action) {
    const entry = await repository.entry(tx, actor, id);
    if (!entry) throw missing();
    await permission(tx, actor, entry.centerId, action);
    return entry;
  }
  function requireEligible(summary) {
    if (!eligible(summary))
      throw new AppError(
        422,
        "QUALITY_NOT_APPROVED",
        "Se requiere evaluación de Calidad cerrada con resultado Aprobado.",
      );
  }
  async function responseShipment(tx, actor, id) {
    const item = await repository.shipment(tx, actor, id, "share");
    return {
      ...item,
      unit: "kg",
      inventory: await responseEntry(tx, actor, item.stockEntryId),
    };
  }
  const stockInsufficient = () =>
    new AppError(
      409,
      "STOCK_INSUFFICIENT",
      "No hay disponibilidad suficiente para reservar o despachar el lote completo. Revise la reserva vigente.",
    );
  const stateFor = {
    reserved: ["draft"],
    dispatched: ["reserved"],
    delivered: ["in_transit"],
    cancelled: ["draft", "reserved"],
  };
  const nextState = {
    reserved: "reserved",
    dispatched: "in_transit",
    delivered: "delivered",
    cancelled: "cancelled",
  };
  const actionFor = {
    reserved: "shipment:reserve",
    dispatched: "shipment:dispatch",
    delivered: "shipment:deliver",
    cancelled: "shipment:cancel",
  };
  function transition(actor, id, input, key, kind) {
    return command(
      actor,
      { shipmentId: id },
      input,
      key,
      actionFor[kind],
      async (tx, { entry, shipment }) => {
        if (
          shipment.version !== input.expectedVersion ||
          entry.version !== input.expectedInventoryVersion ||
          !stateFor[kind].includes(shipment.state)
        )
          throw conflict();
        const before = await responseShipment(tx, actor, id),
          stock = before.inventory;
        if (kind === "reserved" || kind === "dispatched") {
          requireEligible(stock.qualitySummary);
          if (entry.disposition !== "released")
            throw new AppError(
              422,
              "INVENTORY_NOT_RELEASED",
              "Libere explícitamente el inventario antes de reservar o salir.",
            );
          if (
            (kind === "reserved" ? stock.unreservedKg : stock.reservedKg) !==
              shipment.quantityKg ||
            stock.onHandKg !== shipment.quantityKg
          )
            throw stockInsufficient();
        }
        if (kind === "dispatched") {
          if (
            !shipment.destinationLabel ||
            Object.values(shipment.transport).some((v) => !v)
          )
            throw new AppError(
              422,
              "TRANSPORT_INCOMPLETE",
              "Complete guía, vehículo, placa, chofer, precinto y destino antes de confirmar salida.",
            );
          if (Date.parse(input.departedAt) < Date.parse(shipment.createdAt))
            throw new AppError(
              422,
              "DEPARTURE_TIME",
              "La salida no puede ser anterior a la preparación del despacho.",
            );
        }
        if (
          kind === "delivered" &&
          (input.receivedKg !== shipment.quantityKg ||
            Date.parse(input.deliveredAt) < Date.parse(shipment.departedAt))
        )
          throw new AppError(
            422,
            "DELIVERY_TOTAL",
            "Confirme el total real después de la salida. Una diferencia requiere conciliación fuera de este alcance; no se crea merma.",
          );
        await repository.changeShipment(
          tx,
          actor,
          id,
          nextState[kind],
          kind === "dispatched" ? input.departedAt : null,
        );
        const effect =
          kind === "cancelled"
            ? shipment.state === "reserved"
              ? "reservation_released"
              : null
            : kind;
        if (effect) {
          await repository.advanceEntry(tx, actor, entry.id);
          await repository.movement(
            tx,
            actor,
            entry,
            effect,
            id,
            input.departedAt ?? input.deliveredAt ?? null,
          );
        }
        if (kind === "delivered")
          await repository.deliver(tx, actor, shipment, input);
        const item = await responseShipment(tx, actor, id);
        await repository.event(
          tx,
          actor,
          entry,
          before,
          item,
          kind,
          input.reason ?? input.evidenceRef,
          id,
        );
        return item;
      },
    );
  }
  return {
    createShipment(actor, input, key) {
      return command(
        actor,
        { entryId: input.stockEntryId },
        input,
        key,
        "shipment:create",
        async (tx, { entry }) => {
          const stock = await responseEntry(tx, actor, entry.id);
          if (stock.onHandKg !== entry.sourceKg) throw stockInsufficient();
          const id = await repository.createShipment(tx, actor, entry, input),
            item = await responseShipment(tx, actor, id);
          await repository.event(
            tx,
            actor,
            entry,
            null,
            item,
            "created",
            null,
            id,
          );
          return item;
        },
      );
    },
    correctTransport(actor, id, input, key) {
      return command(
        actor,
        { shipmentId: id },
        input,
        key,
        "shipment:update",
        async (tx, { entry, shipment }) => {
          if (
            shipment.version !== input.expectedVersion ||
            !["draft", "reserved"].includes(shipment.state)
          )
            throw conflict();
          const before = await responseShipment(tx, actor, id);
          await repository.correctTransport(tx, actor, id, input);
          const item = await responseShipment(tx, actor, id);
          await repository.event(
            tx,
            actor,
            entry,
            before,
            item,
            "transport_corrected",
            input.reason,
            id,
          );
          return item;
        },
      );
    },
    reserve: (actor, id, input, key) =>
      transition(actor, id, input, key, "reserved"),
    depart: (actor, id, input, key) =>
      transition(actor, id, input, key, "dispatched"),
    deliver: (actor, id, input, key) =>
      transition(actor, id, input, key, "delivered"),
    cancel: (actor, id, input, key) =>
      transition(actor, id, input, key, "cancelled"),
    getShipment: (actor, id) =>
      unitOfWork(async (tx) => {
        const item = await repository.shipment(tx, actor, id);
        if (!item) throw missing();
        await permission(tx, actor, item.centerId, "shipment:read");
        await repository.entry(tx, actor, item.stockEntryId, "share");
        return responseShipment(tx, actor, id);
      }),
    shipments: (actor, { centerId, offset }) =>
      unitOfWork(async (tx) => {
        await access.requireCenter(tx, actor, centerId, "shipment:read");
        const ids = await repository.shipmentIds(tx, actor, centerId, offset);
        const items = [];
        for (const { id } of ids) {
          const s = await repository.shipment(tx, actor, id);
          await repository.entry(tx, actor, s.stockEntryId, "share");
          items.push(await responseShipment(tx, actor, id));
        }
        return items;
      }),
    events: (actor, id, { offset }) =>
      unitOfWork(async (tx) => {
        const s = await repository.shipment(tx, actor, id);
        if (!s) throw missing();
        await permission(tx, actor, s.centerId, "shipment:read");
        await repository.entry(tx, actor, s.stockEntryId, "share");
        const shipment = await responseShipment(tx, actor, id);
        return {
          items: await repository.events(tx, actor, id, offset),
          limit: 100,
          snapshotVersion: shipment.version,
          shipment,
        };
      }),
    admit(actor, input, key) {
      return command(
        actor,
        { lotId: input.lotId },
        input,
        key,
        "inventory:admit",
        async (tx, { source }) => {
          if (await repository.entryForLot(tx, actor, source.id))
            throw conflict();
          if (source.totalKg !== input.verifiedKg)
            throw new AppError(
              422,
              "ADMISSION_QUANTITY",
              "El peso verificado debe coincidir con el total real documentado del lote. No se registra merma.",
            );
          const id = await repository.admit(tx, actor, source, input),
            entry = await repository.entry(tx, actor, id);
          await repository.movement(tx, actor, entry, "admitted");
          const item = await responseEntry(tx, actor, id);
          await repository.event(
            tx,
            actor,
            entry,
            null,
            item,
            "admitted",
            input.evidenceRef,
          );
          return item;
        },
      );
    },
    release(actor, id, input, key) {
      return command(
        actor,
        { entryId: id },
        input,
        key,
        "inventory:release",
        async (tx, { entry }) => {
          if (
            entry.disposition !== "quarantine" ||
            entry.version !== input.expectedVersion
          )
            throw conflict();
          const summary = await quality.eligibility(tx, actor, entry.lotId);
          requireEligible(summary);
          const before = await responseEntry(tx, actor, id);
          await repository.release(tx, actor, entry, summary, input.reason);
          const item = await responseEntry(tx, actor, id);
          await repository.event(
            tx,
            actor,
            entry,
            before,
            item,
            "released",
            input.reason,
          );
          return item;
        },
      );
    },
    getEntry: (actor, id) =>
      unitOfWork(async (tx) => {
        await requireEntry(tx, actor, id, "inventory:read");
        return responseEntry(tx, actor, id);
      }),
    list: (actor, { centerId, offset }) =>
      unitOfWork(async (tx) => {
        await access.requireCenter(tx, actor, centerId, "inventory:read");
        const ids = await repository.entryIds(tx, actor, centerId, offset);
        const items = [];
        for (const { id } of ids)
          items.push(await responseEntry(tx, actor, id));
        return items;
      }),
    movements: (actor, id, { offset }) =>
      unitOfWork(async (tx) => {
        await requireEntry(tx, actor, id, "inventory:read");
        const inventory = await responseEntry(tx, actor, id);
        return {
          items: await repository.movements(tx, actor, id, offset),
          limit: 100,
          snapshotVersion: inventory.version,
          inventory,
        };
      }),
  };
}
