import { afterAll, beforeAll, expect, test } from "@jest/globals";
import { connectDatabase } from "../../server/db.js";
import { compose } from "../../server/composition.js";
import { createApp } from "../../server/http.js";
import { migrate } from "../../scripts/migrate.js";
import { seed, ids } from "../../scripts/seed.js";
import {
  publicationLot,
  demoProjection,
} from "../../scripts/publication-fixture.js";
import { AppError } from "../../server/shared/errors.js";

// No abrir HTTP local mientras D11 comparte host. Solo PostgreSQL efímero CI explícito.
const password = "Fiction-HTTP-only-2026!";
const origin = "https://lab.example.test";
let db,
  services,
  server,
  base,
  admin,
  field,
  other,
  sameOrg,
  viewer,
  publication;
const logs = [];
beforeAll(async () => {
  const target = new URL(
    process.env.JEST_HTTP_DATABASE_URL || "https://invalid.example.test",
  );
  if (
    process.env.GITHUB_ACTIONS !== "true" ||
    target.protocol !== "postgres:" ||
    target.hostname !== "127.0.0.1" ||
    target.port !== "55442" ||
    target.pathname !== "/jest_http"
  )
    throw new Error(
      "Suite HTTP exige runner independiente y jest_http:55442 explícito",
    );
  db = await connectDatabase({ DATABASE_URL: target.href });
  await migrate(db);
  await seed(db, password);
  const secondId = crypto.randomUUID();
  await db.query(
    "INSERT INTO access.users(id,organization_id,email,password_hash,role) SELECT $1,organization_id,'second-field@example.test',password_hash,role FROM access.users WHERE id=$2",
    [secondId, ids.collector],
  );
  await db.query("INSERT INTO access.parcel_assignments VALUES($1,$2,$3)", [
    secondId,
    ids.parcel,
    ids.org,
  ]);
  services = compose(db, { baseUrl: "https://public.example.test" });
  server = createApp({
    db,
    services,
    origin,
    log: (line) => logs.push(line),
  }).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  [admin, field, other, viewer, sameOrg] = await Promise.all([
    login("admin@example.test"),
    login("campo@example.test"),
    login("otro@example.test"),
    login("lector@example.test"),
    login("second-field@example.test"),
  ]);
  const lot = await publicationLot(services, password);
  const publisher = await services.access.authenticate(
    (await services.access.login("publicacion@example.test", password)).token,
  );
  publication = (
    await services.publication.publish(
      publisher,
      lot.id,
      { ...demoProjection, expectedVersion: 0 },
      crypto.randomUUID(),
    )
  ).item;
}, 30000);
afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (db) await db.close();
});
async function call(
  route,
  { auth, method = "GET", body, headers = {}, raw } = {},
) {
  const response = await fetch(base + route, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      ...(auth ? { Cookie: auth.cookie, "X-CSRF-Token": auth.csrfToken } : {}),
      ...headers,
    },
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  return {
    status: response.status,
    headers: response.headers,
    body: response.status === 204 ? null : await response.json(),
  };
}
async function login(email) {
  const r = await call("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
  });
  expect(r.status).toBe(200);
  expect(r.headers.get("set-cookie")).toMatch(/HttpOnly/);
  expect(r.headers.get("set-cookie")).toMatch(/SameSite=Strict/);
  return {
    cookie: r.headers.get("set-cookie").split(";")[0],
    csrfToken: r.body.csrfToken,
  };
}
const input = {
  parcelId: ids.parcel,
  harvestedAt: "2026-01-02T12:00:00Z",
  quantity: "12.125",
  unit: "kg",
};
const create = (auth, body = input, key = crypto.randomUUID()) =>
  call("/api/v1/pre-lots", {
    auth,
    method: "POST",
    body,
    headers: { "Idempotency-Key": key },
  });
function rejected(r, status, code) {
  expect(r.status).toBe(status);
  expect(r.body.error).toMatchObject({ code, requestId: expect.any(String) });
  expect(r.headers.get("x-request-id")).toBe(r.body.error.requestId);
}

