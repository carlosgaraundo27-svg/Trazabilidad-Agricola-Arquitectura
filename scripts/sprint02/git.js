import { execFileSync } from "node:child_process";

// Ejecutables de rutas protegidas; no se busca Git en el PATH heredado.
export function gitRead(args) {
  const inherited = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key.toUpperCase() !== "PATH"),
  );
  if (process.platform === "win32")
    return execFileSync("C:\\Program Files\\Git\\cmd\\git.exe", args, {
      encoding: "utf8",
      env: {
        ...inherited,
        PATH: "C:\\Windows\\System32;C:\\Program Files\\Git\\cmd",
      },
    });
  return execFileSync("/usr/bin/git", args, {
    encoding: "utf8",
    env: { ...inherited, PATH: "/usr/bin:/bin" },
  });
}

export const sourceSha = () => gitRead(["rev-parse", "HEAD"]).trim();
