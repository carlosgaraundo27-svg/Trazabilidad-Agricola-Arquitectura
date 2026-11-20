export function labConfig(env) {
  if (env.SPRINT02_INDEPENDENT_HOST !== "true")
    throw new Error(
      "Requiere otra máquina/runner; no ejecutar en el host Android.",
    );
  const database = new URL(env.SPRINT02_DATABASE_URL || "");
  const redis = new URL(env.SPRINT02_REDIS_URL || "");
  if (
    database.protocol !== "postgres:" ||
    database.hostname !== "127.0.0.1" ||
    database.port !== "55442" ||
    database.pathname !== "/sprint02_lab" ||
    database.username !== "sprint02" ||
    database.search ||
    database.hash ||
    redis.protocol !== "redis:" ||
    redis.hostname !== "127.0.0.1" ||
    redis.port !== "56382" ||
    redis.pathname !== "" ||
    redis.username ||
    redis.password ||
    redis.search ||
    redis.hash
  )
    throw new Error(
      "Solo PostgreSQL sprint02_lab:55442 y Redis:56382 dedicados.",
    );
  return {
    DATABASE_URL: database.href,
    redisUrl: redis.href,
    NODE_ENV: "test",
  };
}

export async function requireLab(db) {
  const result = await db.query(
    "SELECT current_database() AS name, label FROM public.sprint02_lab_marker",
  );
  if (
    result.rows.length !== 1 ||
    result.rows[0].name !== "sprint02_lab" ||
    result.rows[0].label !== "synthetic-sprint02-only"
  )
    throw new Error("Marcador de laboratorio ausente o ajeno.");
}
