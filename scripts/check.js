import { readdir, readFile, access } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import SwaggerParser from "@apidevtools/swagger-parser";
import { parse as parseYaml } from "yaml";
for (const module of ["access", "producers", "harvest"]) {
  for (const file of await readdir("server/modules/" + module)) {
    const filename = "server/modules/" + module + "/" + file;
    const code = await readFile(filename, "utf8");
    execFileSync(process.execPath, ["--check", filename], { stdio: "inherit" });
    if (
      file === "domain.js" &&
      /from ['"](?:express|pg|.*repository|.*http)/.test(code)
    )
      throw Error("Dominio depende de infraestructura: " + filename);
    for (const match of code.matchAll(/from ['"]([^'"]+)['"]/g)) {
      if (
        match[1].includes("/modules/") ||
        match[1].includes("../access/") ||
        match[1].includes("../producers/") ||
        match[1].includes("../harvest/")
      )
        throw Error("Import cruzado entre módulos: " + filename);
    }
  }
}
const api = JSON.parse(
  await readFile("docs/03-diseno-de-software/openapi.json", "utf8"),
);
await SwaggerParser.validate(api);
parseYaml(await readFile(".github/workflows/ci.yml", "utf8"));
parseYaml(await readFile("compose.yaml", "utf8"));
if (Object.keys(api.paths).length !== 7) throw Error("Contrato API incompleto");
async function walk(dir) {
  for (const file of await readdir(dir, { withFileTypes: true })) {
    const filename = path.join(dir, file.name);
    if (file.isDirectory()) {
      await walk(filename);
      continue;
    }
    if (!filename.endsWith(".md")) continue;
    const text = await readFile(filename, "utf8");
    for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const link = match[1].split("#")[0];
      if (!link || new RegExp("^(https?:|mailto:|app:|plugin:|/)").test(link))
        continue;
      await access(
        path.resolve(path.dirname(filename), decodeURIComponent(link)),
      );
    }
  }
}
await walk("docs");
await walk("tecnologia");
console.log(
  "Sintaxis de módulos, límites de imports, OpenAPI y enlaces locales: OK",
);
