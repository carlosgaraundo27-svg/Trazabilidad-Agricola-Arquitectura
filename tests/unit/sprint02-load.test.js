import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const source = readFileSync(
  new URL("../../scripts/sprint02/qr-load.js", import.meta.url),
  "utf8",
)
  .replace(/^import .* from "k6[^"]*";\r?\n/gm, "")
  .replace("export const options", "const options")
  .replace("export default function qrRequest", "function qrRequest")
  .replace("export function handleSummary", "function handleSummary");

function load(overrides = {}, response = { status: 429 }) {
  const metrics = {};
  class Metric {
    constructor(name) {
      this.name = name;
      metrics[name] = [];
    }
    add(value) {
      metrics[this.name].push(value);
    }
  }
  const context = {
    __ENV: {
      SPRINT02_INDEPENDENT_HOST: "true",
      SPRINT02_BASE_URL: "http://127.0.0.1:3302",
      SPRINT02_SOURCE_SHA: "a".repeat(40),
      SPRINT02_PUBLIC_ID: "11111111-1111-4111-8111-111111111111",
      ...overrides,
    },
    Rate: Metric,
    Trend: Metric,
    http: { get: () => response },
    check: () => {},
    sleep: () => {},
    __VU: 1,
    __ITER: 0,
  };
  const result = runInNewContext(source + "\n({options,qrRequest});", context, {
    timeout: 1000,
  });
  return { ...result, metrics };
}

test("k6 solo admite etapas definidas y host/puerto independientes, sin abrir red", () => {
  for (const SPRINT02_STAGE of ["invalid", "toString", "constructor"])
    assert.throws(() => load({ SPRINT02_STAGE }));
  assert.throws(() => load({ SPRINT02_INDEPENDENT_HOST: "false" }));
  assert.throws(() => load({ SPRINT02_BASE_URL: "https://127.0.0.1:3043" }));
});

test("capacidad es otro perfil: cinco segundos por origen y p99 visible, sin cambiar abuso", () => {
  const { options } = load({
    SPRINT02_TRAFFIC_PROFILE: "capacity",
    SPRINT02_STAGE: "100",
  });
  assert.equal(options.scenarios.qr.stages[1].duration, "60s");
  assert.ok(options.summaryTrendStats.includes("p(99)"));
  assert.throws(() => load({ SPRINT02_TRAFFIC_PROFILE: "bypass" }));
});

test("k6 define progresión a 2000 y meseta de 100 VU durante 10 minutos", () => {
  for (const [stage, target] of Object.entries({
    smoke: 1,
    10: 10,
    50: 50,
    100: 100,
    250: 250,
    500: 500,
    1000: 1000,
    2000: 2000,
  })) {
    const { options } = load({ SPRINT02_STAGE: stage });
    const stages = options.scenarios.qr.stages;
    assert.equal(stages[0].target, target);
    assert.equal(
      stages[1].duration,
      stage === "100" ? "10m" : ({ smoke: "10s" }[stage] ?? "2m"),
    );
    assert.equal(stages.at(-1).target, 0);
  }
});

test("k6 registra 429 separado y no lo incorpora a éxito ni latencia exitosa", () => {
  const { qrRequest, metrics } = load();
  qrRequest();
  assert.deepEqual(metrics.qr_429, [true]);
  assert.deepEqual(metrics.qr_correct, [false]);
  assert.deepEqual(metrics.qr_5xx, [false]);
  assert.deepEqual(metrics.qr_success_ms, []);
});

test("k6 valida DTO público y no convierte una propiedad privada en éxito", () => {
  const dto = {
    lotCode: "VV-DEMO-001",
    stages: [
      { stage: "harvest", date: "2026-01-02", description: "Ficticio" },
      { stage: "consolidation", date: "2026-01-03", description: "Ficticio" },
    ],
  };
  for (const privateField of [false, true]) {
    const response = {
      status: 200,
      timings: { duration: 3 },
      json: () => (privateField ? { ...dto, privateNote: "privado" } : dto),
    };
    const { qrRequest, metrics } = load({}, response);
    qrRequest();
    assert.deepEqual(metrics.qr_correct, [!privateField]);
    assert.deepEqual(metrics.qr_success_ms, privateField ? [] : [3]);
  }
});
