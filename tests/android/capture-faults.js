import { createHash } from "node:crypto";

// Only the keyed loopback fixture installs this middleware. No production path.
export function captureFaults() {
  const plans = new Map();
  const valid = (id) =>
    typeof id === "string" &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
      id,
    );
  return {
    arm(id, mode) {
      if (!valid(id) || !["fail-six", "hold-response"].includes(mode))
        throw new Error("Plan ficticio inválido");
      if (plans.has(id))
        throw new Error("Conservar plan/evidencia: no rearmar ID");
      plans.set(id, {
        remaining: mode === "fail-six" ? 6 : 0,
        holdOnce: mode === "hold-response",
        held: false,
        release: null,
        requests: [],
      });
    },
    snapshot(id) {
      const p = plans.get(id);
      return p
        ? { remaining: p.remaining, held: p.held, requests: [...p.requests] }
        : null;
    },
    release(id) {
      const p = plans.get(id);
      if (p?.release) {
        p.release();
        p.release = null;
        p.held = false;
      }
    },
    middleware(req, res, next) {
      const p = plans.get(req.params.id);
      if (!p) return next();
      p.requests.push({
        at: new Date().toISOString(),
        monotonicMs: performance.now(),
        hash: createHash("sha256")
          .update(JSON.stringify(req.body))
          .digest("hex"),
      });
      if (p.remaining > 0) {
        p.remaining--;
        return res.status(503).json({
          error: {
            code: "FIXTURE_UNAVAILABLE",
            message: "Fallo503 ficticio para aceptación D",
          },
        });
      }
      if (p.holdOnce) {
        const original = res.json.bind(res);
        res.json = (body) => {
          if (![200, 201].includes(res.statusCode)) return original(body);
          p.holdOnce = false;
          p.held = true;
          res.json = original;
          p.release = () => {
            if (!res.destroyed) original(body);
          };
          return res;
        };
      }
      next();
    },
  };
}
