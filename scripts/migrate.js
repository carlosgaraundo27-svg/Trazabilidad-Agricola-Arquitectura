import { readFile, readdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { connectDatabase } from "../server/db.js";
export async function migrate(db) {
  await db.transaction(async (tx) => {
    await tx.query(
      "CREATE TABLE IF NOT EXISTS public.schema_migrations(version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    await tx.query("LOCK TABLE public.schema_migrations IN EXCLUSIVE MODE");
    const files = (await readdir(new URL("../migrations/", import.meta.url)))
      .filter((file) => /^\d+_[a-z_]+\.up\.sql$/.test(file))
      .sort();
    for (const file of files) {
      const version = file.split("_")[0];
      if (
        (
          await tx.query(
            "SELECT version FROM public.schema_migrations WHERE version=$1",
            [version],
          )
        ).rows.length
      )
        continue;
      const sql = await readFile(
        new URL("../migrations/" + file, import.meta.url),
        "utf8",
      );
      // Explicit boundaries preserve semicolons inside PostgreSQL trigger functions.
      for (const statement of sql
        .split(sql.startsWith("-- statement") ? /^-- statement\s*$/m : ";")
        .map((s) => s.trim())
        .filter(Boolean))
        await tx.query(statement);
      await tx.query(
        "INSERT INTO public.schema_migrations(version) VALUES($1)",
        [version],
      );
    }
  });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const db = await connectDatabase();
  try {
    await migrate(db);
    console.log("Migraciones aplicadas/verificadas.");
  } finally {
    await db.close();
  }
}
