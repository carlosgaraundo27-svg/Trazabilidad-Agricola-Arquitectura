import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { AppError } from "./shared/errors.js";
import { captureId, syncInput } from "./modules/harvest/sync-domain.js";

export function harvestSyncRouter(services) {
  const router = Router();
  router.put(
    "/sync/pre-lots/:clientCaptureId",
    rateLimit({
      windowMs: 60_000,
      limit: 60,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      handler: (req, res, next) =>
        next(
          new AppError(
            429,
            "RATE_LIMITED",
            "Demasiadas capturas. Reintente después del plazo indicado.",
          ),
        ),
    }),
    async (req, res) => {
      const id = captureId.parse(req.params.clientCaptureId);
      const key = captureId.safeParse(req.get("Idempotency-Key"));
      if (!key.success || key.data !== id)
        throw new AppError(
          400,
          "INVALID_KEY",
          "Idempotency-Key debe coincidir con el UUID de captura.",
        );
      const result = await services.harvestSync.accept(
        req.actor,
        id,
        syncInput.parse(req.body),
      );
      res
        .status(result.replayed ? 200 : 201)
        .json({ ...result.item, replayed: result.replayed });
    },
  );
  return router;
}
