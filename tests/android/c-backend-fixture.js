// Loopback-only fake environment for native C acceptance; never a production route.
import { readFile, writeFile, mkdir, lstat, realpath } from "node:fs/promises";
import path from "node:path";
import { randomBytes, X509Certificate } from "node:crypto";
import { createServer } from "node:https";
import { createServer as probeServer } from "node:net";
import express from "express";
import { connectDatabase } from "../../server/db.js";
import { migrate } from "../../scripts/migrate.js";
import { hashPassword } from "../../server/modules/access/password.js";
import { compose } from "../../server/composition.js";
import { createApp } from "../../server/http.js";

if (process.env.NODE_ENV === "production")
  throw Error("Solo desarrollo aislado");
const root = path.resolve(".local/android-c-fixture"),
  dbPath = path.join(root, "android_c_dev_20261120");
for (const location of [path.resolve(".local"), root, dbPath]) {
  try {
    if (
      (await lstat(location)).isSymbolicLink() ||
      (await realpath(location)).toLowerCase() !== location.toLowerCase()
    )
      throw Error("No enlaces");
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
}
await new Promise((resolve, reject) => {
  const p = probeServer();
  p.once("error", reject);
  p.listen(3043, "127.0.0.1", () => p.close(resolve));
});
await mkdir(root, { recursive: true });
const certRoot = path.resolve(".local/android-b-fixture");
const cert = await readFile(path.join(certRoot, "localhost.pem"));
if (
  new X509Certificate(cert).publicKey.asymmetricKeyDetails.modulusLength < 2048
)
  throw Error("Certificado insuficiente");
let config;
try {
  config = JSON.parse(await readFile(path.join(root, "config.json"), "utf8"));
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  config = {
    API_ORIGIN: "https://127.0.0.1:3043",
    DEBUG_CA_BASE64: cert.toString("base64"),
    TEST_PASSWORD: randomBytes(24).toString("base64url"),
    FIXTURE_KEY: randomBytes(32).toString("hex"),
  };
  await writeFile(
    path.join(root, "config.json"),
    JSON.stringify(config, null, 2),
    { flag: "wx" },
  );
}
if (
  config.API_ORIGIN !== "https://127.0.0.1:3043" ||
  config.DEBUG_CA_BASE64 !== cert.toString("base64") ||
  typeof config.TEST_PASSWORD !== "string" ||
  config.TEST_PASSWORD.length < 12 ||
  !/^[a-f0-9]{64}$/.test(config.FIXTURE_KEY)
)
  throw Error("Config privada no válida");
const db = await connectDatabase({
  DB_MODE: "pglite",
  PGLITE_DATA_DIR: dbPath,
  NODE_ENV: "development",
});
await migrate(db);
const ids = {
  org: "c1000000-0000-4000-8000-000000000001",
  otherOrg: "c1000000-0000-4000-8000-000000000002",
  actor: "c2000000-0000-4000-8000-000000000001",
  other: "c2000000-0000-4000-8000-000000000002",
  colleague: "c2000000-0000-4000-8000-000000000003",
  producer: "c3000000-0000-4000-8000-000000000001",
  parcel: "c4000000-0000-4000-8000-000000000001",
};
const hash = await hashPassword(config.TEST_PASSWORD);
await db.transaction(async (tx) => {
  for (const org of [ids.org, ids.otherOrg])
    await tx.query(
      "INSERT INTO access.organizations VALUES($1,$2) ON CONFLICT DO NOTHING",
      [org, "Organización ficticia C"],
    );
  for (const [actor, org, email] of [
    [ids.actor, ids.org, "campo-c@example.test"],
    [ids.other, ids.otherOrg, "otro-c@example.test"],
    [ids.colleague, ids.org, "socio-c@example.test"],
  ])
    await tx.query(
      "INSERT INTO access.users(id,organization_id,email,password_hash,role) VALUES($1,$2,$3,$4,'collector') ON CONFLICT DO NOTHING",
      [actor, org, email, hash],
    );
  await tx.query(
    "INSERT INTO producers.producers(id,organization_id,name) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
    [ids.producer, ids.org, "Productor ficticio C"],
  );
  await tx.query(
    "INSERT INTO producers.parcels(id,organization_id,producer_id,name,latitude,longitude) VALUES($1,$2,$3,'Parcela ficticia C',-12,-76) ON CONFLICT DO NOTHING",
    [ids.parcel, ids.org, ids.producer],
  );
  await tx.query(
    "INSERT INTO access.parcel_assignments VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
    [ids.actor, ids.parcel, ids.org],
  );
  await tx.query(
    "INSERT INTO access.parcel_assignments VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
    [ids.colleague, ids.parcel, ids.org],
  );
});
await writeFile(
  path.join(root, "credenciales.txt"),
  "Usuario: campo-c@example.test\nOtro ámbito: otro-c@example.test\nContraseña privada: " +
    config.TEST_PASSWORD +
    "\n",
);
const services = compose(db),
  outer = express();
let dropId = null;
const attempts = new Map(),
  drops = new Set();
outer.put("/api/v1/sync/pre-lots/:id", (req, res, next) => {
  const requestId = req.params.id;
  attempts.set(requestId, (attempts.get(requestId) ?? 0) + 1);
  const original = res.json.bind(res);
  res.json = (body) => {
    if (requestId === dropId && [200, 201].includes(res.statusCode)) {
      drops.add(dropId);
      dropId = null;
      req.socket.destroy();
      return res; // service has committed before res.json
    }
    return original(body);
  };
  next();
});
outer.use("/__fixture", express.json({ limit: "4kb" }), (req, res, next) =>
  req.get("X-Fixture-Key") === config.FIXTURE_KEY
    ? next()
    : res.sendStatus(403),
);
outer.post("/__fixture/:action", async (req, res) => {
  switch (req.params.action) {
    case "drop":
      if (!/^[a-f0-9-]{36}$/.test(req.body.id)) return res.sendStatus(400);
      dropId = req.body.id;
      break;
    case "expire":
      await db.query(
        "UPDATE access.sessions SET expires_at=now()-interval '1 second' WHERE user_id=$1",
        [ids.actor],
      );
      break;
    case "revoke":
      await db.query("UPDATE access.users SET role='viewer' WHERE id=$1", [
        ids.actor,
      ]);
      break;
    case "restore":
      await db.query("UPDATE access.users SET role='collector' WHERE id=$1", [
        ids.actor,
      ]);
      await db.query(
        "INSERT INTO access.parcel_assignments VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
        [ids.actor, ids.parcel, ids.org],
      );
      break;
    case "unassign":
      await db.query("DELETE FROM access.parcel_assignments WHERE user_id=$1", [
        ids.actor,
      ]);
      break;
    default:
      return res.sendStatus(404);
  }
  res.sendStatus(204);
});
outer.get("/__fixture/counts/:id", async (req, res) => {
  const rows = (
    await db.query(
      "SELECT r.client_capture_id,h.id AS harvest,p.id AS prelot,(SELECT count(*)::int FROM access.audit a WHERE a.resource_id=p.id AND a.action='prelot:create') AS audits FROM harvest.sync_receipts r JOIN harvest.pre_lots p ON p.id=(r.result->>'preLotId')::uuid JOIN harvest.harvests h ON h.id=p.harvest_id WHERE r.organization_id=$1 AND r.client_capture_id=$2",
      [ids.org, req.params.id],
    )
  ).rows;
  res.json({
    rows,
    requests: attempts.get(req.params.id) ?? 0,
    dropped: drops.has(req.params.id),
  });
});
outer.use(
  createApp({
    db,
    services,
    origin: config.API_ORIGIN,
    production: true,
    log: () => {},
  }),
);
const server = createServer(
  {
    pfx: await readFile(path.join(certRoot, "localhost.pfx")),
    passphrase: await readFile(path.join(certRoot, "pfx-password.txt"), "utf8"),
    minVersion: "TLSv1.2",
  },
  outer,
);
server.listen(3043, "127.0.0.1", () =>
  console.log("C aislado HTTPS3043, datos ficticios001–008 listo"),
);
let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    if (stopping) return;
    stopping = true;
    server.close(async () => {
      await db.close();
      process.exit(0);
    });
  });
