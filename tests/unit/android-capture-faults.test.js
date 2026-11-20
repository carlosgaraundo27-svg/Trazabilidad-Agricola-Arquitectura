import { test } from "node:test";
import assert from "node:assert/strict";
import { captureFaults } from "../android/capture-faults.js";

function invoke(faults, id) {
  const req = { params: { id }, body: { quantity: "37.125" } };
  let forwarded = false,
    status = 200,
    reply;
  const res = {
    status(code) {
      status = code;
      return this;
    },
    json(body) {
      reply = body;
      return this;
    },
    get statusCode() {
      return status;
    },
    destroyed: false,
  };
  faults.middleware(req, res, () => {
    forwarded = true;
  });
  return {
    res,
    get forwarded() {
      return forwarded;
    },
    get status() {
      return status;
    },
    get reply() {
      return reply;
    },
  };
}
test("fixture de seis503 conserva misma identidad/hash y luego deja pasar", () => {
  const f = captureFaults(),
    id = crypto.randomUUID();
  f.arm(id, "fail-six");
  for (let i = 0; i < 6; i++) {
    const call = invoke(f, id);
    assert.equal(call.status, 503);
    assert.equal(call.forwarded, false);
  }
  assert.equal(invoke(f, id).forwarded, true);
  const state = f.snapshot(id);
  assert.equal(state.requests.length, 7);
  assert.equal(new Set(state.requests.map((r) => r.hash)).size, 1);
  assert.throws(() => f.arm("wrong", "fail-six"));
  assert.throws(() => f.arm(id, "unknown"));
});
test("barrera de respuesta solo después de json del servicio; replay no se retiene", () => {
  const f = captureFaults(),
    id = crypto.randomUUID();
  f.arm(id, "hold-response");
  const first = invoke(f, id);
  assert.equal(first.forwarded, true);
  assert.equal(f.snapshot(id).held, false);
  first.res.status(201).json({ accepted: true });
  assert.equal(f.snapshot(id).held, true);
  assert.equal(first.reply, undefined);
  const replay = invoke(f, id);
  replay.res.json({ accepted: true });
  assert.deepEqual(replay.reply, { accepted: true });
  f.release(id);
  assert.deepEqual(first.reply, { accepted: true });
  assert.equal(f.snapshot(id).held, false);
});
