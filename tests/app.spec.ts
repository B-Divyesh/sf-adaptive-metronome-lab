import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("builds, saves, and reloads a named drill", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Tempo Lab" })).toBeVisible();
  await page.locator("#bpm").fill("104");
  await page.getByLabel("Drill name").fill("Odd-meter bridge");
  await page.getByRole("button", { name: "Save drill" }).click();
  await expect(page.getByRole("heading", { level: 3, name: "Odd-meter bridge" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { level: 3, name: "Odd-meter bridge" })).toBeVisible();
});

test("has no serious or critical accessibility violations", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "one axe pass covers the same DOM");
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 2, name: "Build your drill" })).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))).toEqual([]);
});

test("supports keyboard selection and a 390px viewport", async ({ page }) => {
  await page.goto("/");
  const firstMode = page.getByRole("radio", { name: /Bounded drift/ });
  await firstMode.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: /Tempo ramp/ })).toBeChecked();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.getByRole("button", { name: /Start drill/ })).toBeVisible();
});

test("starts, stops, and records an attempted route", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Start drill/ }).click();
  await expect(page.getByRole("button", { name: /Stop drill/ })).toBeVisible();
  await expect(page.getByText(/Bar 1 of 16/)).toBeVisible();
  await page.getByRole("button", { name: /Stop drill/ }).click();
  await expect(page.getByRole("row", { name: /Bounded drift/ })).toBeVisible();
});

test("reloads the complete practice room offline", async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "offline install is covered in Chromium desktop");
  await page.goto("/");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect(page.getByText("Online · offline ready")).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { level: 2, name: "Build your drill" })).toBeVisible();
  await expect(page.getByText("Offline · practice available")).toBeVisible();
});
