import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// En otra máquina/runner exclusivamente. Una etapa por ejecución y revisión humana.
const stage = __ENV.SPRINT02_STAGE || "smoke";
const profile = __ENV.SPRINT02_TRAFFIC_PROFILE || "abuse";
if (!["abuse", "capacity"].includes(profile))
  throw new Error("Perfil inválido");
const levels = {
  smoke: 1,
  10: 10,
  50: 50,
  100: 100,
  250: 250,
  500: 500,
  1000: 1000,
  2000: 2000,
};
const target = levels[stage];
const base = __ENV.SPRINT02_BASE_URL || "";
const id = __ENV.SPRINT02_PUBLIC_ID || "";
if (
  __ENV.SPRINT02_INDEPENDENT_HOST !== "true" ||
  base !== "http://127.0.0.1:3302" ||
  !Object.hasOwn(levels, stage) ||
  !/^[a-f0-9]{40}$/.test(__ENV.SPRINT02_SOURCE_SHA || "") ||
  !/^[a-f0-9-]{36}$/.test(id)
)
  throw new Error(
    "Solo laboratorio independiente en 127.0.0.1:3302 con SHA e ID ficticio explícitos.",
  );

const serverErrors = new Rate("qr_5xx");
const limited = new Rate("qr_429");
const businessErrors = new Rate("qr_business_errors");
const correct = new Rate("qr_correct");
const successDuration = new Trend("qr_success_ms", true);
const holdDuration =
  profile === "capacity"
    ? stage === "smoke"
      ? "10s"
      : "60s"
    : ({ smoke: "10s", 100: "10m" }[stage] ?? "2m");
const ids =
  profile === "capacity" ? JSON.parse(__ENV.SPRINT02_PUBLIC_IDS || "[]") : [id];
if (ids.some((value) => !/^[a-f0-9-]{36}$/.test(value)))
  throw new Error("IDs inválidos");
export const options = {
  summaryTrendStats: ["avg", "min", "med", "max", "p(95)", "p(99)"],
  scenarios: {
    qr: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: stage === "smoke" ? "5s" : "30s", target },
        {
          duration: holdDuration,
          target,
        },
        { duration: profile === "capacity" ? "15s" : "30s", target: 0 },
        { duration: profile === "capacity" ? "5s" : "30s", target: 0 },
      ],
      gracefulRampDown: "5s",
    },
  },
  thresholds: {
    qr_5xx: [
      { threshold: "rate<0.01", abortOnFail: true, delayAbortEval: "10s" },
    ],
    qr_correct: ["rate==1"],
    qr_success_ms: ["p(95)<=2000"],
  },
};
export default function qrRequest() {
  const selectedId = ids.length ? ids[(__VU - 1 + __ITER) % ids.length] : id;
  const response = http.get(`${base}/api/public/v1/lots/${selectedId}`, {
    timeout: "5s",
    redirects: 0,
    headers: { "X-Sprint02-VU": String(__VU) },
  });
  serverErrors.add(response.status >= 500 && response.status <= 599);
  limited.add(response.status === 429);
  businessErrors.add(
    response.status >= 400 && response.status < 500 && response.status !== 429,
  );
  let valid = false;
  if (response.status === 200) {
    try {
      const dto = response.json();
      valid =
        Object.keys(dto).length === 2 &&
        dto.lotCode === "VV-DEMO-001" &&
        dto.stages.length === 2 &&
        dto.stages.every(
          (s) =>
            Object.keys(s).length === 3 &&
            ["date", "description", "stage"].every((key) =>
              Object.hasOwn(s, key),
            ),
        ) &&
        dto.stages[0].stage === "harvest" &&
        dto.stages[1].stage === "consolidation";
    } catch {}
  }
  correct.add(valid);
  check(response, { "200 con DTO ficticio permitido": () => valid });
  if (valid) successDuration.add(response.timings.duration);
  sleep(profile === "capacity" ? 5 : 1);
}
export function handleSummary(data) {
  return {
    [`./.local/sprint02/k6-${profile === "capacity" ? "capacity-" : ""}${stage}.json`]:
      JSON.stringify(
        {
          sourceSha: __ENV.SPRINT02_SOURCE_SHA,
          measuredAt: new Date().toISOString(),
          stage,
          target,
          profile,
          thinkTimeSeconds: profile === "capacity" ? 5 : 1,
          note: "Umbrales EQ propuestos, no requisitos de nota. 429 no cuenta como respuesta correcta.",
          summary: data,
        },
        null,
        2,
      ),
  };
}
