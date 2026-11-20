// Instrumentación exclusiva del runner: importa el arranque productivo sin cambiar políticas.
import { ipKeyGenerator } from "express-rate-limit";
if (
  process.env.GITHUB_ACTIONS !== "true" ||
  process.env.RUNNER_ENVIRONMENT !== "github-hosted"
)
  throw new Error("Observador solo en runner independiente");
const { server } = await import("../../server/main.js");
let requests = [];
server.prependListener("request", (req, res) => {
  if (!req.url.startsWith("/api/public/v1/lots/")) return;
  res.once("finish", () => {
    requests.push({
      ip: req.ip,
      socketIp: req.socket.remoteAddress,
      key: ipKeyGenerator(req.ip),
      trustProxy: req.app.get("trust proxy"),
      vu: req.headers["x-sprint02-vu"] ?? null,
      status: res.statusCode,
      policy: res.getHeader("RateLimit-Policy") ?? null,
      retryAfter: res.getHeader("Retry-After") ?? null,
    });
  });
});
process.on("message", ({ id }) => {
  const keys = new Map(),
    vus = new Map(),
    statuses = {};
  let inconsistentIp = false;
  for (const r of requests) {
    keys.set(r.key, (keys.get(r.key) ?? 0) + 1);
    if (vus.has(r.vu) && vus.get(r.vu) !== r.key) inconsistentIp = true;
    vus.set(r.vu, r.key);
    statuses[r.status] = (statuses[r.status] ?? 0) + 1;
  }
  process.send({
    id,
    observation: {
      requests: requests.length,
      distinctKeys: keys.size,
      distinctVUs: vus.size,
      oneKeyPerVU: !inconsistentIp && keys.size === vus.size,
      trustProxyFalse: requests.every((r) => r.trustProxy === false),
      socketMatchesIp: requests.every((r) => r.ip === r.socketIp),
      statuses,
      keys: Object.fromEntries(keys),
      firstLimited: requests.find((r) => r.status === 429) ?? null,
    },
  });
  requests = [];
});
