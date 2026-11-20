import { spawn } from "node:child_process";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { trustedDockerExecutable } from "./docker-executable.js";
if (process.env.ALLOW_DEMO_SEED !== "true")
  throw new Error("Solo usar en una demo ficticia preparada.");
const env = {
  ...process.env,
  E2E_EXTERNAL_SERVER: "true",
  E2E_BASE_URL: "http://localhost:" + (process.env.APP_PORT || "3000"),
  DATABASE_URL:
    "postgres://demo:" +
    encodeURIComponent(process.env.POSTGRES_PASSWORD) +
    "@127.0.0.1:" +
    (process.env.COMPOSE_TEST_DB_PORT || "55433") +
    "/trazabilidad",
};
delete env.DB_MODE;
const secrets = [env.POSTGRES_PASSWORD, env.DEMO_PASSWORD].filter(Boolean),
  phases = [];
function run(command, args, name) {
  return new Promise((resolve) => {
    let output = "";
    const child = spawn(command, args, {
      env: {
        ...env,
        PLAYWRIGHT_HTML_OUTPUT_DIR: ".local/compose-report-" + name,
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    child.stdout.on("data", (data) => {
      output += data;
    });
    child.stderr.on("data", (data) => {
      output += data;
    });
    child.on("error", (error) => {
      output += error.message;
    });
    child.on("close", (code) => {
      for (const secret of secrets)
        output = output.replaceAll(secret, "[REDACTED]");
      phases.push({ name, exitCode: code, output });
      console.log(output);
      resolve(code === 0);
    });
  });
}
async function ready() {
  const end = Date.now() + 60000;
  while (Date.now() < end) {
    try {
      if (
        (
          await fetch(env.E2E_BASE_URL + "/health", {
            signal: AbortSignal.timeout(2000),
          })
        ).ok
      )
        return;
    } catch {
      /* App is restarting; preserve DB and wait for health. */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("La aplicación no recuperó health tras reiniciar.");
}
let exitCode = 1;
try {
  const core = readdirSync("tests/e2e")
    .filter((f) => f.endsWith(".spec.js") && f !== "logistics.spec.js")
    .sort((a, b) => a.localeCompare(b))
    .map((f) => "tests/e2e/" + f);
  if (
    !(await run(
      process.execPath,
      ["node_modules/@playwright/test/cli.js", "test", ...core],
      "core",
    ))
  )
    throw new Error("Falló el recorrido existente en Compose.");
  // Isolate the new suite's login budget without changing production limits or deleting facts.
  if (
    !(await run(
      trustedDockerExecutable(),
      [
        "compose",
        "-f",
        "compose.yaml",
        "-f",
        "compose.test.yaml",
        "restart",
        "app",
      ],
      "restart-app",
    ))
  )
    throw new Error("No se pudo reiniciar app.");
  await ready();
  if (
    !(await run(
      process.execPath,
      [
        "node_modules/@playwright/test/cli.js",
        "test",
        "tests/e2e/logistics.spec.js",
      ],
      "logistics",
    ))
  )
    throw new Error("Falló Logística en Compose.");
  exitCode = 0;
} catch (error) {
  phases.push({ name: "failure", message: error.message });
  console.error(error.message);
} finally {
  mkdirSync(".local", { recursive: true });
  writeFileSync(
    ".local/compose-e2e-" + Date.now() + ".json",
    JSON.stringify(
      {
        finishedAt: new Date().toISOString(),
        url: env.E2E_BASE_URL,
        exitCode,
        phases,
      },
      null,
      2,
    ),
  );
  process.exitCode = exitCode;
}
