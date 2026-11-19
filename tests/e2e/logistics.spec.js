import { test, expect } from "@playwright/test";
import { connectDatabase } from "../../server/db.js";
import { compose } from "../../server/composition.js";
import { logisticsLot } from "../../scripts/logistics-fixture.js";
import { shipmentInput } from "../../server/modules/logistics/domain.js";
import { startTestServer } from "./global-setup.js";
const logisticsPort = String(Number(process.env.E2E_PORT || "3001") + 1);
const external = process.env.E2E_EXTERNAL_SERVER === "true";
test.use({
  baseURL: external
    ? process.env.E2E_BASE_URL
    : "http://127.0.0.1:" + logisticsPort,
});
let logisticsServer;
test.beforeAll(async () => {
  if (external) return;
  logisticsServer = await startTestServer({
    ...process.env,
    E2E_PORT: logisticsPort,
    PUBLIC_BASE_URL: "http://127.0.0.1:" + logisticsPort,
  });
});
test.afterAll(async () => {
  await logisticsServer?.stop();
});
async function lot() {
  const db = await connectDatabase();
  try {
    return await logisticsLot(compose(db), process.env.DEMO_PASSWORD);
  } finally {
    await db.close();
  }
}
async function login(page, email = "inventario@example.test") {
  await page.goto("/");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(process.env.DEMO_PASSWORD);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Inventario y despachos", exact: true }),
  ).toBeVisible();
}
async function admit(page, candidate) {
  await page
    .getByLabel("Lote a admitir", { exact: true })
    .selectOption(candidate.id);
  await page.getByLabel("Peso verificado (kg)").fill(candidate.totalKg);
  await page.getByLabel("Referencia de admisión").fill("ACTUAL-E2E");
  await page
    .getByLabel("Evidencia de admisión")
    .fill("Conteo físico actual ficticio");
  await page
    .getByRole("button", { name: "Admitir en cuarentena", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Detalle de inventario" }),
  ).toBeVisible();
}
async function release(page) {
  await page
    .getByLabel("Motivo de liberación")
    .fill("Liberación explícita para logística");
  await page
    .getByRole("button", { name: "Liberar para logística", exact: true })
    .click();
  await expect(
    page.getByText("Liberado para logística", { exact: true }),
  ).toBeVisible();
}
test("Inventario: cambiar entre despachos con igual versión no conserva formularios ajenos", async ({
  page,
}) => {
  const db = await connectDatabase();
  let a, b;
  try {
    const s = compose(db),
      actor = await s.access.authenticate(
        (
          await s.access.login(
            "inventario@example.test",
            process.env.DEMO_PASSWORD,
          )
        ).token,
      );
    const draft = async (quantity, plate) => {
      const candidate = await logisticsLot(s, process.env.DEMO_PASSWORD, {
        quantities: [quantity],
      });
      let entry = (
        await s.logistics.admit(
          actor,
          {
            lotId: candidate.id,
            verifiedKg: candidate.totalKg,
            reference: "ACTUAL",
            evidenceRef: "Conteo ficticio",
          },
          crypto.randomUUID(),
        )
      ).item;
      entry = (
        await s.logistics.release(
          actor,
          entry.id,
          { expectedVersion: entry.version, reason: "Liberar" },
          crypto.randomUUID(),
        )
      ).item;
      return (
        await s.logistics.createShipment(
          actor,
          shipmentInput.parse({ stockEntryId: entry.id, transport: { plate } }),
          crypto.randomUUID(),
        )
      ).item;
    };
    a = await draft("17.125", "DEMO-A");
    b = await draft("25.500", "DEMO-B");
  } finally {
    await db.close();
  }
  await login(page);
  await page
    .getByTestId("shipment-row")
    .filter({ hasText: a.lotId })
    .getByRole("button", { name: "Consultar despacho", exact: true })
    .click();
  await expect(page.getByLabel("Placa", { exact: true })).toHaveValue("DEMO-A");
  await page.getByLabel("Placa", { exact: true }).fill("SIN-GUARDAR-A");
  await page.getByLabel("Motivo de cancelación").fill("Motivo ajeno A");
  await page
    .getByTestId("shipment-row")
    .filter({ hasText: b.lotId })
    .getByRole("button", { name: "Consultar despacho", exact: true })
    .click();
  await expect(page.getByLabel("Placa", { exact: true })).toHaveValue("DEMO-B");
  await expect(page.getByLabel("Motivo de cancelación")).toHaveValue("");
  await expect(
    page.getByRole("region", { name: "Detalle del despacho" }),
  ).toContainText("25.500 kg");
});
test("Inventario: recorrido completo, reserva con respuesta perdida y entrega sin doble descuento", async ({
  page,
}) => {
  const candidate = await lot(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  await admit(page, candidate);
  await expect(page.getByText("En cuarentena", { exact: true })).toBeVisible();
  await release(page);
  await page
    .getByRole("button", { name: "Preparar despacho completo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Detalle del despacho" }),
  ).toBeVisible();
  const keys = [];
  let lose = true;
  await page.route("**/api/v1/shipments/*/reservation", async (route) => {
    keys.push(route.request().headers()["idempotency-key"]);
    if (lose) {
      lose = false;
      expect((await route.fetch()).status()).toBe(201);
      return route.abort("failed");
    }
    return route.continue();
  });
  await page
    .getByRole("button", { name: "Reservar lote completo", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Reintentar misma operación",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Reintentar misma operación", exact: true })
    .click();
  await expect(
    page.getByText("Reserva activa sin vencimiento automático.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
  await page.getByLabel("Referencia de guía").fill("DEMO-" + candidate.id);
  await page.getByLabel("Vehículo", { exact: true }).fill("Unidad ficticia");
  await page.getByLabel("Placa", { exact: true }).fill("DEMO-001");
  await page.getByLabel("Placa", { exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("Chofer", { exact: true })).toBeFocused();
  await page
    .getByLabel("Chofer", { exact: true })
    .fill("Persona ficticia privada");
  await page.getByLabel("Precinto", { exact: true }).fill("SELLO-DEMO");
  await page.getByLabel("Destino", { exact: true }).fill("Destino ficticio");
  await page
    .getByLabel("Motivo de corrección")
    .fill("Completar transporte antes de salida");
  await page
    .getByRole("button", { name: "Guardar transporte", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Operación confirmada." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Confirmar salida", exact: true })
    .click();
  await expect(page.getByText("En tránsito", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Guardar transporte", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Cancelar antes de salida", exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("Evidencia de entrega")
    .fill("Recepción total ficticia");
  await page
    .getByRole("button", { name: "Confirmar entrega total", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Estado del despacho" }),
  ).toHaveText("Entregado");
  const balance = page.getByRole("region", { name: "Cantidades del lote" });
  await expect(balance.getByTestId("balance-onHandKg")).toHaveText("0.000 kg");
  await expect(balance.getByTestId("balance-deliveredKg")).toHaveText(
    candidate.totalKg + " kg",
  );
  await page.reload();
  await page
    .getByTestId("shipment-row")
    .filter({ hasText: candidate.id })
    .getByRole("button", { name: "Consultar despacho", exact: true })
    .click();
  await expect(
    page.getByRole("status", { name: "Estado del despacho" }),
  ).toHaveText("Entregado");
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 320)
      await page.screenshot({
        path: "test-results/inventory-delivery-mobile.png",
        fullPage: true,
      });
  }
  await page.screenshot({
    path: "test-results/inventory-delivery.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("Inventario: reserva cancelable visible y cuenta de otro centro sin acceso", async ({
  page,
}) => {
  const candidate = await lot();
  await login(page);
  await admit(page, candidate);
  await release(page);
  await page
    .getByRole("button", { name: "Preparar despacho completo", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reservar lote completo", exact: true })
    .click();
  await expect(
    page.getByText("Reserva activa sin vencimiento automático.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByLabel("Motivo de cancelación")
    .fill("Reserva abandonada, sin salida");
  await page
    .getByRole("button", { name: "Cancelar antes de salida", exact: true })
    .click();
  await expect(
    page.getByText("Cancelado antes de salida", { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("balance-onHandKg")).toHaveText(
    candidate.totalKg + " kg",
  );
  await expect(page.getByTestId("balance-reservedKg")).toHaveText("0.000 kg");
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(
    page.getByRole("heading", { name: "Iniciar sesión" }),
  ).toBeVisible();
  await login(page, "inventario2@example.test");
  await expect(page.getByText(candidate.id, { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Centro logístico")).toHaveValue(
    "60000000-0000-4000-8000-000000000002",
  );
});
