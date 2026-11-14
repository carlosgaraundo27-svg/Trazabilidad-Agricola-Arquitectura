import { test } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";
import { once } from "node:events";
import { startTestServer } from "../e2e/global-setup.js";

test(
  "servidor E2E termina por IPC y libera el puerto sin taskkill",
  { timeout: 15000 },
  async (t) => {
    const server = await startTestServer({ ...process.env, E2E_PORT: "0" });
    t.after(server.stop);
    const response = await fetch("http://127.0.0.1:" + server.port + "/health");
    assert.equal(response.status, 200);
    await server.stop();
    assert.equal(server.child.exitCode, 0);
    const probe = net.createServer().listen(server.port, "127.0.0.1");
    await once(probe, "listening");
    await new Promise((resolve) => probe.close(resolve));
  },
);
