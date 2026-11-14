import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import path from "node:path";
import { AppError } from "./shared/errors.js";
import { producerInput, parcelInput } from "./modules/producers/domain.js";
import { preLotInput, requestKey } from "./modules/harvest/domain.js";
const loginInput = z
  .object({
    email: z
      .email()
      .max(254)
      .transform((v) => v.toLowerCase()),
    password: z.string().min(1).max(256),
  })
  .strict();
const pageInput = z
  .object({ offset: z.coerce.number().int().min(0).max(1000000).default(0) })
  .strict();
export function createApp({
  services,
  db,
  origin = "http://localhost:3000",
  production = false,
  log = console.log,
}) {
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    req.requestId = crypto.randomUUID();
    res.set("X-Request-Id", req.requestId);
    next();
  });
  app.use(helmet());
  app.use(express.json({ limit: "16kb" }));
  app.use(cookieParser());
  app.get("/health", async (req, res) => {
    try {
      await db.query("SELECT 1");
      res.json({ status: "ok" });
    } catch {
      res.status(503).json({ status: "unavailable" });
    }
  });
  const api = express.Router();
  api.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (
      !["GET", "HEAD"].includes(req.method) &&
      req.get("Origin") &&
      req.get("Origin") !== origin
    )
      return next(new AppError(403, "ORIGIN_REJECTED", "Origen no permitido."));
    next();
  });
  const cookieOptions = {
    httpOnly: true,
    sameSite: "strict",
    secure: production,
    path: "/api/v1",
  };
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (req, res, next) =>
      next(
        new AppError(
          429,
          "RATE_LIMITED",
          "Demasiados intentos. Intente más tarde.",
        ),
      ),
  });
  api.post("/auth/login", limiter, async (req, res) => {
    const input = loginInput.parse(req.body);
    const result = await services.access.login(input.email, input.password);
    res.cookie("session", result.token, {
      ...cookieOptions,
      maxAge: 8 * 3600000,
    });
    res.json({ user: result.user, csrfToken: result.csrfToken });
  });
  api.use(async (req, res, next) => {
    req.actor = await services.access.authenticate(req.cookies.session);
    next();
  });
  api.use((req, res, next) => {
    if (
      !["GET", "HEAD"].includes(req.method) &&
      req.get("X-CSRF-Token") !== req.actor.csrfToken
    )
      return next(
        new AppError(403, "CSRF_REJECTED", "Sesión de formulario no válida."),
      );
    next();
  });
  api.get("/auth/me", (req, res) => {
    const { csrfToken, ...user } = req.actor;
    res.json({ user, csrfToken });
  });
  api.post("/auth/logout", async (req, res) => {
    await services.access.logout(req.cookies.session);
    res.clearCookie("session", cookieOptions);
    res.status(204).end();
  });
  api.get("/producers", async (req, res) => {
    const { offset } = pageInput.parse(req.query);
    res.json({
      items: await services.producers.listProducers(req.actor, offset),
      limit: 100,
    });
  });
  api.post("/producers", async (req, res) =>
    res
      .status(201)
      .json(
        await services.producers.createProducer(
          req.actor,
          producerInput.parse(req.body),
        ),
      ),
  );
  api.get("/parcels", async (req, res) => {
    const { offset } = pageInput.parse(req.query);
    res.json({
      items: await services.producers.listParcels(req.actor, offset),
      limit: 100,
    });
  });
  api.post("/parcels", async (req, res) =>
    res
      .status(201)
      .json(
        await services.producers.createParcel(
          req.actor,
          parcelInput.parse(req.body),
        ),
      ),
  );
  api.get("/pre-lots", async (req, res) => {
    const { offset } = pageInput.parse(req.query);
    res.json({
      items: await services.harvest.list(req.actor, offset),
      limit: 100,
    });
  });
  api.post("/pre-lots", async (req, res) => {
    const keyResult = requestKey.safeParse(req.get("Idempotency-Key"));
    if (!keyResult.success)
      throw new AppError(
        400,
        "INVALID_KEY",
        "Idempotency-Key debe ser un UUID.",
      );
    const result = await services.harvest.create(
      req.actor,
      preLotInput.parse(req.body),
      keyResult.data,
    );
    res.status(result.replayed ? 200 : 201).json(result.item);
  });
  app.use("/api/v1", api);
  app.use("/api", (req, res, next) =>
    next(new AppError(404, "NOT_FOUND", "Ruta no disponible.")),
  );
  app.use(express.static(path.resolve("dist")));
  app.get("/", (req, res) => res.sendFile(path.resolve("dist/index.html")));
  app.use((req, res, next) =>
    next(new AppError(404, "NOT_FOUND", "Ruta no disponible.")),
  );
  app.use((error, req, res, next) => {
    const validation = error instanceof z.ZodError;
    const status = validation
      ? 422
      : error instanceof AppError
        ? error.status
        : error.type === "entity.parse.failed"
          ? 400
          : error.type === "entity.too.large"
            ? 413
            : 500;
    const code = validation
      ? "VALIDATION_ERROR"
      : error instanceof AppError
        ? error.code
        : status === 400
          ? "INVALID_JSON"
          : status === 413
            ? "PAYLOAD_TOO_LARGE"
            : "INTERNAL_ERROR";
    log(
      JSON.stringify({
        requestId: req.requestId,
        method: req.method,
        status,
        code,
      }),
    );
    res.status(status).json({
      error: {
        code,
        message: validation
          ? "Revise los campos, formatos y límites."
          : error instanceof AppError
            ? error.message
            : "No se pudo completar la solicitud.",
        requestId: req.requestId,
      },
    });
  });
  return app;
}
