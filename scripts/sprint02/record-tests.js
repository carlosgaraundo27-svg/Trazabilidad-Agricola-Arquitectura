import { spawnSync } from "node:child_process";
import { gitRead, sourceSha } from "./git.js";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";

const sha = sourceSha();
const directory = `.local/sprint02/${sha}`;
await mkdir(directory, { recursive: true });
const env = { ...process.env, NODE_ENV: "test" };
for (const key of [
  "DATABASE_URL",
  "REDIS_URL",
  "DB_MODE",
  "PGLITE_DATA_DIR",
  "TEST_ALLOW_DB_WRITE",
])
  delete env[key];
const checks = [];
function run(name, args) {
  const start = Date.now();
  const result = spawnSync(process.execPath, args, {
    env,
    encoding: "utf8",
    timeout: 60000,
  });
  const output = (result.stdout || "") + (result.stderr || "");
  checks.push({
    name,
    command: ["node", ...args],
    exitCode: result.status,
    milliseconds: Date.now() - start,
  });
  return writeFile(`${directory}/${name}.log`, output).then(() => {
    console.log(`${name}: ${result.status === 0 ? "PASS" : "FAIL"}`);
    return output;
  });
}
await run("jest", [
  "--experimental-vm-modules",
  "node_modules/jest/bin/jest.js",
  "--runInBand",
  "--coverage",
  "--json",
  `--outputFile=${directory}/jest.json`,
]);
const unit = await run("node-test", [
  "--test",
  "--test-concurrency=1",
  "tests/unit/*.test.js",
]);
await run("check", ["scripts/check.js"]);
const prettierPaths = [
  "server",
  "web",
  "scripts",
  "tests",
  "*.js",
  "*.json",
  ".github/workflows/ci.yml",
  "compose*.yaml",
];
await run("format", [
  "node_modules/prettier/bin/prettier.cjs",
  "--check",
  ...prettierPaths,
]);
if (checks.at(-1).exitCode !== 0)
  await run("format-crlf-diagnostic", [
    "node_modules/prettier/bin/prettier.cjs",
    "--check",
    ...prettierPaths,
    "--end-of-line",
    "auto",
  ]);
const jest = JSON.parse(await readFile(`${directory}/jest.json`, "utf8"));
const coverage = JSON.parse(
  await readFile("coverage/jest/coverage-summary.json", "utf8"),
);
const files = Object.entries(coverage)
  .filter(([file]) => file !== "total")
  .map(([file, value]) => ({
    path: path.relative(process.cwd(), file).replaceAll("\\", "/"),
    ...value,
  }));
await access("coverage/jest/index.html");
const lcov = await readFile("coverage/jest/lcov.info", "utf8");
if (!/^DA:\d+,[1-9]\d*/m.test(lcov))
  throw new Error("LCOV no acredita líneas ejecutadas");
const tracked = gitRead([
  "ls-files",
  "server",
  "tests/jest",
  "tests/unit",
  "scripts/sprint02",
  "jest.config.js",
  "package.json",
  "package-lock.json",
  ".github/workflows/ci.yml",
])
  .trim()
  .split(/\r?\n/);
const changed = gitRead(["diff", "HEAD", "--", ...tracked]);
if (changed)
  throw new Error("Cambios sin commit invalidan el SHA de las pruebas");
const hashes = Object.fromEntries(
  await Promise.all(
    tracked.map(async (file) => [
      file,
      createHash("sha256")
        .update(await readFile(file))
        .digest("hex"),
    ]),
  ),
);
const report = {
  sourceSha: sha,
  measuredAt: new Date().toISOString(),
  node: process.version,
  platform: process.platform,
  isolation:
    "Procesos secuenciales; sin .env ni URLs de servicios; dobles de puertos y PGlite en memoria en node:test existente. Sin acceso a Android.",
  checks,
  jest: {
    suites: jest.numTotalTestSuites,
    passed: jest.numPassedTests,
    failed: jest.numFailedTests,
    pending: jest.numPendingTests,
  },
  nodeTest: {
    passed: Number(unit.match(/[#ℹ] pass (\d+)/)?.[1] ?? 0),
    failed: Number(unit.match(/[#ℹ] fail (\d+)/)?.[1] ?? 0),
  },
  coverage: {
    scope:
      "Todo server/**/*.js; web y Flutter no medidos por Jest; node:test no se agrega",
    totals: coverage.total,
    files,
  },
  artifacts: ["coverage/jest/index.html", "coverage/jest/lcov.info"],
  fileSha256: hashes,
  notRun: [
    "k6",
    "PostgreSQL real local",
    "Redis real local",
    "Playwright local",
    "Flutter local",
    "Android 24h",
    "corte de energía",
  ],
};
const destination = `docs/06-sprint02/evidence/${sha}`;
await mkdir(destination, { recursive: true });
await writeFile(
  `${destination}/verification.json`,
  JSON.stringify(report, null, 2) + "\n",
);
console.log(`Evidencia sanitizada: ${destination}/verification.json`);
if (checks.some((c) => c.exitCode !== 0)) process.exitCode = 1;
