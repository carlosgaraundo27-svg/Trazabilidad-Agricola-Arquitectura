import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluateLoad,
  captureAckMatches,
} from "../../scripts/sprint02/measurement-policy.js";
const summary = (limited = 0, errors = 0) => ({
  summary: {
    metrics: {
      http_reqs: { values: { count: 100, rate: 10 } },
      qr_429: { values: { passes: limited } },
      qr_5xx: { values: { passes: errors } },
      qr_correct: { values: { rate: limited || errors ? 0.5 : 1 } },
      qr_success_ms: { values: { "p(95)": 12 } },
    },
  },
});
const frames = [
  {
    hostCpuPercent: 10,
    availableMemoryBytes: 80,
    totalMemoryBytes: 100,
    containers: [{ name: "sprint02-k6", cpuPercent: 30, memoryPercent: 1 }],
  },
];
test("ACK compara contenido normalizado, tolera orden JSONB pero rechaza otro contenido", () => {
  const payload = {
    schemaVersion: 1,
    parcelId: "11111111-1111-4111-8111-111111111111",
    harvestedAt: "2026-01-02T12:00:00.000Z",
    quantity: "1.125",
    unit: "kg",
  };
  const record = { id: "fiction", payload };
  const reversed = Object.fromEntries(Object.entries(payload).reverse());
  assert.equal(
    captureAckMatches(record, {
      clientCaptureId: "fiction",
      payload: reversed,
    }),
    true,
  );
  assert.equal(
    captureAckMatches(record, {
      clientCaptureId: "fiction",
      payload: { ...reversed, quantity: "1.126" },
    }),
    false,
  );
  assert.equal(
    captureAckMatches(record, { clientCaptureId: "other", payload }),
    false,
  );
});
test("no aumenta carga si hay429, sin convertirlos en5xx", () => {
  assert.deepEqual(evaluateLoad(summary(50), frames, 2), {
    requests: 100,
    throughput: 10,
    p95CorrectMs: 12,
    limited429: 50,
    server5xx: 0,
    correctRate: 0.5,
    canAdvance: false,
    stopReason: "rate_limit_429",
  });
});
test("no aumenta carga sin medición o con recursos agotados", () => {
  assert.equal(evaluateLoad(summary(), [], 2).canAdvance, false);
  assert.equal(
    evaluateLoad(summary(), [{ ...frames[0], hostCpuPercent: 90 }], 2)
      .stopReason,
    "resource_limit",
  );
});
test("permite siguiente etapa solo con respuestas correctas y recursos disponibles", () => {
  assert.equal(evaluateLoad(summary(), frames, 2).canAdvance, true);
  assert.equal(evaluateLoad(summary(0, 1), frames, 2).stopReason, "server_5xx");
});
