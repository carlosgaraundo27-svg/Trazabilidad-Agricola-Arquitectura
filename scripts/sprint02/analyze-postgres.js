import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { connectDatabase } from "../../server/db.js";
import { publicationRepository } from "../../server/modules/publication/repository.js";
import { reportsRepository } from "../../server/modules/reports/repository.js";
import { ids } from "../seed.js";
import { intakeIds } from "../seed-intake.js";
import { labConfig, requireLab } from "./lab-config.js";

const config = labConfig(process.env);
const fixture = JSON.parse(
  await readFile(".local/sprint02/lab-fixture.json", "utf8"),
);
const queries = [];
// Captura SQL de los repositorios reales; no mantiene una copia de sus consultas.
const capture = {
  query: async (text, values) => {
    queries.push({ text, values });
    return { rows: [] };
  },
};
const publication = publicationRepository();
await publication.publicGate(capture, fixture.publications[0].publicId);
await publication.snapshot(capture, fixture.publications[0].publicId, 1);
await reportsRepository().shipments(
  capture,
  { organizationId: ids.org },
  {
    centerId: intakeIds.center,
    from: "2026-01-01T00:00:00Z",
    to: "2026-02-01T00:00:00Z",
    limit: 25,
  },
);
const db = await connectDatabase(config);
try {
  await requireLab(db);
  const metadata = (
    await db.query(
      "SELECT version(), current_setting('max_connections') AS max_connections",
    )
  ).rows;
  const indexes = (
    await db.query(
      "SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE schemaname IN ('publication','logistics','inventory') ORDER BY indexname",
    )
  ).rows;
  const cardinality = (
    await db.query(
      "SELECT (SELECT count(*) FROM publication.lots)::int AS publications, (SELECT count(*) FROM logistics.shipments)::int AS shipments, (SELECT count(*) FROM inventory.movements)::int AS movements",
    )
  ).rows;
  const connections = (
    await db.query(
      "SELECT state,wait_event_type,wait_event,count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database() GROUP BY state,wait_event_type,wait_event",
    )
  ).rows;
  const plans = await db.transaction(async (tx) => {
    // FOR SHARE de publicGate necesita transacción escribible; solo se explican SELECT.
    await tx.query("SET LOCAL statement_timeout='5s'");
    await tx.query("SET LOCAL lock_timeout='1s'");
    const output = [];
    for (const { text, values } of queries) {
      const plan = await tx.query(
        "EXPLAIN (ANALYZE, BUFFERS, SETTINGS, FORMAT JSON) " + text,
        values,
      );
      output.push({ sql: text, parameters: values, plan: plan.rows });
    }
    return output;
  });
  const result = {
    sourceSha: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
    fixtureSha: fixture.sourceSha,
    measuredAt: new Date().toISOString(),
    metadata,
    indexes,
    cardinality,
    connections,
    plans,
    limitation:
      "Tres SELECT reales sobre ficción. Sin carga concurrente ni medición de capacidad/contención sostenida.",
  };
  await writeFile(
    ".local/sprint02/postgres-plans.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(
    "Planes y cardinalidades ficticias registrados; no hay optimización acreditada.",
  );
} finally {
  await db.close();
}
