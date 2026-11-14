import { connectDatabase } from "../server/db.js";
import { migrate } from "./migrate.js";
import { seed } from "./seed.js";
import { once } from "node:events";
if (process.env.TEST_ALLOW_DB_WRITE !== "true")
  throw Error("E2E requiere TEST_ALLOW_DB_WRITE=true y DB de pruebas.");
const db = await connectDatabase();
try {
  await migrate(db);
  await seed(db, process.env.DEMO_PASSWORD);
} finally {
  await db.close();
}
const { server, stop } = await import("../server/main.js");
// Only a parent Node process can use this channel; no HTTP shutdown route.
if (process.send) {
  process.on("message", (message) => {
    if (message?.type === "stop") stop();
  });
  process.on("disconnect", stop);
  if (!server.listening) await once(server, "listening");
  process.send({ type: "ready", port: server.address().port });
}
