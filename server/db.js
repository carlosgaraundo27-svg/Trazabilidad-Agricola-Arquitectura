import pg from "pg";
export async function connectDatabase(env = process.env) {
  if (env.DB_MODE === "pglite") {
    if (env.NODE_ENV === "production")
      throw Error("PGlite solo para pruebas/desarrollo.");
    const { PGlite } = await import("@electric-sql/pglite");
    const db = new PGlite(env.PGLITE_DATA_DIR || "memory://");
    await db.waitReady;
    let queue = Promise.resolve();
    const exclusive = (fn) => {
      const next = queue.then(fn);
      queue = next.catch(() => {});
      return next;
    };
    const query = (text, params) => db.query(text, params);
    return {
      query: (...args) => exclusive(() => query(...args)),
      transaction: (fn) => exclusive(() => db.transaction((tx) => fn(tx))),
      close: () => db.close(),
    };
  }
  if (!env.DATABASE_URL) throw Error("Configure DATABASE_URL (PostgreSQL).");
  const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 10 });
  return {
    query: (...args) => pool.query(...args),
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await fn(client);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}
