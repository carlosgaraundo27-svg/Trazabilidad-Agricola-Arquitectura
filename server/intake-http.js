import { Router } from "express";
import { z } from "zod";
import { AppError } from "./shared/errors.js";
import {
  receiptInput,
  reviewInput,
  confirmationInput,
  centerPageInput,
  uuidInput,
} from "./modules/intake/domain.js";
import { lotInput } from "./modules/traceability/domain.js";

export function intakeRouter(services) {
  const router = Router();
  const params = z.object({ id: uuidInput }).strict();
  const key = (req) => {
    const parsed = uuidInput.safeParse(req.get("Idempotency-Key"));
    if (!parsed.success)
      throw new AppError(
        400,
        "INVALID_KEY",
        "Idempotency-Key debe ser un UUID.",
      );
    return parsed.data;
  };
  const send = (res, result) =>
    res.status(result.replayed ? 200 : 201).json(result.item);
  router.get("/intake/centers", async (req, res) =>
    res.json({ items: await services.access.centers(req.actor) }),
  );
  router.get("/intake/origins", async (req, res) =>
    res.json({
      items: await services.intake.origins(
        req.actor,
        centerPageInput.parse(req.query),
      ),
      limit: 100,
    }),
  );
  router.get("/intake/receipts", async (req, res) =>
    res.json({
      items: await services.intake.list(
        req.actor,
        centerPageInput.parse(req.query),
      ),
      limit: 100,
    }),
  );
  router.post("/intake/receipts", async (req, res) =>
    send(
      res,
      await services.intake.receive(
        req.actor,
        receiptInput.parse(req.body),
        key(req),
      ),
    ),
  );
  router.post("/intake/receipts/:id/reviews", async (req, res) =>
    send(
      res,
      await services.intake.review(
        req.actor,
        params.parse(req.params).id,
        reviewInput.parse(req.body),
        key(req),
      ),
    ),
  );
  router.post("/intake/receipts/:id/confirmation", async (req, res) => {
    confirmationInput.parse(req.body);
    send(
      res,
      await services.intake.confirm(
        req.actor,
        params.parse(req.params).id,
        key(req),
      ),
    );
  });
  router.get("/lots", async (req, res) =>
    res.json({
      items: await services.intake.lots(
        req.actor,
        centerPageInput.parse(req.query),
      ),
      limit: 100,
    }),
  );
  router.post("/lots", async (req, res) =>
    send(
      res,
      await services.intake.consolidate(
        req.actor,
        lotInput.parse(req.body),
        key(req),
      ),
    ),
  );
  return router;
}
