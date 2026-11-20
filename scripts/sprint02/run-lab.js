import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir, readdir, statfs } from "node:fs/promises";
import os from "node:os";
import { randomBytes } from "node:crypto";
import { sourceSha } from "./git.js";
import { labConfig } from "./lab-config.js";
import { evaluateLoad } from "./measurement-policy.js";
import { redisCycle } from "./redis-cycle.js";

if (
  process.env.GITHUB_ACTIONS !== "true" ||
  process.env.RUNNER_ENVIRONMENT !== "github-hosted"
)
  throw new Error(
    "Este orquestador solo ejecuta en runner GitHub alojado, nunca en el host Android.",
  );
const database = new URL(process.env.SPRINT02_DATABASE_URL);
const ephemeralPassword = randomBytes(32).toString("hex");
database.password = ephemeralPassword;
process.env.SPRINT02_PG_PASSWORD = ephemeralPassword;
process.env.SPRINT02_DATABASE_URL = database.href;
process.env.SPRINT02_DEMO_PASSWORD = randomBytes(32).toString("hex");
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
  previousCpu,
  previousAppCpu;
let ticksPerSecond;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function command(executable, args, extraEnv = {}) {
  if (
    ![process.execPath, "/usr/bin/docker", "/usr/bin/getconf"].includes(
      executable,
    )
  )
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
    let appRssKb = null,
      appCpuPercent = null;
    if (app?.pid) {
      const status = await readFile(`/proc/${app.pid}/status`, "utf8").catch(
        () => "",
      );
      appRssKb = Number(status.match(/^VmRSS:\s+(\d+)/m)?.[1] ?? 0);
      const raw = await readFile(`/proc/${app.pid}/stat`, "utf8");
      const fields = raw
        .slice(raw.lastIndexOf(")") + 2)
        .trim()
        .split(/\s+/);
      const ticks = Number(fields[11]) + Number(fields[12]),
        now = Date.now();
      if (previousAppCpu)
        appCpuPercent =
          (100 * (ticks - previousAppCpu.ticks)) /
          ticksPerSecond /
          ((now - previousAppCpu.at) / 1000);
      previousAppCpu = { ticks, at: now };
    }
    const disk = await statfs(root);
    frames.push({
      at: new Date().toISOString(),
      hostCpuPercent,
      availableMemoryBytes,
      totalMemoryBytes: os.totalmem(),
      appRssKb,
      appCpuPercent,
      freeDiskBytes: disk.bavail * disk.bsize,
      totalDiskBytes: disk.blocks * disk.bsize,
      containers,
    });
  } finally {
    sampling = false;
  }
}
try {
  ticksPerSecond = Number(
    await requireCommand("/usr/bin/getconf", ["CLK_TCK"]),
  );
  report.platform.clockTicksPerSecond = ticksPerSecond;
  report.platform.processLimits = await readFile("/proc/self/limits", "utf8");
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
  app = spawn(process.execPath, ["scripts/sprint02/observe-server.js"], {
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
    stdio: ["ignore", "pipe", "pipe", "ipc"],
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
  const snapshot = () =>
    new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const timer = setTimeout(() => {
        app.off("message", listener);
        reject(new Error("Sin observación de IPs"));
      }, 5000);
      const listener = (message) => {
        if (message.id === id) {
          clearTimeout(timer);
          app.off("message", listener);
          resolve(message.observation);
        }
      };
      app.on("message", listener);
      app.send({ id });
    });
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
  let cycle;
  try {
    cycle = await redisCycle({
      redisUrl: config.redisUrl,
      ...fixture.publications[0],
      stop: () =>
        requireCommand("/usr/bin/docker", [...compose, "stop", "redis"]),
      start: () =>
        requireCommand("/usr/bin/docker", [...compose, "up", "-d", "redis"]),
      appLog: () => appLog,
    });
  } catch (error) {
    await writeFile(
      `${root}/cache-recovery.json`,
      JSON.stringify(
        {
          sourceSha: report.sourceSha,
          ...(error.measurement ?? { passed: false, failure: error.message }),
        },
        null,
        2,
      ) + "\n",
    );
    throw error;
  }
  await writeFile(
    `${root}/cache-recovery.json`,
    JSON.stringify({ sourceSha: report.sourceSha, ...cycle }, null, 2) + "\n",
  );
  report.capacityStatus = "not_started";
  for (const profile of ["abuse", "capacity"]) {
    if (
      profile === "capacity" &&
      report.stages.at(-1)?.assessment.stopReason !== "rate_limit_429"
    ) {
      report.capacityStatus = "not_run_baseline_failure";
      break;
    }
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
      if (stage !== "smoke" && profile === "abuse") await wait(61000); // Ventana real; capacidad tiene <=12/min por origen.
      await snapshot(); // Delimita observación de la etapa sin reiniciar app ni limitador.
      if (report.monitorFailure) throw new Error(report.monitorFailure);
      await sample();
      const preflight = frames.at(-1);
      if (
        preflight.availableMemoryBytes < preflight.totalMemoryBytes * 0.2 ||
        preflight.freeDiskBytes < preflight.totalDiskBytes * 0.2
      )
        throw new Error(
          "Presupuesto de memoria/disco insuficiente antes de carga",
        );
      const before = frames.length;
      const targets = {
        smoke: 1,
        10: 10,
        50: 50,
        100: 100,
        250: 250,
        500: 500,
        1000: 1000,
        2000: 2000,
      };
      const n = targets[stage];
      const sourceIps =
        n === 1
          ? "127.16.0.1"
          : `127.16.0.1-127.16.${Math.floor(n / 256)}.${n % 256}`;
      const result = await command("/usr/bin/docker", [
        "run",
        "--rm",
        "--network",
        "host",
        "--name",
        "sprint02-k6",
        "--user",
        `${process.getuid()}:${process.getgid()}`,
        "--ulimit",
        "nofile=8192:8192",
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
        "-e",
        `SPRINT02_TRAFFIC_PROFILE=${profile}`,
        "-e",
        `SPRINT02_PUBLIC_IDS=${JSON.stringify(fixture.publications.map((p) => p.publicId))}`,
        "grafana/k6:latest",
        "run",
        ...(profile === "capacity" ? ["--local-ips", sourceIps] : []),
        "scripts/sprint02/qr-load.js",
      ]);
      const name = profile === "capacity" ? `capacity-${stage}` : stage;
      await writeFile(`${root}/k6-${name}.log`, result.stdout + result.stderr);
      const data = JSON.parse(
        await readFile(`${root}/k6-${name}.json`, "utf8"),
      );
      const observation = await snapshot();
      const assessment = evaluateLoad(
        data,
        frames.slice(before),
        os.cpus().length,
      );
      if (result.code !== 0 && assessment.stopReason === null) {
        assessment.canAdvance = false;
        assessment.stopReason = "k6_threshold_or_runtime_failure";
      }
      if (
        profile === "capacity" &&
        (!observation.oneKeyPerVU ||
          observation.distinctKeys !== n ||
          !observation.socketMatchesIp ||
          !observation.trustProxyFalse)
      ) {
        assessment.canAdvance = false;
        assessment.stopReason = "traffic_distribution_not_verified";
      }
      await writeFile(
        `${root}/traffic-${profile}-${stage}.json`,
        JSON.stringify({ sourceSha: report.sourceSha, observation }, null, 2) +
          "\n",
      );
      report.stages.push({
        profile,
        stage,
        sourceIps:
          profile === "capacity" ? sourceIps : "default-route-single-IP",
        exitCode: result.code,
        assessment,
        resourceFrames: frames.length - before,
      });
      if (!assessment.canAdvance || result.code !== 0) {
        report.status = "completed_with_observed_limit";
        if (profile === "capacity")
          report.capacityStatus = "stopped_with_observed_limit";
        break;
      }
      if (profile === "capacity" && stage === "2000")
        report.capacityStatus = "completed_short_screening_2000";
    }
  }
  if (report.status === "running") report.status = "completed_all_stages";
} catch (error) {
  report.status = "failed";
  report.failure = {
    name: error.name,
    message: error.message
      .replaceAll(process.env.SPRINT02_DEMO_PASSWORD, "[lab-password]")
      .replaceAll(ephemeralPassword, "[postgres-password]"),
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
