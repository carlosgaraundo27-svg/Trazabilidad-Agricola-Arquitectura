import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { appendFile } from "node:fs/promises";

if (
  process.env.GITHUB_ACTIONS !== "true" ||
  process.env.RUNNER_ENVIRONMENT !== "github-hosted" ||
  !process.env.GITHUB_ENV
)
  throw new Error(
    "Solo prepara PostgreSQL Jest en un runner GitHub independiente",
  );
const password = randomBytes(32).toString("hex");
// GitHub oculta el valor antes de que las siguientes etapas impriman su entorno.
console.log("::add-mask::" + password);
execFileSync(
  "/usr/bin/docker",
  [
    "run",
    "--detach",
    "--name",
    "sprint02-jest-pg",
    "--publish",
    "127.0.0.1:55442:5432",
    "--env",
    "POSTGRES_PASSWORD",
    "--env",
    "POSTGRES_USER=test",
    "--env",
    "POSTGRES_DB=jest_business",
    "postgres:18",
  ],
  {
    env: { ...process.env, POSTGRES_PASSWORD: password, PATH: "/usr/bin:/bin" },
    stdio: "ignore",
  },
);
let ready = false;
for (let attempt = 0; attempt < 30 && !ready; attempt++) {
  try {
    execFileSync(
      "/usr/bin/docker",
      [
        "exec",
        "sprint02-jest-pg",
        "pg_isready",
        "-U",
        "test",
        "-d",
        "jest_business",
      ],
      { stdio: "ignore", env: { ...process.env, PATH: "/usr/bin:/bin" } },
    );
    ready = true;
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}
if (!ready) throw new Error("PostgreSQL Jest no quedó disponible");
execFileSync(
  "/usr/bin/docker",
  [
    "exec",
    "sprint02-jest-pg",
    "psql",
    "-U",
    "test",
    "-d",
    "jest_business",
    "-c",
    "CREATE DATABASE jest_http;",
  ],
  { stdio: "ignore", env: { ...process.env, PATH: "/usr/bin:/bin" } },
);
const url = new URL("postgres://test@127.0.0.1:55442/jest_business");
url.password = password;
await appendFile(process.env.GITHUB_ENV, `JEST_DATABASE_URL=${url.href}\n`);
url.pathname = "/jest_http";
await appendFile(
  process.env.GITHUB_ENV,
  `JEST_HTTP_DATABASE_URL=${url.href}\n`,
);
