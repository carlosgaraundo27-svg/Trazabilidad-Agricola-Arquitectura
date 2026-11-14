import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { connectDatabase } from "../server/db.js";
export async function migrate(db) {
  await db.transaction(async (tx) => {
    await tx.query(
      "CREATE TABLE IF NOT EXISTS public.schema_migrations(version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
    );
    await tx.query("LOCK TABLE public.schema_migrations IN EXCLUSIVE MODE");
    if (
      (
        await tx.query(
          "SELECT version FROM public.schema_migrations WHERE version=$1",
          ["001"],
        )
      ).rows.length
    )
      return;
    const sql = await readFile(
      new URL("../migrations/001_initial.up.sql", import.meta.url),
      "utf8",
    );
    for (const statement of sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean))
      await tx.query(statement);
    await tx.query("INSERT INTO public.schema_migrations(version) VALUES($1)", [
      "001",
    ]);
  });
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const db = await connectDatabase();
  try {
    await migrate(db);
    console.log("Migración 001 aplicada/verificada.");
  } finally {
    await db.close();
  }
}
