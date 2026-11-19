import { Router } from "express";
import { AppError } from "./shared/errors.js";
import {
  uuid,
  pageInput,
  offsetInput,
  admissionInput,
  releaseInput,
  shipmentInput,
  correctionInput,
  reservationInput,
  departureInput,
  deliveryInput,
  cancellationInput,
} from "./modules/logistics/domain.js";
export function logisticsRouter(services) {
  const router = Router();
  const key = (req) => {
    const p = uuid.safeParse(req.get("Idempotency-Key"));
    if (!p.success)
      throw new AppError(
        400,
        "INVALID_KEY",
        "Idempotency-Key debe ser un UUID.",
      );
    return p.data;
  };
  const send = (res, r) => res.status(r.replayed ? 200 : 201).json(r.item);
  router.get("/inventory/lots", async (req, res) =>
    res.json({
      items: await services.logistics.candidates(
        req.actor,
        pageInput.parse(req.query),
      ),
      limit: 100,
    }),
  );
  router.get("/shipments", async (req, res) =>
    res.json({
      items: await services.logistics.shipments(
        req.actor,
        pageInput.parse(req.query),
      ),
      limit: 100,
    }),
  );
  router.post("/shipments", async (req, res) =>
    send(
      res,
      await services.logistics.createShipment(
        req.actor,
        shipmentInput.parse(req.body),
        key(req),
      ),
    ),
  );
  router.get("/shipments/:id", async (req, res) =>
    res.json(
      await services.logistics.getShipment(
        req.actor,
        uuid.parse(req.params.id),
      ),
    ),
  );
  router.get("/shipments/:id/events", async (req, res) =>
    res.json(
      await services.logistics.events(
        req.actor,
        uuid.parse(req.params.id),
        offsetInput.parse(req.query),
      ),
    ),
  );
  router.put("/shipments/:id/transport", async (req, res) =>
    res.json(
      (
        await services.logistics.correctTransport(
          req.actor,
          uuid.parse(req.params.id),
          correctionInput.parse(req.body),
          key(req),
        )
      ).item,
    ),
  );
  for (const [path, method, schema] of [
    ["reservation", "reserve", reservationInput],
    ["departure", "depart", departureInput],
    ["delivery", "deliver", deliveryInput],
    ["cancellation", "cancel", cancellationInput],
  ])
    router.post("/shipments/:id/" + path, async (req, res) =>
      send(
        res,
        await services.logistics[method](
          req.actor,
          uuid.parse(req.params.id),
          schema.parse(req.body),
          key(req),
        ),
      ),
    );
  router.get("/inventory", async (req, res) =>
    res.json({
      items: await services.logistics.list(
        req.actor,
        pageInput.parse(req.query),
      ),
      limit: 100,
    }),
  );
  router.post("/inventory/entries", async (req, res) =>
    send(
      res,
      await services.logistics.admit(
        req.actor,
        admissionInput.parse(req.body),
        key(req),
      ),
    ),
  );
  router.get("/inventory/entries/:id", async (req, res) =>
    res.json(
      await services.logistics.getEntry(req.actor, uuid.parse(req.params.id)),
    ),
  );
  router.get("/inventory/entries/:id/movements", async (req, res) =>
    res.json(
      await services.logistics.movements(
        req.actor,
        uuid.parse(req.params.id),
        offsetInput.parse(req.query),
      ),
    ),
  );
  router.post("/inventory/entries/:id/release", async (req, res) =>
    send(
      res,
      await services.logistics.release(
        req.actor,
        uuid.parse(req.params.id),
        releaseInput.parse(req.body),
        key(req),
      ),
    ),
  );
  return router;
}
