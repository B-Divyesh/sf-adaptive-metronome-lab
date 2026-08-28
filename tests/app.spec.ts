import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

function sharedRoute(payload: object): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

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

test("rejects out-of-range shared and imported drill settings", async ({ page }) => {
  const unsafe = { n: "Unsafe", m: "drift", b: 120, l: 16, t: 4, a: 999, s: 1 };
  await page.goto(`/?route=${sharedRoute(unsafe)}`);
  await expect(page.getByText("That share link is incomplete or invalid. A fresh drill was opened instead.")).toBeVisible();
  await expect(page.locator("#amount-output")).toHaveText("±6 BPM");

  await page.locator("#import-json").setInputFiles({
    name: "unsafe-tempo-lab-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ drills: [unsafe], logs: [] }))
  });
  await expect(page.getByText("That file is not a valid Tempo Lab JSON backup.")).toBeVisible();
});

test("updates a controlled prior PWA client to the current app shell", async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "one controlled-client upgrade covers the same service worker");
  const worker = readFileSync("dist/sw.js", "utf8");
  const currentVersion = worker.match(/const VERSION = "([^"]+)"/)?.[1];
  const currentApp = readFileSync("dist/assets/app.js", "utf8");
  expect(currentVersion).toMatch(/^tempo-lab-[a-f0-9]{16}$/);
  expect(worker).not.toContain("__TEMPO_LAB_CACHE_VERSION__");

  const priorWorker = `
    const VERSION = "tempo-lab-regression-prior";
    const SHELL = ["/", "/index.html", "/assets/app.js", "/assets/app.css"];
    self.addEventListener("install", (event) => event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())));
    self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
    self.addEventListener("fetch", (event) => {
      if (event.request.method !== "GET") return;
      event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
    });`;
  await context.route("**/sw.js", (route) => route.fulfill({ contentType: "application/javascript", body: priorWorker }));
  await page.goto("/");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  await context.unroute("**/sw.js");
  await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())?.update(); });
  await expect(page.getByText("A Tempo Lab update is ready. Refresh when you finish this drill.")).toBeVisible();
  await expect.poll(async () => page.evaluate(async (version) => {
    const cache = await caches.open(version);
    return (await (await cache.match("/assets/app.js"))?.text()) ?? "";
  }, currentVersion)).toBe(currentApp);
  await page.reload();
  await expect(page.getByRole("heading", { level: 2, name: "Build your drill" })).toBeVisible();
});
