import { mkdir, writeFile } from "node:fs/promises";
import { sourceSha } from "./git.js";
import { connectDatabase } from "../../server/db.js";
import { compose } from "../../server/composition.js";
import { migrate } from "../migrate.js";
import { seed } from "../seed.js";
import { publicationLot, demoProjection } from "../publication-fixture.js";
import { reportsFixture } from "../reports-fixture.js";
import { labConfig } from "./lab-config.js";

const config = labConfig(process.env);
const password = process.env.SPRINT02_DEMO_PASSWORD;
const count = Number(process.env.SPRINT02_LOTS || "10");
if (!password || !Number.isInteger(count) || count < 1 || count > 1000)
  throw new Error(
    "Configure contraseña ficticia y SPRINT02_LOTS entero 1..1000.",
  );
const db = await connectDatabase(config);
try {
  const tables = await db.query(
    "SELECT count(*)::int AS n FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')",
  );
  if (tables.rows[0].n !== 0)
    throw new Error(
      "La preparación exige una base nueva vacía; no borra ni resembra.",
    );
  await migrate(db);
  await seed(db, password);
  const services = compose(db, { baseUrl: "http://127.0.0.1:3302" });
  const actor = await services.access.authenticate(
    (await services.access.login("publicacion@example.test", password)).token,
  );
  const publications = [];
  for (let i = 0; i < count; i++) {
    const lot = await publicationLot(services, password);
    const published = await services.publication.publish(
      actor,
      lot.id,
      { ...demoProjection, expectedVersion: 0 },
      crypto.randomUUID(),
    );
    publications.push({
      lotId: lot.id,
      publicId: published.item.publicId,
      version: published.item.version,
    });
  }
  process.env.TEST_ALLOW_DB_WRITE = "true";
  await reportsFixture(db, password);
  await db.query(
    "CREATE TABLE public.sprint02_lab_marker(label text NOT NULL)",
  );
  await db.query("INSERT INTO public.sprint02_lab_marker VALUES($1)", [
    "synthetic-sprint02-only",
  ]);
  await mkdir(".local/sprint02", { recursive: true });
  await writeFile(
    ".local/sprint02/lab-fixture.json",
    JSON.stringify(
      {
        sourceSha: sourceSha(),
        createdAt: new Date().toISOString(),
        publications,
        reportFixtureShipments: 4,
        note: "Solo datos ficticios; no es un dataset productivo representativo.",
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "Laboratorio ficticio preparado; IDs públicos en .local/sprint02/lab-fixture.json",
  );
} finally {
  await db.close();
}
