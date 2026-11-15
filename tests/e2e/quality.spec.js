import { compose } from "../../server/composition.js";
import { preLotInput } from "../../server/modules/harvest/domain.js";
import { receiptInput } from "../../server/modules/intake/domain.js";
import { lotInput } from "../../server/modules/traceability/domain.js";
import { test, expect } from "@playwright/test";
import { connectDatabase } from "../../server/db.js";
import { ids } from "../../scripts/seed.js";
import { intakeIds } from "../../scripts/seed-intake.js";

async function lotFixture(originalCount = 2) {
  const db = await connectDatabase(),
    services = compose(db);
  const actor = async (email) =>
    services.access.authenticate(
      (await services.access.login(email, process.env.DEMO_PASSWORD)).token,
    );
  try {
    const field = await actor("campo@example.test"),
      op = await actor("acopio@example.test"),
      receipts = [];
    for (let i = 0; i < 2; i++) {
      const p = (
        await services.harvest.create(
          field,
          preLotInput.parse({
            parcelId: ids.parcel,
            harvestedAt: "2026-01-02T12:00:00Z",
            quantity: "100",
            unit: "kg",
          }),
          crypto.randomUUID(),
        )
      ).item;
      const r = (
        await services.intake.receive(
          op,
          receiptInput.parse({
            centerId: intakeIds.center,
            preLotId: p.id,
            reference: "QE-" + p.id,
            grossKg: "100",
            tareKg: "0",
            evidence: "Ticket ficticio de prueba",
            ...(i < originalCount
              ? {
                  temperature: {
                    value: "18.10",
                    unit: "°C",
                    measuredAt: "2026-01-02T20:00:00.123Z",
                    observedBy: "Observador ficticio",
                    provenance: "Ticket original ficticio",
                    method: "Lectura manual ficticia",
                  },
                }
              : {}),
          }),
          crypto.randomUUID(),
        )
      ).item;
      await services.intake.confirm(op, r.id, crypto.randomUUID());
      receipts.push(r.id);
    }
    return (
      await services.intake.consolidate(
        op,
        lotInput.parse({ centerId: intakeIds.center, receiptIds: receipts }),
        crypto.randomUUID(),
      )
    ).item;
  } finally {
    await db.close();
  }
}
async function login(page, email = "calidad@example.test") {
  await page.goto("/");
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(process.env.DEMO_PASSWORD);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: email.startsWith("acopio")
        ? "Recepción y consolidación"
        : "Calidad del prototipo académico",
    }),
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
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "warning") errors.push(m.text());
  });
  const lot = await lotFixture();
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

