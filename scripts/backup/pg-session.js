// Read-only PostgreSQL bridge for the Python fingerprint collector. No Docker/psql.
import assert from "node:assert/strict";
import { createInterface } from "node:readline";
import pg from "pg";

const url = new URL(process.env.BACKUP_VERIFICATION_URL);
assert.ok(["127.0.0.1", "localhost"].includes(url.hostname));
const sourceRead = process.env.BACKUP_SOURCE_READ_ONLY === "yes";
if (sourceRead) assert.equal(url.pathname, "/inventory_demo_20261118_151800");
else
  assert.match(url.pathname, /^\/recovery_restore_\d{8}_\d{6}_[a-f0-9]{10}$/);
const client = new pg.Client({
  connectionString: url.toString(),
  connectionTimeoutMillis: 5000,
  options: "-c default_transaction_read_only=on",
});
await client.connect();
try {
  const metadata = (
    await client.query(
      "SELECT system_identifier::text,version() AS postgres,current_setting('transaction_read_only') AS read_only,current_setting('server_encoding') AS encoding,(SELECT rolsuper FROM pg_roles WHERE rolname=current_user) AS full_visibility FROM pg_control_system()",
    )
  ).rows[0];
  assert.equal(
    metadata.system_identifier,
    process.env.BACKUP_EXPECTED_SYSTEM_ID,
  );
  assert.equal(metadata.read_only, "on");
  assert.equal(metadata.encoding, "UTF8");
  assert.equal(metadata.full_visibility, true);
  console.log(JSON.stringify({ ready: metadata }));
  for await (const line of createInterface({ input: process.stdin })) {
    try {
      const result = await client.query(JSON.parse(line));
      const results = Array.isArray(result) ? result : [result];
      const rows = results.flatMap((r) =>
        r.rows.map((row) => {
          const value = Object.values(row)[0];
          return typeof value === "object"
            ? JSON.stringify(value)
            : String(value);
        }),
      );
      console.log(JSON.stringify({ rows }));
    } catch (error) {
      console.log(JSON.stringify({ error: error.code ?? "QUERY_FAILED" }));
    }
  }
} finally {
  await client.end();
}
