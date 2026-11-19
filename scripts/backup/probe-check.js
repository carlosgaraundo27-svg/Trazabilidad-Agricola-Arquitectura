// Creates only a new scratch DB; never opens/migrates/seeds the demo database.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import pg from "pg";

const connection = new URL(process.env.BACKUP_PROBE_URL);
assert.equal(
  connection.pathname,
  "/postgres",
  "Use the admin catalog, not demo",
);
assert.ok(["127.0.0.1", "localhost"].includes(connection.hostname));
const expectedCluster = process.env.BACKUP_EXPECTED_SYSTEM_ID;
assert.match(expectedCluster ?? "", /^\d+$/);
const definitions = JSON.parse(
  await readFile(new URL("./temperature-check.json", import.meta.url), "utf8"),
);
const database = "backup_check_" + randomUUID().replaceAll("-", "");
const admin = new pg.Client({
  connectionString: connection.toString(),
  connectionTimeoutMillis: 5000,
});
await admin.connect();
let versions;
try {
  const identity = (
    await admin.query("SELECT system_identifier::text FROM pg_control_system()")
  ).rows[0].system_identifier;
  assert.equal(identity, expectedCluster);
  versions = (
    await admin.query(
      "SELECT version() AS postgres, current_setting('server_version_num') AS version_num",
    )
  ).rows[0];
  assert.match(versions.version_num, /^18\d{4}$/);
  await admin.query('CREATE DATABASE "' + database + '" TEMPLATE template0');
} finally {
  await admin.end();
}
connection.pathname = "/" + database;
const client = new pg.Client({ connectionString: connection.toString() });
await client.connect();
const cases = [
  ["0", true],
  ["-0", true],
  ["12.34", true],
  ["-12.34", true],
  ["999999.99", true],
  ["-999999.99", true],
  ["999999.98", true],
  ["1000000", false],
  ["-1000000", false],
  ["999999.991", false],
  ["-999999.991", false],
  ["0.001", false],
  ["0.000", false],
  ["12.340", false],
  ["999999.990", false],
  ["-999999.990", false],
  ["NaN", false],
  ["Infinity", false],
  ["-Infinity", false],
  [null, true],
];
const outcomes = [];
try {
  await client.query("BEGIN");
  for (const [label, definition] of Object.entries({
    original: definitions.original,
    restored: definitions.restored,
  })) {
    for (const notNull of [false, true]) {
      const table = label + (notNull ? "_not_null" : "_nullable");
      await client.query(
        `CREATE TABLE ${table}(value_c numeric ${notNull ? "NOT NULL" : ""} ${definition})`,
      );
      for (const [value, accepted] of cases) {
        await client.query("SAVEPOINT sample");
        let code = "accepted";
        try {
          await client.query(`INSERT INTO ${table} VALUES ($1::numeric)`, [
            value,
          ]);
        } catch (error) {
          code = error.code;
        } finally {
          await client.query("ROLLBACK TO SAVEPOINT sample");
        }
        const expected =
          value === null && notNull ? "23502" : accepted ? "accepted" : "23514";
        assert.equal(code, expected, `${table}: ${value}`);
        outcomes.push({ definition: label, notNull, value, code });
      }
    }
  }
  const truthTable = (
    await client.query(
      "SELECT bool_and(((a AND b) AND c) IS NOT DISTINCT FROM (a AND b AND c)) AS equivalent, count(*)::int AS cases FROM unnest(ARRAY[true,false,NULL::boolean]) a CROSS JOIN unnest(ARRAY[true,false,NULL::boolean]) b CROSS JOIN unnest(ARRAY[true,false,NULL::boolean]) c",
    )
  ).rows[0];
  assert.deepEqual(truthTable, { equivalent: true, cases: 27 });
  // A genuinely stricter upper bound rejects a formerly valid boundary.
  await client.query(
    `CREATE TABLE changed(value_c numeric ${definitions.restored.replace("<= 999999.99", "< 999999.99")})`,
  );
  await assert.rejects(client.query("INSERT INTO changed VALUES (999999.99)"), {
    code: "23514",
  });
  await client.query("ROLLBACK");
  const output = ".local/backup-check-" + database;
  await mkdir(output, { recursive: false });
  await writeFile(
    output + "/resultado.json",
    JSON.stringify(
      {
        status: "isolated_check_verified",
        database,
        versions,
        node: process.version,
        definitions,
        outcomes,
        truthTable,
        changedConstraintDetected: true,
        demoOpened: false,
        demoModified: false,
      },
      null,
      2,
    ),
    { flag: "wx" },
  );
  console.log(
    JSON.stringify({
      status: "isolated_check_verified",
      database,
      output,
      cases: outcomes.length,
      versions,
    }),
  );
} finally {
  await client.end();
}