async function completeCapture(page) {
  await sampleAndWeight(page);
  await page
    .getByRole("button", { name: "Añadir materia seca", exact: true })
    .click();
  const dry = page.getByRole("region", { name: "Materia seca", exact: true });
  await dry.getByLabel("Materia seca (%)", { exact: true }).fill("23.10");
  await metadata(dry);
  await page
    .getByRole("button", { name: "Añadir conteos", exact: true })
    .click();
  const discard = page.getByRole("region", {
    name: "Descarte de muestra",
    exact: true,
  });
  await discard.getByLabel("Frutos examinados", { exact: true }).fill("3");
  await discard.getByLabel("Frutos descartados", { exact: true }).fill("1");
  await metadata(discard);
  await page
    .getByRole("button", { name: "Añadir temperatura", exact: true })
    .click();
  const temp = page.getByRole("region", { name: "Temperatura 1", exact: true });
  await temp.getByLabel("Temperatura (°C)", { exact: true }).fill("-1.50");
  await metadata(
    temp,
    new Date(Date.now() - 5 * 3600000).toISOString().slice(0, -1),
  );
  await page
    .getByRole("button", { name: "Guardar borrador", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Borrador guardado." }),
  ).toBeVisible();
}
test("Calidad: cierra con todas las originales y conserva observación posterior y cantidades", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const lot = await lotFixture();
  await login(page);
  await start(page, lot);
  await completeCapture(page);
  await expect(
    page.getByText(
      "Todas las recepciones tienen temperatura original documentada.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByTestId("original-temperature")).toHaveCount(2);
  await expect(page.getByTestId("original-temperature").first()).toContainText(
    "02/01/2026",
  );
  await expect(page.getByTestId("original-temperature").first()).toContainText(
    "123",
  );
  await page
    .getByLabel("Resultado manual", { exact: true })
    .selectOption("accepted");
  await page
    .getByLabel("Justificación del responsable", { exact: true })
    .fill("Resultado manual ficticio revisado para el prototipo");
  await page
    .getByRole("button", {
      name: "Cerrar evaluación definitivamente",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Resultado manual: Aprobado",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Guardar borrador", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByLabel("Peso individual (g/fruto)", { exact: true }),
  ).toBeDisabled();
  await page.reload();
  await page
    .getByTestId("quality-lot")
    .filter({ hasText: lot.id })
    .getByRole("button", { name: "Consultar evaluación", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Resultado manual: Aprobado",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Temperatura (°C)", { exact: true }),
  ).toHaveValue("-1.50");
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "test-results/quality-closed-desktop.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
  const db = await connectDatabase();
  try {
    const rows = (
      await db.query(
        "SELECT state,result,capture FROM quality.evaluations WHERE lot_id=$1",
        [lot.id],
      )
    ).rows;
    expect(rows[0].state).toBe("closed");
    expect(rows[0].capture.temperatures[0].value).toBe("-1.50");
    expect(
      (
        await db.query(
          "SELECT sum(amount_kg)::text AS total FROM traceability.contributions WHERE lot_id=$1",
          [lot.id],
        )
      ).rows[0].total,
    ).toBe("200.000");
  } finally {
    await db.close();
  }
});
test("Calidad: identifica recepción pendiente y bloquea cierre incluso con temperatura posterior", async ({
  page,
}) => {
  const lot = await lotFixture(1);
  await login(page);
  await start(page, lot);
  await completeCapture(page);
  const missing = page
    .getByTestId("original-temperature")
    .filter({ hasText: "Pendiente: sin temperatura original." });
  await expect(missing).toHaveCount(1);
  await expect(
    page.getByRole("button", {
      name: "Cerrar evaluación definitivamente",
      exact: true,
    }),
  ).toBeDisabled();
  const db = await connectDatabase();
  let row;
  try {
    row = (
      await db.query(
        "SELECT e.id,e.version,c.receipt_id FROM quality.evaluations e JOIN traceability.contributions c ON c.lot_id=e.lot_id LEFT JOIN intake.receipt_temperatures t ON t.receipt_id=c.receipt_id WHERE e.lot_id=$1 AND t.id IS NULL",
        [lot.id],
      )
    ).rows[0];
  } finally {
    await db.close();
  }
  await expect(missing).toContainText(row.receipt_id);
  const me = await (await page.request.get("/api/v1/auth/me")).json();
  const direct = await page.request.post(
    "/api/v1/quality/evaluations/" + row.id + "/closure",
    {
      data: {
        expectedVersion: row.version,
        result: "accepted",
        note: "No debe cerrar",
      },
      headers: {
        "X-CSRF-Token": me.csrfToken,
        "Idempotency-Key": crypto.randomUUID(),
      },
    },
  );
  expect(direct.status()).toBe(422);
  await page.reload();
  await page
    .getByTestId("quality-lot")
    .filter({ hasText: lot.id })
    .getByRole("button", { name: "Consultar evaluación", exact: true })
    .click();
  await expect(
    page
      .getByTestId("original-temperature")
      .filter({ hasText: row.receipt_id }),
  ).toContainText("Pendiente");
  await page.screenshot({
    path: "test-results/quality-missing-receipt.png",
    fullPage: true,
  });
});
test("Acopio: registra temperatura original una vez con responsable y evento de recepción", async ({
  page,
}) => {
  const db = await connectDatabase(),
    h = crypto.randomUUID(),
    p = crypto.randomUUID(),
    reference = "TEMP-" + p;
  try {
    await db.query(
      "INSERT INTO harvest.harvests(id,organization_id,parcel_id,harvested_at,quantity,unit,actor_id) VALUES($1,$2,$3,'2026-01-02T12:00:00Z',100,'kg',$4)",
      [h, ids.org, ids.parcel, ids.collector],
    );
    await db.query(
      "INSERT INTO harvest.pre_lots(id,harvest_id,organization_id,actor_id,request_key,request_payload) VALUES($1,$2,$3,$4,$5,'{}')",
      [p, h, ids.org, ids.collector, crypto.randomUUID()],
    );
    await login(page, "acopio@example.test");
    await page
      .getByLabel("Pre-lote a recibir", { exact: true })
      .selectOption(p);
    await page
      .getByLabel("Referencia de recepción", { exact: true })
      .fill(reference);
    await page.getByLabel("Peso bruto (kg)", { exact: true }).fill("100");
    await page.getByLabel("Tara (kg)", { exact: true }).fill("0");
    await page
      .getByLabel("Evidencia del pesaje", { exact: true })
      .fill("Ticket ficticio");
    await page
      .getByLabel("Documentar temperatura original", { exact: true })
      .check();
    await page
      .getByLabel("Temperatura original (°C)", { exact: true })
      .fill("18.10");
    await metadata(
      page.getByRole("group", {
        name: "Temperatura original de recepción",
        exact: true,
      }),
    );
    await page
      .getByRole("button", { name: "Registrar recepción", exact: true })
      .click();
    const receipt = page.getByTestId("receipt-" + reference);
    await expect(receipt).toContainText("Temperatura original: 18.10 °C");
    const row = (
      await db.query(
        "SELECT t.recorded_by,t.measured_at,e.payload,a.action FROM intake.receipt_temperatures t JOIN intake.receipts r ON r.id=t.receipt_id JOIN intake.events e ON e.receipt_id=r.id AND e.kind='received' JOIN access.audit a ON a.resource_id=r.id WHERE r.reference=$1",
        [reference],
      )
    ).rows[0];
    expect(row.recorded_by).toBe(intakeIds.operator);
    expect(row.measured_at.toISOString()).toBe("2026-01-02T20:00:00.123Z");
    expect(row.payload.originalTemperature.value).toBe("18.10");
    expect(row.action).toBe("intake:receive");
    await page.reload();
    await expect(page.getByTestId("receipt-" + reference)).toContainText(
      "Temperatura original: 18.10 °C",
    );
  } finally {
    await db.close();
  }
});

test("Calidad: creación concurrente recuperable y aislamiento de otro centro", async ({
  page,
  browser,
}) => {
  const lot = await lotFixture(),
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
