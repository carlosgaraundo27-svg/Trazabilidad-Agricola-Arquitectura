import { test, expect } from "@playwright/test";
import { connectDatabase } from "../../server/db.js";
import { compose } from "../../server/composition.js";
import { publicationLot } from "../support/publication-fixture.js";
import { PNG } from "pngjs";
import jsQR from "jsqr";
test("publicar, consultar QR anónimo móvil, actualizar y retirar", async ({
  page,
  browser,
}) => {
  const db = await connectDatabase();
  let lot;
  try {
    lot = await publicationLot(compose(db), process.env.DEMO_PASSWORD);
  } finally {
    await db.close();
  }
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByLabel("Correo electrónico").fill("publicacion@example.test");
  await page.getByLabel("Contraseña").fill(process.env.DEMO_PASSWORD);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Publicación de trazabilidad" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Administrar " + lot.id, exact: true })
    .click();
  await page.getByLabel("Código público del lote").fill("VV-E2E-001");
  await page.getByLabel("Fecha pública").fill("2026-01-02");
  await page
    .getByLabel("Descripción pública aprobada")
    .fill("Cosecha ficticia <script>alert(1)</script>");
  await page.getByLabel("He revisado estos campos").check();
  await page
    .getByRole("button", { name: "Publicar campos revisados", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Publicación confirmada",
  );
  const link = page.getByRole("link", { name: "Abrir consulta pública" });
  const url = await link.getAttribute("href");
  const qrImage = await page.request.get(
    "/api/v1/publications/lots/" + lot.id + "/qr",
  );
  const png = PNG.sync.read(await qrImage.body());
  expect(
    jsQR(new Uint8ClampedArray(png.data), png.width, png.height)?.data,
  ).toBe(url);
  expect(url).toMatch(/\/q\/[a-f0-9-]{36}$/);
  await expect(
    page.getByRole("img", { name: "QR del lote publicado" }),
  ).toBeVisible();
  const context = await browser.newContext({
      viewport: { width: 320, height: 740 },
    }),
    publicPage = await context.newPage();
  const requests = [];
  publicPage.on("request", (r) => requests.push(r.url()));
  publicPage.on("pageerror", (e) => errors.push(e.message));
  const publicPath = new URL(url).pathname;
  await publicPage.goto(publicPath);
  await expect(
    publicPage.getByRole("heading", { name: "Lote VV-E2E-001" }),
  ).toBeVisible();
  await expect(
    publicPage.getByText("Cosecha ficticia <script>alert(1)</script>", {
      exact: true,
    }),
  ).toBeVisible();
  expect(requests.some((u) => u.includes("/auth/"))).toBe(false);
  for (const width of [320, 768, 1024, 1440]) {
    await publicPage.setViewportSize({ width, height: 800 });
    expect(
      await publicPage.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await publicPage.setViewportSize({ width: 390, height: 844 });
  await publicPage.screenshot({
    path: ".local/qr-public-mobile.png",
    fullPage: true,
  });
  await page.getByLabel("Código público del lote").fill("VV-E2E-002");
  await page.getByLabel("He revisado estos campos").check();
  await page
    .getByRole("button", { name: "Publicar campos revisados", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Publicación confirmada",
  );
  await publicPage.getByRole("button", { name: "Actualizar consulta" }).click();
  await expect(
    publicPage.getByRole("heading", { name: "Lote VV-E2E-002" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Retirar publicación", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Publicación retirada");
  await publicPage.reload();
  await expect(
    publicPage.getByRole("heading", { name: "Trazabilidad no disponible" }),
  ).toBeVisible();
  await expect(publicPage.getByText("VV-E2E-002")).toHaveCount(0);
  expect(errors).toEqual([]);
  await context.close();
});
