import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadFixtureConfig } from "../android/fixture-config.js";

test("fixture config: crear una sola vez y reutilizar exactamente sin reemplazar secretos", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "android-fixture-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const cert = Buffer.from("fake certificate fixture only");
  const first = await loadFixtureConfig(root, "https://127.0.0.1:3043", cert);
  assert.equal(first.API_ORIGIN, "https://127.0.0.1:3043");
  assert.equal(first.DEBUG_CA_BASE64, cert.toString("base64"));
  assert.ok(first.TEST_PASSWORD.length >= 12);
  assert.match(first.FIXTURE_KEY, /^[a-f0-9]{64}$/);
  const before = await readFile(path.join(root, "config.json"));
  assert.deepEqual(
    await loadFixtureConfig(root, first.API_ORIGIN, cert),
    first,
  );
  assert.deepEqual(await readFile(path.join(root, "config.json")), before);
  await assert.rejects(() =>
    loadFixtureConfig(root, "https://127.0.0.1:3042", cert),
  );
  await assert.rejects(() =>
    loadFixtureConfig(root, first.API_ORIGIN, Buffer.from("other certificate")),
  );
  assert.deepEqual(await readFile(path.join(root, "config.json")), before);
});

test("fixture config: corrupto o inválido falla sin reset ni reemplazo", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "android-fixture-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const target = path.join(root, "config.json"),
    cert = Buffer.from("fixture only");
  await writeFile(target, "{broken");
  await assert.rejects(() =>
    loadFixtureConfig(root, "https://127.0.0.1:3043", cert),
  );
  assert.equal(await readFile(target, "utf8"), "{broken");
  await writeFile(
    target,
    JSON.stringify({
      API_ORIGIN: "https://127.0.0.1:3043",
      DEBUG_CA_BASE64: cert.toString("base64"),
      TEST_PASSWORD: "short",
      FIXTURE_KEY: "wrong",
    }),
  );
  const before = await readFile(target);
  await assert.rejects(() =>
    loadFixtureConfig(root, "https://127.0.0.1:3043", cert),
  );
  assert.deepEqual(await readFile(target), before);
});
