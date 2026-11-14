import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

if (existsSync(".env")) {
  console.log(".env existente conservado; no se cambiaron credenciales.");
} else {
  const template = readFileSync(".env.example", "utf8");
  const env = template
    .replaceAll(
      "replaceWithLocalAlphanumericPassword",
      randomBytes(24).toString("hex"),
    )
    .replaceAll(
      "replaceWithDemoPasswordAtLeast12Chars",
      "LocalDemo" + randomBytes(18).toString("hex"),
    );
  writeFileSync(".env", env, { flag: "wx", mode: 0o600 });
  console.log(
    ".env local creado; credenciales omitidas. No versionar este archivo.",
  );
}
