import { test, expect } from "@playwright/test";
import { connectDatabase } from "../../server/db.js";
import { reportsFixture, reportIds } from "../../scripts/reports-fixture.js";

test.beforeAll(async () => {
  if (process.env.DB_MODE === "pglite") {
    expect(process.env.E2E_REPORT_FIXTURE).toBe("true");
    return;
  }
  const db = await connectDatabase();
  try {
    await reportsFixture(db, process.env.DEMO_PASSWORD);
  } finally {
    await db.close();
  }
});

test("ROP-01: consulta, filtros, pendiente, vacío y recuperación sin datos privados", async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByLabel("Correo electrónico").fill("inventario@example.test");
  await page.getByLabel("Contraseña").fill(process.env.DEMO_PASSWORD);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await page
    .getByRole("button", { name: "Reportes operativos", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Salidas y entregas por centro" }),
  ).toBeVisible();
  await page
    .getByLabel("Salida desde (UTC, inclusiva)")
    .fill("2026-01-03T00:00:00.000");
  await page
    .getByLabel("Salida hasta (UTC, exclusiva)")
    .fill("2026-01-04T00:00:00.000");
  const apply = page.getByRole("button", {
    name: "Consultar reporte",
    exact: true,
  });
  const rows = page.getByTestId("report-row");
  let release;
  const barrier = new Promise((resolve) => {
    release = resolve;
  });
  await page.route(
    "**/api/v1/reports/shipments?**",
    async (route) => {
      await barrier;
      await route.continue();
    },
    { times: 1 },
  );
  await apply.click();
  await expect(
    page.getByText("Consultando salidas y entregas…", { exact: true }),
  ).toBeVisible();
  release();
  await expect(rows).toHaveCount(3);
  const first = rows.filter({ hasText: reportIds[0] });
  await expect(first).toContainText("999999999.999");
  await expect(first).toContainText("5400.001");
  const pending = rows.filter({ hasText: reportIds[1] });
  await expect(pending).toContainText("En tránsito");
  await expect(pending.getByText("Pendiente", { exact: true })).toHaveCount(3);
  let releaseOld;
  const oldBarrier = new Promise((resolve) => {
    releaseOld = resolve;
  });
  await page.route(
    "**/api/v1/reports/shipments?**",
    async (route) => {
      await oldBarrier;
      await route.continue();
    },
    { times: 1 },
  );
  await page.getByLabel("Estado del reporte").selectOption("in_transit");
  await apply.click();
  await expect(
    page.getByText("Consultando salidas y entregas…", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Estado del reporte").selectOption("delivered");
  await apply.click();
  await expect(rows).toHaveCount(2);
  const oldResponse = page.waitForResponse(
    (response) =>
      response.url().includes("/reports/shipments?") &&
      response.url().includes("state=in_transit"),
  );
  releaseOld();
  await (await oldResponse).finished();
  await expect(rows).toHaveCount(2);
  await page.getByLabel("Estado del reporte").selectOption("");
  await apply.click();
  await expect(rows).toHaveCount(3);
  const lotId = (
    await rows
      .filter({ hasText: reportIds[2] })
      .locator("code")
      .allTextContents()
  )[1];
  await page.getByLabel("Estado del reporte").selectOption("in_transit");
  await expect(rows).toHaveCount(0);
  await apply.click();
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText(reportIds[1]);
  await page.getByLabel("Estado del reporte").selectOption("delivered");
  await page.getByLabel("Lote exacto (opcional)").fill(lotId);
  await apply.click();
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText("0.000");
  await page
    .getByLabel("Salida hasta (UTC, exclusiva)")
    .fill("2026-01-03T11:30:00.123");
  await apply.click();
  await expect(
    page.getByText("No hay salidas que coincidan con estos filtros."),
  ).toBeVisible();
  await page
    .getByLabel("Salida hasta (UTC, exclusiva)")
    .fill("2026-01-04T00:00:00.000");
  await page.route(
    "**/api/v1/reports/shipments?**",
    (route) =>
      route.fulfill({
        status: 503,
        json: {
          error: {
            code: "REPORT_TIMEOUT",
            message: "Consulta ficticia no disponible",
          },
        },
      }),
    { times: 1 },
  );
  await apply.click();
  await expect(page.getByRole("alert")).toHaveText(
    "Consulta ficticia no disponible",
  );
  await expect(rows).toHaveCount(0);
  await page
    .getByRole("button", { name: "Reintentar consulta", exact: true })
    .click();
  await expect(rows).toHaveCount(1);
  const report = page.getByRole("region", {
    name: "Reporte operativo de salidas y entregas",
    exact: true,
  });
  for (const value of [
    "PRIVADO-ROP",
    "PRECINTO-PRIVADO",
    "Chofer ficticio privado",
    "Recibo privado ficticio",
  ])
    await expect(report).not.toContainText(value);
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await expect(apply).toBeVisible();
    if (width === 320 || width === 1440)
      await page.screenshot({
        path: testInfo.outputPath("rop01-" + width + ".png"),
        fullPage: true,
      });
  }
  await page.getByLabel("Centro del reporte").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Salida desde (UTC, inclusiva)")).toBeFocused();
  expect(errors).toEqual([]);
});
