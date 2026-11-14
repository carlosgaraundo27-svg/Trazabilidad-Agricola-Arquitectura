import { fork } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";

export async function startTestServer(env = process.env) {
  const port = env.E2E_PORT || "3001";
  const child = fork(
    new URL("../../scripts/e2e-server.js", import.meta.url),
    [],
    {
      cwd: fileURLToPath(new URL("../../", import.meta.url)),
      execArgv: ["--env-file-if-exists=.env"],
      env: {
        ...env,
        HOST: "127.0.0.1",
        PORT: port,
        APP_ORIGIN: "http://127.0.0.1:" + port,
      },
      silent: true,
      windowsHide: true,
    },
  );
  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);
  const exited = once(child, "exit");
  async function stop() {
    if (child.exitCode !== null || child.signalCode !== null) {
      if (child.exitCode !== 0)
        throw new Error("El servidor E2E terminó inesperadamente.");
      return;
    }
    let timer;
    try {
      child.send({ type: "stop" }, (error) => {
        if (error) child.kill("SIGKILL");
      });
      const [code, signal] = await Promise.race([
        exited,
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            child.kill("SIGKILL");
            reject(
              new Error("El servidor E2E no cerró por IPC en 5 segundos."),
            );
          }, 5000);
        }),
      ]);
      if (code !== 0)
        throw new Error("El servidor E2E terminó con " + (signal || code));
    } finally {
      clearTimeout(timer);
    }
  }
  try {
    const message = await Promise.race([
      once(child, "message", { signal: AbortSignal.timeout(15000) }).then(
        ([value]) => value,
      ),
      exited.then(([code]) => {
        throw new Error("El servidor E2E terminó antes de iniciar: " + code);
      }),
    ]);
    if (message.type !== "ready")
      throw new Error("Respuesta de inicio E2E inválida.");
    return { child, port: message.port, stop };
  } catch (error) {
    child.kill("SIGKILL");
    await exited;
    throw error;
  }
}

export default async function globalSetup() {
  if (process.env.E2E_EXTERNAL_SERVER === "true") return;
  const server = await startTestServer();
  return server.stop;
}
