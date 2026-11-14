import { test, expect } from "@playwright/test";
import { connectDatabase } from "../../server/db.js";
import { ids } from "../../scripts/seed.js";
import { intakeIds } from "../../scripts/seed-intake.js";

async function login(page, email) {
  await page.goto("/");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(process.env.DEMO_PASSWORD);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
}
async function logout(page) {
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(
    page.getByRole("heading", { name: "Iniciar sesión" }),
  ).toBeVisible();
}
async function createOrigin(
  quantity = "100",
  parcelId = ids.parcel,
  date = "2026-01-02T12:00:00Z",
) {
  const db = await connectDatabase();
  try {
    const h = crypto.randomUUID(),
      p = crypto.randomUUID();
    await db.query(
      "INSERT INTO harvest.harvests(id,organization_id,parcel_id,harvested_at,quantity,unit,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [h, ids.org, parcelId, date, quantity, "kg", ids.collector],
    );
    await db.query(
      "INSERT INTO harvest.pre_lots(id,harvest_id,organization_id,actor_id,request_key,request_payload) VALUES($1,$2,$3,$4,$5,$6)",
      [p, h, ids.org, ids.collector, crypto.randomUUID(), "{}"],
    );
    return p;
  } finally {
    await db.close();
  }
}
async function receive(page, id, reference, gross = "100", tara = "0") {
  await page.getByLabel("Pre-lote a recibir").selectOption(id);
  await page.getByLabel("Referencia de recepción").fill(reference);
  await page.getByLabel("Peso bruto (kg)").fill(gross);
  await page.getByLabel("Tara (kg)").fill(tara);
  await page
    .getByLabel("Evidencia del pesaje")
    .fill("Ticket ficticio comprobado");
  await page
    .getByRole("button", { name: "Registrar recepción", exact: true })
    .click();
  const row = page.getByTestId("receipt-" + reference);
  await expect(row).toBeVisible();
  return row;
}
async function confirm(row) {
  await row
    .getByRole("button", { name: "Confirmar recepción", exact: true })
    .click();
  await expect(row).toContainText("Confirmada");
}
async function select(row) {
  await row.getByRole("checkbox").check();
}

