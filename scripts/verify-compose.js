import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

// Does not print Compose's resolved environment or remove volumes.
const secrets = [
  process.env.POSTGRES_PASSWORD,
  process.env.DEMO_PASSWORD,
].filter(Boolean);
const redact = (value) =>
  secrets.reduce(
    (text, secret) => text.replaceAll(secret, "[REDACTED]"),
    value,
  );
const restart = process.argv.includes("--restart");
const test = process.argv.includes("--test");
const result = {
  startedAt: new Date().toISOString(),
  mode: restart ? "restart" : "start",
  test,
  commands: [],
};
mkdirSync(".local", { recursive: true });
function docker(args) {
  if (test && args[0] === "compose")
    args.splice(1, 0, "-f", "compose.yaml", "-f", "compose.test.yaml");
  console.log("docker " + args.join(" "));
  const child = spawnSync("docker", args, {
    encoding: "utf8",
    windowsHide: true,
  });
  const output = redact((child.stdout || "") + (child.stderr || ""));
  result.commands.push({ args, exitCode: child.status, output });
  console.log(output);
  if (child.error || child.status !== 0)
    throw new Error(
      redact(child.error?.message || "Docker exited with code " + child.status),
    );
  return child.stdout.trim();
}
function preLots() {
  return JSON.parse(
    docker([
      "compose",
      "exec",
      "-T",
      "db",
      "psql",
      "-U",
      "demo",
      "-d",
      "trazabilidad",
      "-t",
      "-A",
      "-c",
      "SELECT COALESCE(json_agg(id ORDER BY id), '[]'::json) FROM harvest.pre_lots",
    ]),
  );
}
try {
  docker(["version"]);
  if (docker(["info", "--format", "{{.OSType}}"]) !== "linux")
    throw new Error("A Linux Docker engine is required");
  docker(["compose", "config", "--quiet"]);
  if (restart) {
    result.before = preLots();
    docker(["compose", "down"]);
  }
  docker([
    "compose",
    "up",
    ...(restart ? [] : ["--build"]),
    "-d",
    "--wait",
    "--wait-timeout",
    "180",
  ]);
  docker(["compose", "ps"]);
  docker([
    "compose",
    "exec",
    "-T",
    "db",
    "psql",
    "-U",
    "demo",
    "-d",
    "trazabilidad",
    "-c",
    "SELECT version FROM public.schema_migrations",
  ]);
  if (!restart)
    docker(["compose", "exec", "-T", "app", "node", "scripts/seed.js"]);
  result.after = preLots();
  if (restart && result.before.some((id) => !result.after.includes(id)))
    throw new Error("A previously stored pre-lot is missing");
  result.url = "http://localhost:" + (process.env.APP_PORT || "3000");
  const health = await fetch(result.url + "/health");
  result.health = await health.json();
  result.frontendStatus = (await fetch(result.url)).status;
  if (
    !health.ok ||
    result.health.status !== "ok" ||
    result.frontendStatus !== 200
  )
    throw new Error("HTTP verification failed");
  result.passed = true;
} catch (error) {
  result.passed = false;
  result.error = redact(error.message);
  process.exitCode = 1;
} finally {
  result.finishedAt = new Date().toISOString();
  const file = ".local/compose-" + result.mode + "-" + Date.now() + ".json";
  writeFileSync(file, JSON.stringify(result, null, 2));
  console.log(
    JSON.stringify({
      passed: result.passed,
      url: result.url,
      error: result.error,
      evidence: file,
    }),
  );
}
