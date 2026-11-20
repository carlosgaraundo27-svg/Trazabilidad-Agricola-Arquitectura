import { readFile, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import path from "node:path";

// B and C share the same private configuration contract, not their origin or DB.
// Creation is exclusive; malformed/existing files are never replaced on error.
export async function loadFixtureConfig(root, origin, cert) {
  const target = path.join(root, "config.json");
  let config;
  try {
    config = JSON.parse(await readFile(target, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    config = {
      API_ORIGIN: origin,
      DEBUG_CA_BASE64: cert.toString("base64"),
      TEST_PASSWORD: randomBytes(24).toString("base64url"),
      FIXTURE_KEY: randomBytes(32).toString("hex"),
    };
    await writeFile(target, JSON.stringify(config, null, 2), { flag: "wx" });
  }
  if (
    config.API_ORIGIN !== origin ||
    config.DEBUG_CA_BASE64 !== cert.toString("base64") ||
    typeof config.TEST_PASSWORD !== "string" ||
    config.TEST_PASSWORD.length < 12 ||
    !/^[a-f0-9]{64}$/.test(config.FIXTURE_KEY)
  )
    throw new Error("Configuración privada del fixture no válida");
  return config;
}
