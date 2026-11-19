import { createServer } from "node:http";
import { once } from "node:events";
import { test, expect } from "@playwright/test";
import { navigateReady } from "./navigation.js";

test("navegación comprueba documento y UI sin esperar un recurso secundario pendiente", async ({
  page,
}) => {
  let release;
  const pending = new Promise((resolve) => (release = resolve));
  const server = createServer(async (request, response) => {
    if (request.url === "/pending.svg") {
      await pending;
      response.writeHead(200, { "Content-Type": "image/svg+xml" });
      response.end('<svg xmlns="http://www.w3.org/2000/svg"/>');
    } else {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(
        '<!doctype html><h1>Documento listo</h1><img alt="Recurso secundario" src="/pending.svg">',
      );
    }
  }).listen(0, "127.0.0.1");
  await once(server, "listening");
  let completed = false;
  const navigation = navigateReady(
    page,
    "http://127.0.0.1:" + server.address().port,
    page.getByRole("heading", { name: "Documento listo" }),
  ).then(() => (completed = true));
  try {
    await page
      .getByRole("heading", { name: "Documento listo" })
      .waitFor({ state: "visible" });
    await expect(
      page.getByRole("heading", { name: "Documento listo" }),
    ).toBeVisible();
    await expect
      .poll(() => completed, {
        message:
          "La UI está lista aunque el recurso secundario sigue pendiente",
      })
      .toBe(true);
  } finally {
    release();
    await navigation;
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