test("Acopio: recepción y consolidación exacta con consulta persistente", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const a = await createOrigin(),
    b = await createOrigin("40"),
    suffix = crypto.randomUUID().slice(0, 8);
  await login(page, "acopio@example.test");
  await expect(
    page.getByRole("heading", { name: "Recepción y consolidación" }),
  ).toBeVisible();
  const ra = await receive(page, a, "A-" + suffix, "105", "5");
  await confirm(ra);
  const rb = await receive(page, b, "B-" + suffix, "42", "2");
  await confirm(rb);
  await select(ra);
  await select(rb);
  await page.getByRole("button", { name: "Consolidar seleccionadas" }).click();
  const lot = page.getByTestId("lot").filter({ hasText: "A-" + suffix });
  await expect(lot).toContainText("140.000 kg");
  await expect(lot).toContainText("Pendiente de calidad");
  await expect(lot).toContainText("Despacho no autorizado");
  const id = await lot.getByTestId("lot-id").textContent();
  await page.reload();
  await expect(page.getByText(id, { exact: true })).toBeVisible();
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({ path: "test-results/acopio.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("Acopio: mezcla incompatible se explica sin consumir", async ({
  page,
}) => {
  const a = await createOrigin(),
    b = await createOrigin("40", ids.parcel, "2026-01-03T12:00:00Z"),
    s = crypto.randomUUID().slice(0, 8);
  await login(page, "acopio@example.test");
  const ra = await receive(page, a, "M1-" + s);
  await confirm(ra);
  const rb = await receive(page, b, "M2-" + s, "40");
  await confirm(rb);
  await select(ra);
  await select(rb);
  await page.getByRole("button", { name: "Consolidar seleccionadas" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "mismo productor, parcela, fecha local",
  );
  await expect(ra).toContainText("100.000 kg");
  await expect(ra.getByRole("checkbox")).toBeChecked();
});

test("Acopio: discrepancia bloqueada, autoaprobación rechazada y revisión por otra persona", async ({
  page,
}) => {
  const p = await createOrigin(),
    ref = "D-" + crypto.randomUUID().slice(0, 8);
  await login(page, "doble@example.test");
  const r = await receive(page, p, ref, "98");
  await expect(r).toContainText("Pendiente de revisión");
  await expect(r).toContainText("-2.000 kg");
  await expect(r.getByRole("checkbox")).toHaveCount(0);
  await expect(
    r.getByRole("button", { name: "Confirmar recepción" }),
  ).toHaveCount(0);
  await expect(r).toContainText("Otra persona debe revisar esta captura");
  const me = await (await page.request.get("/api/v1/auth/me")).json();
  const db = await connectDatabase();
  let id;
  try {
    id = (
      await db.query(
        "SELECT id FROM intake.receipts WHERE reference=$1 AND center_id=$2",
        [ref, intakeIds.center],
      )
    ).rows[0].id;
  } finally {
    await db.close();
  }
  const denied = await page.request.post(
    `/api/v1/intake/receipts/${id}/reviews`,
    {
      data: { note: "Intento de autoaprobación" },
      headers: {
        "X-CSRF-Token": me.csrfToken,
        "Idempotency-Key": crypto.randomUUID(),
      },
    },
  );
  expect(denied.status()).toBe(403);
  await logout(page);
  await login(page, "responsable@example.test");
  const rr = page.getByTestId("receipt-" + ref);
  await rr
    .getByLabel("Motivo de revisión de " + ref)
    .fill("Ticket contrastado por otra persona");
  await rr.getByRole("button", { name: "Aprobar discrepancia" }).click();
  await expect(rr).toContainText("Revisión independiente aprobada");
  await logout(page);
  await login(page, "acopio@example.test");
  const confirmed = page.getByTestId("receipt-" + ref);
  await confirm(confirmed);
  await select(confirmed);
  await page.getByRole("button", { name: "Consolidar seleccionadas" }).click();
  await expect(page.getByTestId("lot").filter({ hasText: ref })).toContainText(
    "98.000 kg",
  );
});

test("Acopio: cuenta de otro centro no ve ni opera Norte", async ({ page }) => {
  const p = await createOrigin();
  await login(page, "acopio2@example.test");
  await expect(page.getByLabel("Centro de recepción")).toHaveValue(
    intakeIds.center2,
  );
  await expect(
    page
      .getByLabel("Centro de recepción")
      .getByRole("option", { name: "Acopio ficticio Norte" }),
  ).toHaveCount(0);
  const me = await (await page.request.get("/api/v1/auth/me")).json();
  const denied = await page.request.post("/api/v1/intake/receipts", {
    data: {
      centerId: intakeIds.center,
      preLotId: p,
      reference: "FORBIDDEN-" + crypto.randomUUID(),
      grossKg: "100",
      tareKg: "0",
      evidence: "Fixture ficticio",
    },
    headers: {
      "X-CSRF-Token": me.csrfToken,
      "Idempotency-Key": crypto.randomUUID(),
    },
  });
  expect(denied.status()).toBe(403);
});

test("Acopio: dos interfaces concurrentes no consumen dos veces", async ({
  page,
  browser,
}) => {
  const p = await createOrigin(),
    ref = "RACE-" + crypto.randomUUID().slice(0, 8);
  await login(page, "acopio@example.test");
  const row = await receive(page, p, ref);
  await confirm(row);
  await select(row);
  const context = await browser.newContext();
  const other = await context.newPage();
  try {
    await login(other, "acopio@example.test");
    await select(other.getByTestId("receipt-" + ref));
    const waits = [
      page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/v1/lots") && r.request().method() === "POST",
      ),
      other.waitForResponse(
        (r) =>
          r.url().endsWith("/api/v1/lots") && r.request().method() === "POST",
      ),
    ];
    await Promise.all([
      page.getByRole("button", { name: "Consolidar seleccionadas" }).click(),
      other.getByRole("button", { name: "Consolidar seleccionadas" }).click(),
    ]);
    const responses = await Promise.all(waits);
    expect(responses.map((r) => r.status()).sort()).toEqual([201, 409]);
    const loser = responses[0].status() === 409 ? page : other;
    await loser.getByRole("button", { name: "Actualizar datos" }).click();
    await expect(
      loser.getByRole("button", { name: "Actualizar datos" }),
    ).toHaveCount(0);
    await expect(
      loser.getByRole("button", { name: "Consolidar seleccionadas" }),
    ).toBeDisabled();
    const db = await connectDatabase();
    try {
      const rows = (
        await db.query(
          "SELECT a.amount_kg::text FROM traceability.contributions a JOIN intake.receipts r ON r.id=a.receipt_id WHERE r.reference=$1",
          [ref],
        )
      ).rows;
      expect(rows).toEqual([{ amount_kg: "100.000" }]);
    } finally {
      await db.close();
    }
  } finally {
    await context.close();
  }
});

test("Acopio: respuesta perdida y reintento desde el formulario no duplican recepción", async ({
  page,
}) => {
  const p = await createOrigin(),
    ref = "RETRY-" + crypto.randomUUID().slice(0, 8),
    keys = [];
  let lose = true;
  await page.route("**/api/v1/intake/receipts", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    keys.push(route.request().headers()["idempotency-key"]);
    if (lose) {
      lose = false;
      const response = await route.fetch();
      expect(response.status()).toBe(201);
      return route.abort("failed");
    }
    return route.continue();
  });
  await login(page, "acopio@example.test");
  await page.getByLabel("Pre-lote a recibir").selectOption(p);
  await page.getByLabel("Referencia de recepción").fill(ref);
  await page.getByLabel("Peso bruto (kg)").fill("100");
  await page.getByLabel("Tara (kg)").fill("0");
  await page
    .getByLabel("Evidencia del pesaje")
    .fill("Ticket ficticio con pérdida simulada de respuesta");
  await page
    .getByRole("button", { name: "Registrar recepción", exact: true })
    .click();
  await expect(page.getByRole("alert")).not.toBeEmpty();
  const replay = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/v1/intake/receipts") &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Registrar recepción", exact: true })
    .click();
  expect((await replay).status()).toBe(200);
  await expect(page.getByTestId("receipt-" + ref)).toBeVisible();
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
  const db = await connectDatabase();
  try {
    const result = (
      await db.query(
        "SELECT count(*) AS n FROM intake.receipts WHERE pre_lot_id=$1",
        [p],
      )
    ).rows[0];
    expect(Number(result.n)).toBe(1);
  } finally {
    await db.close();
  }
});
