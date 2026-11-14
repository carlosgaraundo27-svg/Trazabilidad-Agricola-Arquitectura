import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

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
const secrets = [env.POSTGRES_PASSWORD, env.DEMO_PASSWORD].filter(Boolean);
let output = "";
const child = spawn(
  process.execPath,
  ["node_modules/@playwright/test/cli.js", "test"],
  { env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
);
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
  mkdirSync(".local", { recursive: true });
  const result = {
    finishedAt: new Date().toISOString(),
    url: env.E2E_BASE_URL,
    exitCode: code,
    output,
  };
  writeFileSync(
    ".local/compose-e2e-" + Date.now() + ".json",
    JSON.stringify(result, null, 2),
  );
  console.log(output);
  process.exitCode = code === 0 ? 0 : 1;
});
