import test from "node:test";
import assert from "node:assert/strict";
import { labConfig, requireLab } from "../../scripts/sprint02/lab-config.js";

const env = {
  SPRINT02_INDEPENDENT_HOST: "true",
  SPRINT02_DATABASE_URL:
    "postgres://sprint02:fiction@127.0.0.1:55442/sprint02_lab",
  SPRINT02_REDIS_URL: "redis://127.0.0.1:56382",
};
test("Sprint 2 falla cerrado antes de abrir red si no se declara host independiente", () => {
  assert.throws(() =>
    labConfig({ ...env, SPRINT02_INDEPENDENT_HOST: "false" }),
  );
  assert.throws(() => labConfig({ DATABASE_URL: env.SPRINT02_DATABASE_URL }));
  assert.equal(labConfig(env).NODE_ENV, "test");
});
test("Sprint 2 rechaza puertos del ensayo, base ajena y URL no dedicada", () => {
  for (const url of [
    "postgres://sprint02:fiction@127.0.0.1:3043/sprint02_lab",
    "postgres://sprint02:fiction@127.0.0.1:5432/sprint02_lab",
    "postgres://sprint02:fiction@127.0.0.1:55442/trazabilidad",
    "postgres://sprint02:fiction@example.test:55442/sprint02_lab",
  ])
    assert.throws(() => labConfig({ ...env, SPRINT02_DATABASE_URL: url }));
  assert.throws(() =>
    labConfig({ ...env, SPRINT02_REDIS_URL: "redis://127.0.0.1:6379" }),
  );
});
test("Sprint 2 exige marcador y base coincidentes, no basta el nombre de URL", async () => {
  for (const rows of [
    [],
    [{ name: "other", label: "synthetic-sprint02-only" }],
    [{ name: "sprint02_lab", label: "other" }],
  ])
    await assert.rejects(requireLab({ query: async () => ({ rows }) }));
  await requireLab({
    query: async () => ({
      rows: [{ name: "sprint02_lab", label: "synthetic-sprint02-only" }],
    }),
  });
});
