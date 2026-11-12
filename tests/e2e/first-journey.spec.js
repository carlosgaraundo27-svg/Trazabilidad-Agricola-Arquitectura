import { test, expect } from "@playwright/test";
import { connectDatabase } from "../../server/db.js";
import { ids } from "../../scripts/seed.js";
test("administrador registra origen y recolector registra pre-lote en línea", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const suffix = crypto.randomUUID().slice(0, 8),
    producer = "Productor ficticio " + suffix,
    parcel = "Parcela ficticia " + suffix;
  async function login(email) {
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña").fill(process.env.DEMO_PASSWORD);
    await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  }
  await page.goto("/");
  await login("admin@example.test");
  await page.getByLabel("Nombre del productor", { exact: true }).fill(producer);
  await page.getByRole("button", { name: "Guardar productor" }).click();
  await expect(page.getByRole("status")).toContainText(producer);
  await page
    .getByLabel("Productor de la parcela")
    .selectOption({ label: producer });
  await page.getByLabel("Nombre de la parcela").fill(parcel);
  await page.getByLabel("Latitud").fill("-12.05");
  await page.getByLabel("Longitud").fill("-76.95");
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/v1/parcels") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Guardar parcela" }).click();
  const created = await (await response).json();
  await expect(page.getByRole("status")).toContainText(parcel);
  // Preparación explícita: no existe aún UI de administración de asignaciones.
  const db = await connectDatabase();
  try {
    await db.query("INSERT INTO access.parcel_assignments VALUES($1,$2,$3)", [
      ids.collector,
      created.id,
      ids.org,
    ]);
  } finally {
    await db.close();
  }
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await login("campo@example.test");
  await page
    .getByRole("combobox", { name: "Productor", exact: true })
    .selectOption({ label: producer });
  await page.getByLabel("Parcela asignada").selectOption({ label: parcel });
  await page.getByLabel("Fecha y hora de cosecha").fill("2026-01-02T08:30");
  await page.getByLabel("Cantidad declarada").fill("125.5");
  await page
    .getByRole("combobox", { name: "Unidad", exact: true })
    .selectOption("kg");
  await page
    .getByRole("button", { name: "Registrar pre-lote", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pre-lote registrado" }),
  ).toBeVisible();
  const id = await page.getByTestId("prelot-id").textContent();
  expect(id).toMatch(/^[0-9a-f-]{36}$/);
  await page.reload();
  await expect(page.getByText(id, { exact: true })).toBeVisible();
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "test-results/primer-recorrido.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(
    page.getByRole("heading", { name: "Iniciar sesión" }),
  ).toBeVisible();
});
