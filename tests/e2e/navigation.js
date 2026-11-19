import { expect } from "@playwright/test";

export async function navigateReady(page, url, ready) {
  const response = await page.goto(url, { waitUntil: "commit" });
  expect(response?.ok()).toBe(true);
  await ready.waitFor({ state: "visible" });
  await expect(ready).toBeVisible();
}