test("SEC-01: protegido sin cookie rechaza401, sin filas", async () => {
  const r = await call("/api/v1/producers");
  rejected(r, 401, "UNAUTHENTICATED");
  expect(r.body.items).toBeUndefined();
});
test.each(["expired", "inactive", "logged-out"])(
  "SEC-02: sesión %s no autoriza ni filtra",
  async (mode) => {
    const result = await services.access.login("lector@example.test", password);
    const actor = await services.access.authenticate(result.token);
    if (mode === "expired")
      await db.query(
        "UPDATE access.sessions SET expires_at=now()-interval '1 second' WHERE token_hash=$1",
        [actor.sessionHash],
      );
    if (mode === "inactive")
      await db.query("UPDATE access.users SET active=false WHERE id=$1", [
        actor.id,
      ]);
    if (mode === "logged-out") await services.access.logout(result.token);
    try {
      rejected(
        await call("/api/v1/auth/me", {
          auth: {
            cookie: `session=${result.token}`,
            csrfToken: result.csrfToken,
          },
        }),
        401,
        "UNAUTHENTICATED",
      );
    } finally {
      if (mode === "inactive")
        await db.query("UPDATE access.users SET active=true WHERE id=$1", [
          actor.id,
        ]);
    }
  },
);
test("SEC-03: collector no crea productor y admin no captura; sin efecto SQL", async () => {
  const before = (await db.query("SELECT count(*)::int AS n FROM access.audit"))
    .rows[0].n;
  rejected(
    await call("/api/v1/producers", {
      auth: field,
      method: "POST",
      body: { name: "Ficticio" },
    }),
    403,
    "FORBIDDEN",
  );
  rejected(await create(admin), 403, "FORBIDDEN");
  expect(
    (await db.query("SELECT count(*)::int AS n FROM access.audit")).rows[0].n,
  ).toBe(before);
});
test.each(["otherParcel", "unassigned"])(
  "SEC-04: captura de origen %s oculta recurso404",
  async (key) => {
    rejected(
      await create(field, { ...input, parcelId: ids[key] }),
      404,
      "NOT_FOUND",
    );
  },
);
test("SEC-04: recibo de captura de otro actor no se revela", async () => {
  const capture = crypto.randomUUID();
  const path = `/api/v1/sync/pre-lots/${capture}`;
  const body = { schemaVersion: 1, ...input };
  expect(
    (
      await call(path, {
        auth: field,
        method: "PUT",
        body,
        headers: { "Idempotency-Key": capture },
      })
    ).status,
  ).toBe(201);
  rejected(
    await call(path, {
      auth: sameOrg,
      method: "PUT",
      body,
      headers: { "Idempotency-Key": capture },
    }),
    409,
    "SYNC_ID_CONTENT_CONFLICT",
  );
  rejected(
    await call(path, {
      auth: other,
      method: "PUT",
      body,
      headers: { "Idempotency-Key": capture },
    }),
    404,
    "NOT_FOUND",
  );
});
test("SEC-05: reporte exige concesión de centro, aun con sesión válida", async () => {
  const query = new URLSearchParams({
    centerId: "60000000-0000-4000-8000-000000000001",
    from: "2026-01-01T00:00:00Z",
    to: "2026-02-01T00:00:00Z",
  });
  rejected(
    await call(`/api/v1/reports/shipments?${query}`, { auth: viewer }),
    403,
    "CENTER_FORBIDDEN",
  );
});
test("SEC-06: revocación de asignación antes del replay devuelve404 sin nuevos hechos", async () => {
  const key = crypto.randomUUID();
  expect((await create(field, input, key)).status).toBe(201);
  const count = async () =>
    (
      await db.query(
        "SELECT (SELECT count(*) FROM harvest.harvests)::int h,(SELECT count(*) FROM harvest.pre_lots)::int p,(SELECT count(*) FROM access.audit)::int a",
      )
    ).rows[0];
  const before = await count();
  await db.query(
    "DELETE FROM access.parcel_assignments WHERE user_id=$1 AND parcel_id=$2",
    [ids.collector, ids.parcel],
  );
  try {
    rejected(await create(field, input, key), 404, "NOT_FOUND");
    expect(await count()).toEqual(before);
  } finally {
    await db.query("INSERT INTO access.parcel_assignments VALUES($1,$2,$3)", [
      ids.collector,
      ids.parcel,
      ids.org,
    ]);
  }
});
test.each([
  ["missing", { "X-CSRF-Token": "" }, "CSRF_REJECTED"],
  ["foreign", { "X-CSRF-Token": "invalid-fiction" }, "CSRF_REJECTED"],
  ["origin", { Origin: "https://foreign.example.test" }, "ORIGIN_REJECTED"],
])(
  "SEC-07: %s rechaza escritura403 antes de persistir",
  async (_, headers, code) => {
    rejected(
      await call("/api/v1/producers", {
        auth: admin,
        method: "POST",
        body: { name: "No guardar" },
        headers,
      }),
      403,
      code,
    );
    expect(
      (
        await db.query(
          "SELECT count(*)::int AS n FROM producers.producers WHERE name='No guardar'",
        )
      ).rows[0].n,
    ).toBe(0);
  },
);
test("HTTP valida422/400, JSON400, límite413 y ruta404 sin filtrar detalles", async () => {
  rejected(
    await create(field, { ...input, quantity: "0" }),
    422,
    "VALIDATION_ERROR",
  );
  rejected(
    await call("/api/v1/pre-lots", {
      auth: field,
      method: "POST",
      body: input,
    }),
    400,
    "INVALID_KEY",
  );
  rejected(
    await call("/api/v1/auth/login", { method: "POST", raw: "{" }),
    400,
    "INVALID_JSON",
  );
  rejected(
    await call("/api/v1/auth/login", {
      method: "POST",
      raw: JSON.stringify({ payload: "x".repeat(17000) }),
    }),
    413,
    "PAYLOAD_TOO_LARGE",
  );
  rejected(await call("/api/not-a-route"), 404, "NOT_FOUND");
});
test("HTTP público válido no exige login y nunca expone campos internos", async () => {
  const r = await call(`/api/public/v1/lots/${publication.publicId}`);
  expect(r.status).toBe(200);
  expect(r.body).toEqual(demoProjection);
  expect(r.headers.get("cache-control")).toBe("no-store");
  rejected(
    await call(`/api/public/v1/lots/${publication.publicId}?private=true`),
    404,
    "NOT_FOUND",
  );
});
test("HTTP500 sanea error no controlado y log;503 conserva contrato de dominio", async () => {
  const old = services.producers.listProducers;
  services.producers.listProducers = async () => {
    throw new Error("FICTION_PRIVATE_SQL_DETAIL");
  };
  try {
    const r = await call("/api/v1/producers", { auth: admin });
    rejected(r, 500, "INTERNAL_ERROR");
    expect(JSON.stringify(r.body) + logs.join("")).not.toContain(
      "FICTION_PRIVATE_SQL_DETAIL",
    );
  } finally {
    services.producers.listProducers = old;
  }
  const query = services.publication.query;
  services.publication.query = async () => {
    throw new AppError(
      503,
      "PUBLICATION_UNAVAILABLE",
      "Consulta no disponible.",
    );
  };
  try {
    rejected(
      await call(`/api/public/v1/lots/${publication.publicId}`),
      503,
      "PUBLICATION_UNAVAILABLE",
    );
  } finally {
    services.publication.query = query;
  }
});
test("/health refleja fallo inyectado de DB503, no una caída real de PostgreSQL", async () => {
  const query = db.query;
  db.query = async () => {
    throw new Error("FICTION_PRIVATE_SQL_DETAIL");
  };
  try {
    const r = await call("/health");
    expect(r.status).toBe(503);
    expect(r.body).toEqual({ status: "unavailable" });
  } finally {
    db.query = query;
  }
  expect((await call("/health")).status).toBe(200);
});
