import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import os from "node:os";
import { sourceSha } from "./git.js";
import { labConfig } from "./lab-config.js";
import { evaluateLoad } from "./measurement-policy.js";

if (
  process.env.GITHUB_ACTIONS !== "true" ||
  process.env.RUNNER_ENVIRONMENT !== "github-hosted"
)
  throw new Error(
    "Este orquestador solo ejecuta en runner GitHub alojado, nunca en el host Android.",
  );
const config = labConfig(process.env);
const root = ".local/sprint02";
await mkdir(root, { recursive: true });
const compose = ["compose", "-f", "scripts/sprint02/compose.yaml"];
const report = {
  sourceSha: sourceSha(),
  startedAt: new Date().toISOString(),
  platform: {
    type: os.type(),
    release: os.release(),
    cpuModel: os.cpus()[0].model,
    cpuCount: os.cpus().length,
    totalMemoryBytes: os.totalmem(),
  },
  steps: [],
  phases: [],
  stages: [],
  status: "running",
};
const frames = [];
let app,
  monitor,
  sampling = false,
  previousCpu;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function command(executable, args, extraEnv = {}) {
  if (![process.execPath, "/usr/bin/docker"].includes(executable))
    throw new Error("Ejecutable ajeno al laboratorio");
  const start = Date.now();
  const child = spawn(executable, args, {
    env: { ...process.env, ...extraEnv, PATH: "/usr/bin:/bin" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "",
    stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  const code = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  report.steps.push({
    executable,
    args,
    code,
    milliseconds: Date.now() - start,
  });
  return { code, stdout, stderr };
}
async function requireCommand(executable, args, env) {
  const result = await command(executable, args, env);
  if (result.code !== 0)
    throw new Error(
      `${args.join(" ")}: exit ${result.code}; ${result.stderr.slice(-1800)}`,
    );
  return result.stdout.trim();
}
const node = (file, env) => requireCommand(process.execPath, [file], env);
async function cpuTotals() {
  const values = (await readFile("/proc/stat", "utf8"))
    .split("\n")[0]
    .trim()
    .split(/\s+/)
    .slice(1, 9)
    .map(Number);
  return {
    total: values.reduce((sum, value) => sum + value, 0),
    idle: values[3] + values[4],
  };
}
async function measuredNode(file, env) {
  const before = await cpuTotals(),
    started = Date.now();
  try {
    return await node(file, env);
  } finally {
    const after = await cpuTotals();
    report.phases.push({
      file,
      mode: env?.SPRINT02_CACHE_MODE ?? null,
      elapsedMilliseconds: Date.now() - started,
      hostCpuBusyPercent:
        100 * (1 - (after.idle - before.idle) / (after.total - before.total)),
      freeMemoryBytesAfter: os.freemem(),
      totalMemoryBytes: os.totalmem(),
      scope:
        "Promedio del host durante todo el subproceso, incluye arranque; no pico ni CPU individual del servidor/generador.",
    });
  }
}
async function sample() {
  if (sampling) return;
  sampling = true;
  try {
    const cpu = (await readFile("/proc/stat", "utf8"))
      .split("\n")[0]
      .trim()
      .split(/\s+/)
      .slice(1, 9)
      .map(Number);
    const total = cpu.reduce((sum, value) => sum + value, 0),
      idle = cpu[3] + cpu[4];
    const hostCpuPercent = previousCpu
      ? 100 * (1 - (idle - previousCpu.idle) / (total - previousCpu.total))
      : 0;
    previousCpu = { total, idle };
    const memory = await readFile("/proc/meminfo", "utf8");
    const availableMemoryBytes =
      Number(memory.match(/^MemAvailable:\s+(\d+)/m)[1]) * 1024;
    const stats = await command("/usr/bin/docker", [
      "stats",
      "--no-stream",
      "--format",
      "{{json .}}",
    ]);
    const containers = stats.stdout
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .filter((row) => row.Name.startsWith("sprint02-"))
      .map((row) => ({
        name: row.Name,
        cpuPercent: Number.parseFloat(row.CPUPerc),
        memoryPercent: Number.parseFloat(row.MemPerc),
        memoryUsage: row.MemUsage,
      }));
    let appRssKb = null;
    if (app?.pid) {
      const status = await readFile(`/proc/${app.pid}/status`, "utf8").catch(
        () => "",
      );
      appRssKb = Number(status.match(/^VmRSS:\s+(\d+)/m)?.[1] ?? 0);
    }
    frames.push({
      at: new Date().toISOString(),
      hostCpuPercent,
      availableMemoryBytes,
      totalMemoryBytes: os.totalmem(),
      appRssKb,
      containers,
    });
  } finally {
    sampling = false;
  }
}
try {
  await requireCommand("/usr/bin/docker", [
    ...compose,
    "up",
    "-d",
    "--wait",
    "db",
    "redis",
  ]);
  await requireCommand("/usr/bin/docker", ["pull", "grafana/k6:latest"]);
  const images = JSON.parse(
    await requireCommand("/usr/bin/docker", [
      "image",
      "inspect",
      "postgres:18",
      "redis:8-alpine",
      "grafana/k6:latest",
    ]),
  );
  report.images = images.map((entry) => ({
    id: entry.Id,
    repoDigests: entry.RepoDigests,
  }));
  report.node = process.version;
  report.k6 = await requireCommand("/usr/bin/docker", [
    "run",
    "--rm",
    "grafana/k6:latest",
    "version",
  ]);
  await node("scripts/sprint02/prepare-lab.js");
  await requireCommand("/usr/bin/docker", [
    ...compose,
    "exec",
    "-T",
    "db",
    "psql",
    "-U",
    "sprint02",
    "-d",
    "sprint02_lab",
    "-c",
    "ANALYZE;",
  ]);
  await measuredNode("scripts/sprint02/analyze-postgres.js");
  for (const mode of ["none", "cold", "warm"])
    await measuredNode("scripts/sprint02/compare-cache.js", {
      SPRINT02_CACHE_MODE: mode,
    });
  await requireCommand("/usr/bin/docker", [...compose, "stop", "redis"]);
  try {
    await measuredNode("scripts/sprint02/compare-cache.js", {
      SPRINT02_CACHE_MODE: "degraded",
    });
  } finally {
    await requireCommand("/usr/bin/docker", [...compose, "up", "-d", "redis"]);
  }
  let appLog = "";
  app = spawn(process.execPath, ["server/main.js"], {
    env: {
      ...process.env,
      DATABASE_URL: config.DATABASE_URL,
      REDIS_URL: config.redisUrl,
      HOST: "127.0.0.1",
      PORT: "3302",
      APP_ORIGIN: "http://127.0.0.1:3302",
      PUBLIC_BASE_URL: "http://127.0.0.1:3302",
      NODE_ENV: "test",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  app.stdout.on("data", (chunk) => {
    appLog += chunk;
  });
  app.stderr.on("data", (chunk) => {
    appLog += chunk;
  });
  let healthy = false;
  for (let attempt = 0; attempt < 30 && !healthy; attempt++) {
    healthy = await fetch("http://127.0.0.1:3302/health", {
      signal: AbortSignal.timeout(1000),
    })
      .then((r) => r.ok)
      .catch(() => false);
    if (!healthy) await wait(1000);
  }
  if (!healthy)
    throw new Error("App laboratorio no disponible: " + appLog.slice(-1000));
  await sample();
  monitor = setInterval(() => {
    sample().catch((error) => {
      report.monitorFailure = error.message;
    });
  }, 3000);
  await measuredNode("scripts/sprint02/sync50.js");
  const fixture = JSON.parse(
    await readFile(root + "/lab-fixture.json", "utf8"),
  );
  for (const stage of [
    "smoke",
    "10",
    "50",
    "100",
    "250",
    "500",
    "1000",
    "2000",
  ]) {
    if (stage !== "smoke") await wait(61000); // Ventana real del limitador, sin cambiar su configuración.
    const before = frames.length;
    const result = await command("/usr/bin/docker", [
      "run",
      "--rm",
      "--network",
      "host",
      "--name",
      "sprint02-k6",
      "--user",
      `${process.getuid()}:${process.getgid()}`,
      "-v",
      `${process.cwd()}:/work`,
      "-w",
      "/work",
      "-e",
      "SPRINT02_INDEPENDENT_HOST=true",
      "-e",
      "SPRINT02_BASE_URL=http://127.0.0.1:3302",
      "-e",
      `SPRINT02_SOURCE_SHA=${report.sourceSha}`,
      "-e",
      `SPRINT02_PUBLIC_ID=${fixture.publications[0].publicId}`,
      "-e",
      `SPRINT02_STAGE=${stage}`,
      "grafana/k6:latest",
      "run",
      "scripts/sprint02/qr-load.js",
    ]);
    await writeFile(`${root}/k6-${stage}.log`, result.stdout + result.stderr);
    const data = JSON.parse(await readFile(`${root}/k6-${stage}.json`, "utf8"));
    const assessment = evaluateLoad(
      data,
      frames.slice(before),
      os.cpus().length,
    );
    report.stages.push({
      stage,
      exitCode: result.code,
      assessment,
      resourceFrames: frames.length - before,
    });
    if (!assessment.canAdvance || result.code !== 0) {
      report.status = "completed_with_observed_limit";
      break;
    }
  }
  if (report.status === "running") report.status = "completed_all_stages";
} catch (error) {
  report.status = "failed";
  report.failure = {
    name: error.name,
    message: error.message.replaceAll(
      process.env.SPRINT02_DEMO_PASSWORD,
      "[lab-password]",
    ),
  };
  process.exitCode = 1;
} finally {
  if (monitor) clearInterval(monitor);
  while (sampling) await wait(50);
  if (app) {
    app.kill("SIGTERM");
    await new Promise((resolve) => {
      app.once("close", resolve);
      setTimeout(resolve, 5000);
    });
  }
  report.endedAt = new Date().toISOString();
  await writeFile(
    root + "/resources.json",
    JSON.stringify(
      { sourceSha: report.sourceSha, sampleIntervalSeconds: 3, frames },
      null,
      2,
    ) + "\n",
  );
  await writeFile(root + "/run.json", JSON.stringify(report, null, 2) + "\n");
  // Resultados sintéticos por fragmentos: también recuperables desde logs API, sin credenciales.
  for (const name of (await readdir(root)).filter((name) =>
    name.endsWith(".json"),
  )) {
    const raw = await readFile(`${root}/${name}`, "utf8");
    const parts = Math.ceil(raw.length / 10000);
    for (let index = 0; index < parts; index++)
      console.log(
        "SPRINT02_CHUNK " +
          JSON.stringify({
            name,
            index,
            parts,
            text: raw.slice(index * 10000, (index + 1) * 10000),
          }),
      );
  }
}
