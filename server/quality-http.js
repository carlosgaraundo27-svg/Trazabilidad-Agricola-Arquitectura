import { Router } from "express";
import {
  qualityUuid,
  qualityPageInput,
  createQualityInput,
  updateQualityInput,
  closeQualityInput,
} from "./modules/intake/quality-domain.js";
import { AppError } from "./shared/errors.js";
export function qualityRouter(services) {
  const router = Router();
  const key = (req) => {
    const parsed = qualityUuid.safeParse(req.get("Idempotency-Key"));
    if (!parsed.success)
      throw new AppError(
        400,
        "INVALID_KEY",
        "Idempotency-Key debe ser un UUID.",
      );
    return parsed.data;
  };
  router.post("/quality/evaluations/:id/closure", async (req, res) => {
    const r = await services.quality.close(
      req.actor,
      qualityUuid.parse(req.params.id),
      closeQualityInput.parse(req.body),
      key(req),
    );
    res.status(r.replayed ? 200 : 201).json(r.item);
  });
  router.get("/quality/lots", async (req, res) =>
    res.json({
      items: await services.quality.lots(
        req.actor,
        qualityPageInput.parse(req.query),
      ),
      limit: 100,
    }),
  );
  router.post("/quality/evaluations", async (req, res) => {
    const r = await services.quality.create(
      req.actor,
      createQualityInput.parse(req.body),
      key(req),
    );
    res.status(r.replayed ? 200 : 201).json(r.item);
  });
  router.get("/quality/evaluations/:id", async (req, res) =>
    res.json(
      await services.quality.get(req.actor, qualityUuid.parse(req.params.id)),
    ),
  );
  router.put("/quality/evaluations/:id", async (req, res) => {
    const r = await services.quality.update(
      req.actor,
      qualityUuid.parse(req.params.id),
      updateQualityInput.parse(req.body),
      key(req),
    );
    res.json(r.item);
  });
  return router;
}
