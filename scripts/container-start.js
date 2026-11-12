import { connectDatabase } from "../server/db.js";
import { migrate } from "./migrate.js";
const db = await connectDatabase();
try {
  await migrate(db);
} finally {
  await db.close();
}
await import("../server/main.js");
