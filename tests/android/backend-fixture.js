import { readFile, writeFile, lstat, realpath } from "node:fs/promises";
import { randomBytes, X509Certificate } from "node:crypto";
import { createServer } from "node:https";
import { createServer as createProbe } from "node:net";
import express from "express";
import path from "node:path";
import { connectDatabase } from "../../server/db.js";
import { migrate } from "../../scripts/migrate.js";
import { seed } from "../../scripts/seed.js";
import { compose } from "../../server/composition.js";
import { createApp } from "../../server/http.js";
const root = path.resolve(".local/android-b-fixture");
const dbPath = path.join(root, "android_b_dev_20261119");
if (process.env.NODE_ENV === "production")
  throw new Error("Fixture solo para desarrollo aislado");
async function verifyLocation(location) {
  try {
    const [metadata, canonical] = await Promise.all([
      lstat(location),
      realpath(location),
    ]);
    if (
      metadata.isSymbolicLink() ||
      canonical.toLowerCase() !== location.toLowerCase()
    )
      throw new Error("Fixture no admite enlaces o redirecciones");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
await Promise.all([path.resolve(".local"), root, dbPath].map(verifyLocation));
if (
  !dbPath.startsWith(path.resolve(".local") + path.sep) ||
  /demo|inventory_demo/.test(dbPath)
)
  throw new Error("DB no aislada");
await new Promise((resolve, reject) => {
  const probe = createProbe();
  probe.once("error", reject);
  probe.listen(3042, "127.0.0.1", () => probe.close(resolve));
});
const cert = await readFile(path.join(root, "localhost.pem"));
const x509 = new X509Certificate(cert);
if (x509.publicKey.asymmetricKeyDetails.modulusLength < 2048)
  throw new Error("Certificado de fixture insuficiente; conservar y corregir");
let config;
try {
  config = JSON.parse(await readFile(path.join(root, "config.json"), "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  config = {
    API_ORIGIN: "https://127.0.0.1:3042",
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
  config.API_ORIGIN !== "https://127.0.0.1:3042" ||
  config.DEBUG_CA_BASE64 !== cert.toString("base64") ||
  typeof config.TEST_PASSWORD !== "string" ||
  config.TEST_PASSWORD.length < 12 ||
  !/^[a-f0-9]{64}$/.test(config.FIXTURE_KEY)
)
  throw new Error("Configuracion privada del fixture no valida");
const db = await connectDatabase({
  DB_MODE: "pglite",
  PGLITE_DATA_DIR: dbPath,
  NODE_ENV: "development",
});
await migrate(db);
await seed(db, config.TEST_PASSWORD);
const services = compose(db);
const app = createApp({
  db,
  services,
  origin: config.API_ORIGIN,
  production: true,
  log: () => {},
});
let dropLogout = false;
let delayMe = false;
const outer = express();
outer.post("/api/v1/auth/logout", (req, res, next) => {
  if (dropLogout) {
    dropLogout = false;
    req.socket.destroy();
    return;
  }
  next();
});
outer.get("/api/v1/auth/me", (req, res, next) => {
  if (delayMe) {
    delayMe = false;
    setTimeout(next, 1500);
    return;
  }
  next();
});
// Fixture control is reachable only through loopback/ADB reverse; its private
// key is supplied solely to integration tests, never to production transport.
outer.post("/__fixture/expire", async (req, res) => {
  if (req.get("X-Fixture-Key") !== config.FIXTURE_KEY)
    return res.sendStatus(403);
  await db.query(
    "UPDATE access.sessions SET expires_at=now()-interval '1 second'",
  );
  res.sendStatus(204);
});
outer.post("/__fixture/drop-next-logout", (req, res) => {
  if (req.get("X-Fixture-Key") !== config.FIXTURE_KEY)
    return res.sendStatus(403);
  dropLogout = true;
  res.sendStatus(204);
});
outer.post("/__fixture/delay-next-me", (req, res) => {
  if (req.get("X-Fixture-Key") !== config.FIXTURE_KEY)
    return res.sendStatus(403);
  delayMe = true;
  res.sendStatus(204);
});
outer.use(app);
const server = createServer(
  {
    pfx: await readFile(path.join(root, "localhost.pfx")),
    passphrase: await readFile(path.join(root, "pfx-password.txt"), "utf8"),
    minVersion: "TLSv1.2",
  },
  outer,
);
server.listen(3042, "127.0.0.1", () =>
  console.log(
    "android_b_dev_20261119 HTTPS listo en loopback:3042; migraciones001–008 y usuarios ficticios.",
  ),
);
server.once("error", async (error) => {
  console.error(error.code);
  await db.close();
  process.exitCode = 1;
});
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
