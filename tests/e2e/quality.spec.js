import { test, expect } from "@playwright/test";
import { connectDatabase } from "../../server/db.js";
import { ids } from "../../scripts/seed.js";
import { intakeIds } from "../../scripts/seed-intake.js";

async function lotFixture(playwright, baseURL) {
  const clients = [];
  const login = async (email) => {
    const request = await playwright.request.newContext({ baseURL });
    clients.push(request);
    const r = await request.post("/api/v1/auth/login", {
      data: { email, password: process.env.DEMO_PASSWORD },
    });
    expect(r.status()).toBe(200);
    return { request, csrf: (await r.json()).csrfToken };
  };
  const command = async (auth, path, data) => {
    const r = await auth.request.post("/api/v1" + path, {
      data,
      headers: {
        "X-CSRF-Token": auth.csrf,
        "Idempotency-Key": crypto.randomUUID(),
      },
    });
    expect(r.status()).toBe(201);
    return r.json();
  };
  try {
    const field = await login("campo@example.test"),
      op = await login("acopio@example.test"),
      receipts = [];
    for (let i = 0; i < 2; i++) {
      const p = await command(field, "/pre-lots", {
        parcelId: ids.parcel,
        harvestedAt: "2026-01-02T12:00:00Z",
        quantity: "100",
        unit: "kg",
      });
      const r = await command(op, "/intake/receipts", {
        centerId: intakeIds.center,
        preLotId: p.id,
        reference: "QE-" + p.id,
        grossKg: "100",
        tareKg: "0",
        evidence: "Ticket de prueba ficticio",
      });
      await command(op, "/intake/receipts/" + r.id + "/confirmation", {});
      receipts.push(r.id);
    }
    return await command(op, "/lots", {
      centerId: intakeIds.center,
      receiptIds: receipts,
    });
  } finally {
    for (const request of clients) await request.dispose();
  }
}
async function login(page, email = "calidad@example.test") {
  await page.goto("/");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(process.env.DEMO_PASSWORD);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Calidad del prototipo académico" }),
  ).toBeVisible();
}
async function start(page, lot) {
  const card = page.getByTestId("quality-lot").filter({ hasText: lot.id });
  await card.getByRole("button", { name: "Crear evaluación" }).click();
  await expect(
    page.getByRole("form", { name: "Captura de calidad" }),
  ).toBeVisible();
}
async function metadata(section, time = "2026-01-02T15:00:00.123") {
  await section
    .getByLabel("Momento de medición (hora de Lima)", { exact: true })
    .fill(time);
  await section
    .getByLabel("Responsable de la observación", { exact: true })
    .fill("Responsable ficticio");
  await section
    .getByLabel("Procedencia / evidencia original", { exact: true })
    .fill("Informe ficticio de prueba");
  await section
    .getByLabel("Método documentado", { exact: true })
    .fill("Método ficticio documentado");
}
async function sampleAndWeight(page) {
  await page.getByRole("button", { name: "Identificar muestra" }).click();
  await page
    .getByLabel("Referencia de muestra", { exact: true })
    .fill("Muestra ficticia UI");
  await page
    .getByLabel("Fecha de muestra (hora de Lima)", { exact: true })
    .fill("2026-01-02T15:00:00");
  await page
    .getByLabel("Responsable de muestra", { exact: true })
    .fill("Responsable ficticio");
  await page
    .getByLabel("Procedencia de muestra", { exact: true })
    .fill("Muestra documentada ficticia");
  await page.getByRole("button", { name: "Añadir peso", exact: true }).click();
  const weight = page.getByRole("region", { name: "Peso 1", exact: true });
  await weight
    .getByLabel("Referencia de fruto", { exact: true })
    .fill("Fruto A");
  await weight
    .getByLabel("Peso individual (g/fruto)", { exact: true })
    .fill("210.25");
  await metadata(weight);
}
test("Calidad: draft incompleto persistente, respuesta perdida y replay sin duplicados", async ({
  page,
  playwright,
  baseURL,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "warning") errors.push(m.text());
  });
  const lot = await lotFixture(playwright, baseURL);
  await login(page);
  await start(page, lot);
  await sampleAndWeight(page);
  let lost = false;
  await page.route("**/api/v1/quality/evaluations/*", async (route) => {
    if (route.request().method() === "PUT" && !lost) {
      lost = true;
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await page
    .getByRole("button", { name: "Guardar borrador", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Reintentar misma operación" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Reintentar misma operación" })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Borrador guardado." }),
  ).toBeVisible();
  expect(lost).toBe(true);
  const db = await connectDatabase();
  let id;
  try {
    const row = (
      await db.query(
        "SELECT id,state,version,capture FROM quality.evaluations WHERE lot_id=$1",
        [lot.id],
      )
    ).rows[0];
    id = row.id;
    expect(row.version).toBe(2);
    expect(row.state).toBe("draft");
    expect(row.capture.dryMatter).toBeNull();
    expect(row.capture.weights[0].value).toBe("210.25");
    expect(
      (
        await db.query(
          "SELECT count(*) FROM quality.events WHERE evaluation_id=$1",
          [id],
        )
      ).rows[0].count,
    ).toBe("2");
  } finally {
    await db.close();
  }
  await page.reload();
  await page
    .getByTestId("quality-lot")
    .filter({ hasText: lot.id })
    .getByRole("button", { name: "Consultar evaluación" })
    .click();
  await expect(
    page.getByLabel("Peso individual (g/fruto)", { exact: true }),
  ).toHaveValue("210.25");
  await expect(
    page.getByLabel("Momento de medición (hora de Lima)", { exact: true }),
  ).toHaveValue("2026-01-02T15:00:00.123");
  await page.setViewportSize({ width: 320, height: 800 });
  await expect(
    page.getByRole("button", { name: "Guardar borrador", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel("Peso individual (g/fruto)", { exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByLabel("Momento de medición (hora de Lima)", { exact: true }),
  ).toBeFocused();
  await page.screenshot({
    path: "test-results/quality-draft-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("Calidad: creación concurrente recuperable y aislamiento de otro centro", async ({
  page,
  browser,
  playwright,
  baseURL,
}) => {
  const lot = await lotFixture(playwright, baseURL),
    context = await browser.newContext(),
    other = await context.newPage();
  try {
    await login(page);
    await login(other);
    const secondCard = other
      .getByTestId("quality-lot")
      .filter({ hasText: lot.id });
    await expect(
      secondCard.getByRole("button", { name: "Crear evaluación" }),
    ).toBeVisible();
    await start(page, lot);
    await secondCard.getByRole("button", { name: "Crear evaluación" }).click();
    await expect(other.getByRole("alert")).toContainText(
      "Evaluación existente",
    );
    await other
      .getByRole("button", { name: "Actualizar lotes", exact: true })
      .click();
    await secondCard
      .getByRole("button", { name: "Consultar evaluación" })
      .click();
    await expect(
      other.getByRole("form", { name: "Captura de calidad" }),
    ).toBeVisible();
    const db = await connectDatabase();
    let id;
    try {
      const rows = (
        await db.query("SELECT id FROM quality.evaluations WHERE lot_id=$1", [
          lot.id,
        ])
      ).rows;
      expect(rows).toHaveLength(1);
      id = rows[0].id;
    } finally {
      await db.close();
    }
    await other.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(
      other.getByRole("heading", { name: "Iniciar sesión" }),
    ).toBeVisible();
    await login(other, "calidad2@example.test");
    await expect(
      other.getByTestId("quality-lot").filter({ hasText: lot.id }),
    ).toHaveCount(0);
    expect(
      (await other.request.get("/api/v1/quality/evaluations/" + id)).status(),
    ).toBe(404);
  } finally {
    await context.close();
  }
});
