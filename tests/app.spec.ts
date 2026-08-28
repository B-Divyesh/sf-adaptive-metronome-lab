import { readFileSync } from "node:fs";
import { expect, test, type Route } from "@playwright/test";
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
    buffer: Buffer.from(JSON.stringify({
      drills: [
        { id: "valid", name: "Should not import", mode: "drift", bpm: 120, bars: 16, meter: 4, amount: 6, seed: 1 },
        { id: "unsafe", name: "Unsafe", mode: "drift", bpm: 120, bars: 16, meter: 4, amount: 999, seed: 1 }
      ],
      logs: []
    }))
  });
  await expect(page.getByText("That file is not a valid Tempo Lab JSON backup.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Should not import" })).toHaveCount(0);
});

test("removes invalid legacy drill records before they reach the controls", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("tempo-lab", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("drills", "readwrite");
      transaction.objectStore("drills").put({ id: "legacy-invalid", name: "Unsafe legacy route", mode: "delay", bpm: 120, bars: 16, meter: 4, amount: 999, seed: 1 });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  });
  await page.reload();
  await expect(page.getByRole("heading", { level: 3, name: "Unsafe legacy route" })).toHaveCount(0);
  await expect.poll(() => page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("tempo-lab", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const result = await new Promise<unknown>((resolve, reject) => {
      const request = db.transaction("drills", "readonly").objectStore("drills").get("legacy-invalid");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return result;
  })).toBeUndefined();
});

test("updates a controlled prior PWA client to the current app shell", async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "one controlled-client upgrade covers the same service worker");
  const worker = readFileSync("dist/sw.js", "utf8");
  const currentVersion = worker.match(/const VERSION = "([^"]+)"/)?.[1];
  const currentApp = readFileSync("dist/assets/app.js", "utf8");
  expect(currentVersion).toMatch(/^tempo-lab-[a-f0-9]{16}$/);
  expect(worker).not.toContain("__TEMPO_LAB_CACHE_VERSION__");
  const priorApp = `${currentApp};globalThis.__tempoLabPriorShell=true;`;

  const priorWorker = `
    const VERSION = "tempo-lab-regression-prior";
    const PRIOR_APP = ${JSON.stringify(priorApp)};
    self.addEventListener("install", (event) => event.waitUntil(caches.open(VERSION).then(async (cache) => {
      await cache.addAll(["/", "/index.html", "/assets/app.css"]);
      await cache.put("/assets/app.js", new Response(PRIOR_APP, { headers: { "Content-Type": "application/javascript" } }));
    }).then(() => self.skipWaiting())));
    self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
    self.addEventListener("fetch", (event) => {
      if (event.request.method !== "GET") return;
      event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
    });`;
  const priorWorkerHandler = (route: Route) => route.fulfill({ contentType: "application/javascript", body: priorWorker });
  const priorAppHandler = (route: Route) => route.fulfill({ contentType: "application/javascript", headers: { "Cache-Control": "no-store" }, body: priorApp });
  await context.route("**/sw.js", priorWorkerHandler);
  await context.route("**/assets/app.js", priorAppHandler);
  await page.goto("/");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await expect.poll(() => page.evaluate(() => (globalThis as typeof globalThis & { __tempoLabPriorShell?: boolean }).__tempoLabPriorShell)).toBe(true);
  await expect.poll(() => page.evaluate(async () => (await (await caches.open("tempo-lab-regression-prior")).match("/assets/app.js"))?.text())).toBe(priorApp);

  await context.unroute("**/sw.js", priorWorkerHandler);
  await context.unroute("**/assets/app.js", priorAppHandler);
  await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())?.update(); });
  await expect(page.getByText("A Tempo Lab update is ready. Refresh when you finish this drill.")).toBeVisible();
  await expect.poll(async () => page.evaluate(async (version) => {
    const cache = await caches.open(version);
    return (await (await cache.match("/assets/app.js"))?.text()) ?? "";
  }, currentVersion)).toBe(currentApp);
  await page.reload();
  await expect(page.getByRole("heading", { level: 2, name: "Build your drill" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (globalThis as typeof globalThis & { __tempoLabPriorShell?: boolean }).__tempoLabPriorShell)).toBeUndefined();
});
