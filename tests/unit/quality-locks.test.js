import { test } from "node:test";
import assert from "node:assert/strict";
import { qualityRepository } from "../../server/modules/intake/quality-repository.js";
test("repositorio Calidad distingue lectura, snapshot compartido y edición exclusiva", async () => {
  const calls = [];
  const tx = {
    query: async (sql, args) => {
      calls.push({ sql, args });
      return { rows: [{ id: "evaluation" }] };
    },
  };
  const actor = { organizationId: crypto.randomUUID() },
    id = crypto.randomUUID(),
    repository = qualityRepository();
  for (const mode of ["none", "share", "update"])
    await repository.get(tx, actor, id, mode);
  assert.equal(/FOR (SHARE|UPDATE)/.test(calls[0].sql), false);
  assert.match(calls[1].sql, /FOR SHARE OF e$/);
  assert.match(calls[2].sql, /FOR UPDATE OF e$/);
  for (const call of calls)
    assert.deepEqual(call.args, [actor.organizationId, id]);
});
