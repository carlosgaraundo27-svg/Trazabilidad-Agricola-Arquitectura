import { connectDatabase } from "./db.js";
import { compose } from "./composition.js";
import { createApp } from "./http.js";
const db = await connectDatabase();
const port = Number(process.env.PORT || 3000);
if (
  process.env.NODE_ENV === "production" &&
  !process.env.APP_ORIGIN?.startsWith("https://")
)
  throw Error("Producción requiere APP_ORIGIN HTTPS.");
const app = createApp({
  db,
  services: compose(db),
  origin: process.env.APP_ORIGIN || "http://localhost:" + port,
  production: process.env.NODE_ENV === "production",
});
export const server = app.listen(port, process.env.HOST || "127.0.0.1", () =>
  console.log(JSON.stringify({ event: "server_started", port })),
);
let stopping = false;
export function stop() {
  if (stopping) return;
  stopping = true;
  server.close(async () => {
    await db.close();
    process.exit(0);
  });
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
