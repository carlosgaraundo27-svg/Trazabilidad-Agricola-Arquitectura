import { execFileSync } from "node:child_process";

// Ejecutables de rutas protegidas; no se busca Git en el PATH heredado.
export function gitRead(args) {
  const options = { encoding: "utf8" };
  if (process.platform === "win32")
    return execFileSync("C:/Program Files/Git/cmd/git.exe", args, options);
  return execFileSync("/usr/bin/git", args, options);
}

export const sourceSha = () => gitRead(["rev-parse", "HEAD"]).trim();
