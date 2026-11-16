import { Router } from "express";
import QRCode from "qrcode";
import { rateLimit } from "express-rate-limit";
import { AppError, missing } from "./shared/errors.js";
import {
  uuid,
  publicId,
  pageInput,
  publishInput,
  withdrawInput,
} from "./modules/publication/domain.js";
export function publicationRouter(services) {
  const router = Router();
  const key = (req) => {
    const parsed = uuid.safeParse(req.get("Idempotency-Key"));
    if (!parsed.success)
      throw new AppError(
        400,
        "INVALID_KEY",
        "Idempotency-Key debe ser un UUID.",
      );
    return parsed.data;
  };
  router.get("/publications/lots", async (req, res) =>
    res.json({
      items: await services.publication.list(
        req.actor,
        pageInput.parse(req.query),
      ),
      limit: 100,
    }),
  );
  router.get("/publications/lots/:id", async (req, res) =>
    res.json(
      await services.publication.get(req.actor, uuid.parse(req.params.id)),
    ),
  );
  router.post("/publications/lots/:id", async (req, res) => {
    const r = await services.publication.publish(
      req.actor,
      uuid.parse(req.params.id),
      publishInput.parse(req.body),
      key(req),
    );
    res.status(r.replayed ? 200 : 201).json(r.item);
  });
  router.post("/publications/lots/:id/withdrawal", async (req, res) => {
    const r = await services.publication.withdraw(
      req.actor,
      uuid.parse(req.params.id),
      withdrawInput.parse(req.body),
      key(req),
    );
    res.status(r.replayed ? 200 : 201).json(r.item);
  });
  router.get("/publications/lots/:id/qr", async (req, res) => {
    const item = await services.publication.get(
      req.actor,
      uuid.parse(req.params.id),
    );
    if (item.state !== "published") throw missing();
    res
      .type("png")
      .send(
        await QRCode.toBuffer(item.url, {
          type: "png",
          errorCorrectionLevel: "M",
          margin: 4,
          width: 320,
        }),
      );
  });
  return router;
}
export function publicRouter(services) {
  const router = Router();
  router.get("/lots/:id", async (req, res) => {
    const id = publicId.safeParse(req.params.id);
    if (!id.success || Object.keys(req.query).length) throw missing();
    res.json(await services.publication.query(id.data));
  });
  return router;
}
export const publicLimiter = () =>
  rateLimit({
    windowMs: 60000,
    limit: 60,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (req, res, next) =>
      next(
        new AppError(
          429,
          "RATE_LIMITED",
          "Demasiadas consultas. Intente más tarde.",
        ),
      ),
  });
