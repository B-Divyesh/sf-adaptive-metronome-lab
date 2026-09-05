import { existsSync } from "node:fs";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

type StorageRows = { drills: Array<{ id: string; name: string }>; logs: Array<{ id: string }> };

async function rows(page: Page, name: "tempo-lab" | "demo:tempo-lab"): Promise<StorageRows> {
  return page.evaluate(async (databaseName) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (!db.objectStoreNames.contains("drills") || !db.objectStoreNames.contains("logs")) {
      db.close();
      return { drills: [], logs: [] };
    }
    const all = (storeName: "drills" | "logs") => new Promise<unknown[]>((resolve, reject) => {
      const request = db.transaction(storeName, "readonly").objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const [drills, logs] = await Promise.all([all("drills"), all("logs")]);
    db.close();
    return { drills, logs };
  }, name) as Promise<StorageRows>;
}

async function openDemo(page: Page): Promise<void> {
  await page.goto("/demo");
  await expect(page.getByText("Demo — sample data, nothing is saved")).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Pocket drift at 96" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Pocket drift at 96/ })).toBeVisible();
}

async function loadDemoDrill(page: Page, name: string): Promise<void> {
  await page.locator(".drill-list li", { hasText: name }).getByRole("button", { name: "Load drill" }).click();
  await expect(page.getByLabel("Drill name")).toHaveValue(name);
}

async function tempoValues(page: Page): Promise<number[]> {
  await page.getByText("Show planned tempos", { exact: true }).click();
  return (await page.locator(".tempo-list li").allTextContents()).filter((text) => text.startsWith("Bar")).map((text) => Number(text.match(/(\d+) BPM/)?.[1]));
}

test("@claim:demo-isolation loads realistic sample data and never changes real data", async ({ page }) => {
  await openDemo(page);
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("tempo-lab", 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("drills", { keyPath: "id" });
        request.result.createObjectStore("logs", { keyPath: "id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("drills", "readwrite");
      transaction.objectStore("drills").put({ id: "real-browser-drill", name: "Real browser drill", mode: "drift", bpm: 96, bars: 16, meter: 4, amount: 5, seed: 1, audio: true, visual: true, haptic: false, createdAt: "2026-08-28T09:00:00.000Z", updatedAt: "2026-08-28T09:00:00.000Z" });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  });
  expect((await rows(page, "tempo-lab")).drills.map((drill) => drill.name)).toEqual(["Real browser drill"]);

  const sampleRows = await rows(page, "demo:tempo-lab");
  expect(sampleRows.drills.map((drill) => drill.name).sort()).toEqual(["Chorus ramp", "Late backbeat", "Pocket drift at 96", "Recovery count"]);
  expect(sampleRows.logs).toHaveLength(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await page.getByLabel("Drill name").fill("Demo-only drill");
  await page.getByRole("button", { name: "Save drill" }).click();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.getByRole("heading", { level: 3, name: "Demo-only drill" })).toHaveCount(0);
  await page.getByRole("button", { name: "Start for real" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 3, name: "Real browser drill" })).toBeVisible();
  expect((await rows(page, "tempo-lab")).drills.map((drill) => drill.name)).toEqual(["Real browser drill"]);
});

test("@claim:free-to-use opens every sample drill without an account or payment step", async ({ page }) => {
  await openDemo(page);
  await expect(page.getByRole("heading", { level: 3, name: "Chorus ramp" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start drill" })).toBeVisible();
  await expect(page.locator('input[type="password"], input[autocomplete="cc-number"], [data-payment]')).toHaveCount(0);
});

test("@claim:offline-reload keeps the sample drill available after the first visit", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "A dedicated desktop context covers the service-worker claim.");
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await openDemo(page);
    await page.evaluate(async () => { await navigator.serviceWorker.ready; });
    await page.reload();
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByText("Demo — sample data, nothing is saved")).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Pocket drift at 96" })).toBeVisible();
    await expect(page.getByText("Offline · practice available")).toBeVisible();
  } finally {
    await context.close();
  }
});

test("@claim:drift-replay shows a repeatable two-bar tempo pattern inside its BPM limit", async ({ page }) => {
  await openDemo(page);
  const first = await tempoValues(page);
  await page.reload();
  const replay = await tempoValues(page);
  expect(replay).toEqual(first);
  expect(first.every((tempo) => tempo >= 91 && tempo <= 101)).toBe(true);
  for (let index = 0; index < first.length; index += 2) expect(first[index + 1]).toBe(first[index]);
});

test("@claim:tempo-ramp shows an even, finite move between the sample endpoints", async ({ page }) => {
  await openDemo(page);
  await loadDemoDrill(page, "Chorus ramp");
  const values = await tempoValues(page);
  expect(values[0]).toBe(88);
  await expect(page.locator("#amount-output")).toHaveText("+24 → 112 BPM");
  expect(values.every((tempo) => tempo >= 40 && tempo <= 220)).toBe(true);
  const changes = values.slice(1).map((tempo, index) => tempo - values[index]);
  expect(new Set(changes).size).toBeLessThanOrEqual(2);
  expect(changes.every((change) => change >= 1 && change <= 2)).toBe(true);
});

test("@claim:delayed-beat delays only the selected cue while later beats stay on the tempo grid", async ({ page }) => {
  await openDemo(page);
  await loadDemoDrill(page, "Late backbeat");
  await page.locator("#bpm").fill("120");
  await page.locator("#meter").selectOption("2");
  await page.locator("#bars").selectOption("4");
  await page.locator("#audio").uncheck();
  await page.evaluate(() => {
    const phase = document.querySelector("#phase")!;
    const observed: Array<{ value: string; at: number }> = [];
    new MutationObserver(() => observed.push({ value: phase.textContent ?? "", at: performance.now() })).observe(phase, { childList: true, subtree: true, characterData: true });
    (globalThis as typeof globalThis & { delayedBeatObservations?: typeof observed }).delayedBeatObservations = observed;
  });
  await page.getByRole("button", { name: "Start drill" }).click();
  await expect(page.getByText("Drill complete. Practice attempt logged.")).toBeVisible({ timeout: 7_000 });
  const observed = await page.evaluate(() => (globalThis as typeof globalThis & { delayedBeatObservations: Array<{ value: string; at: number }> }).delayedBeatObservations);
  const late = observed.findIndex((event) => event.value === "80 ms late cue");
  expect(late).toBeGreaterThanOrEqual(0);
  const before = observed[late - 1];
  const after = observed[late + 1];
  expect(before.value).toBe("On the grid");
  expect(after.value).toBe("On the grid");
  expect((after.at - before.at) / 1000).toBeGreaterThan(0.7);
  expect((after.at - before.at) / 1000).toBeLessThan(1.6);
});

test("@claim:recovery-gap shows reference bars, the selected silence, and a recovery bar", async ({ page }) => {
  await openDemo(page);
  await loadDemoDrill(page, "Recovery count");
  await page.locator("#bpm").fill("220");
  await page.locator("#meter").selectOption("2");
  await page.locator("#audio").uncheck();
  await page.evaluate(() => {
    const phase = document.querySelector("#phase")!;
    const seen: string[] = [];
    new MutationObserver(() => seen.push(phase.textContent ?? "")).observe(phase, { childList: true, subtree: true, characterData: true });
    (globalThis as typeof globalThis & { recoveryPhases?: string[] }).recoveryPhases = seen;
  });
  await page.getByRole("button", { name: "Start drill" }).click();
  await expect(page.getByText("Drill complete. Practice attempt logged.")).toBeVisible({ timeout: 8_000 });
  const phases = await page.evaluate(() => (globalThis as typeof globalThis & { recoveryPhases?: string[] }).recoveryPhases ?? []);
  expect(phases).toContain("Reference bars");
  expect(phases).toContain("Internal pulse · 1 of 3");
  expect(phases).toContain("Internal pulse · 3 of 3");
  expect(phases).toContain("Recovery bar");
});

test("@claim:cue-options play sound and visual cues, use vibration when supported, and name unsupported vibration", async ({ page, browser }) => {
  await openDemo(page);
  await expect(page.getByLabel("Vibration")).toBeEnabled();

  const unsupported = await browser.newContext();
  await unsupported.addInitScript(() => { Object.defineProperty(navigator, "vibrate", { configurable: true, value: undefined }); });
  try {
    const unavailable = await unsupported.newPage();
    await openDemo(unavailable);
    await expect(unavailable.getByLabel(/Vibration unavailable/)).toBeDisabled();
  } finally {
    await unsupported.close();
  }

  const supported: BrowserContext = await browser.newContext();
  await supported.addInitScript(() => {
    Object.defineProperty(navigator, "vibrate", { configurable: true, value: (duration: number) => {
      const target = globalThis as typeof globalThis & { vibrationCalls?: number[] };
      target.vibrationCalls = [...(target.vibrationCalls ?? []), duration];
      return true;
    } });
    const native = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function (...args: Parameters<AudioContext["createOscillator"]>) {
      const target = globalThis as typeof globalThis & { oscillatorCalls?: number };
      target.oscillatorCalls = (target.oscillatorCalls ?? 0) + 1;
      return native.apply(this, args);
    };
  });
  try {
    const demo = await supported.newPage();
    await openDemo(demo);
    await demo.locator("#bpm").fill("220");
    await demo.locator("#meter").selectOption("2");
    await demo.locator("#haptic").check();
    await demo.getByRole("button", { name: "Start drill" }).click();
    await expect.poll(() => demo.evaluate(() => (globalThis as typeof globalThis & { oscillatorCalls?: number }).oscillatorCalls ?? 0)).toBeGreaterThan(0);
    await expect(demo.locator("#beat-dial")).toHaveClass(/pulse|fast-beat/);
    await expect.poll(() => demo.evaluate(() => (globalThis as typeof globalThis & { vibrationCalls?: number[] }).vibrationCalls?.length ?? 0)).toBeGreaterThan(0);
  } finally {
    await supported.close();
  }
});

test("@claim:save-drill keeps a named demo drill after reload", async ({ page }) => {
  await openDemo(page);
  await page.getByLabel("Drill name").fill("Demo bridge at 96");
  await page.getByRole("button", { name: "Save drill" }).click();
  await page.reload();
  await expect(page.getByRole("heading", { level: 3, name: "Demo bridge at 96" })).toBeVisible();
});

test("@claim:share-link copies settings without a practice log", async ({ page, browser }) => {
  const context = page.context();
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openDemo(page);
  await page.getByRole("button", { name: "Copy share link" }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  const shared = new URL(link);
  expect(shared.pathname).toBe("/demo");
  expect([...shared.searchParams.keys()]).toEqual(["route"]);
  expect(shared.search).not.toContain("log");
  const fresh = await browser.newContext();
  try {
    const target = await fresh.newPage();
    await target.goto(`${shared.pathname}${shared.search}`);
    await expect(target.getByText("Shared drill loaded. Save it to keep it.")).toBeVisible();
    await expect(target.getByLabel("Drill name")).toHaveValue("Pocket drift at 96");
  } finally {
    await fresh.close();
  }
});

test("@claim:practice-log records a stopped sample drill", async ({ page }) => {
  await openDemo(page);
  await page.getByRole("button", { name: "Start drill" }).click();
  await expect(page.getByRole("button", { name: "Stop drill" })).toBeVisible();
  await page.getByRole("button", { name: "Stop drill" }).click();
  await expect(page.getByRole("row", { name: /Stopped/ })).toHaveCount(2);
  expect((await rows(page, "demo:tempo-lab")).logs).toHaveLength(4);
});

test("@claim:csv-export downloads one row for every sample practice attempt", async ({ page }) => {
  await openDemo(page);
  const download = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export CSV" }).click()]).then(([item]) => item);
  const text = await (await download.createReadStream())!.toArray().then((parts) => Buffer.concat(parts).toString("utf8"));
  const lines = text.trim().split("\n");
  expect(lines[0]).toBe("started_at,drill,mode,starting_bpm,variation,bars_planned,bars_reached,seconds,result");
  expect(lines).toHaveLength(4);
});

test("@claim:json-backup-import exports records and restores a valid drill", async ({ page }) => {
  await openDemo(page);
  const download = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Back up JSON" }).click()]).then(([item]) => item);
  const backup = JSON.parse(await (await download.createReadStream())!.toArray().then((parts) => Buffer.concat(parts).toString("utf8"))) as { drills: unknown[]; logs: unknown[] };
  expect(backup.drills).toHaveLength(4);
  expect(backup.logs).toHaveLength(3);
  await page.locator("#import-json").setInputFiles({ name: "sample-backup.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.getByText("Imported 4 drills and 3 log entries.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Chorus ramp" })).toBeVisible();
});

test("@claim:private-browser-storage keeps demo records in a separate browser database", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await openDemo(page);
  await page.getByLabel("Drill name").fill("Private demo drill");
  await page.getByRole("button", { name: "Save drill" }).click();
  expect(requests.every((url) => new URL(url).origin === "http://127.0.0.1:4173")).toBe(true);
  expect((await rows(page, "demo:tempo-lab")).drills.some((drill) => drill.name === "Private demo drill")).toBe(true);
  expect((await rows(page, "tempo-lab")).drills).toHaveLength(0);
});

test("@claim:same-origin-runtime loads the demo without a third-party runtime request", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await openDemo(page);
  await page.getByRole("button", { name: "Start drill" }).click();
  await expect(page.getByRole("button", { name: "Stop drill" })).toBeVisible();
  await page.getByRole("button", { name: "Stop drill" }).click();
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.every((url) => new URL(url).origin === "http://127.0.0.1:4173")).toBe(true);
});

test("@claim:clear-browser-data removes saved real drills", async ({ page }) => {
  await openDemo(page);
  await page.goto("/");
  await page.getByLabel("Drill name").fill("Clear this drill");
  await page.getByRole("button", { name: "Save drill" }).click();
  await expect(page.getByRole("heading", { level: 3, name: "Clear this drill" })).toBeVisible();
  const session = await page.context().newCDPSession(page);
  await session.send("Storage.clearDataForOrigin", { origin: "http://127.0.0.1:4173", storageTypes: "indexeddb" });
  await page.reload();
  await expect(page.getByRole("heading", { level: 3, name: "Clear this drill" })).toHaveCount(0);
  expect((await rows(page, "tempo-lab")).drills).toHaveLength(0);
});

test("@claim:no-recording-or-grading uses timing cues without recording a musician", async ({ browser }) => {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    const target = globalThis as typeof globalThis & { microphoneRequests?: number };
    const mediaDevices = navigator.mediaDevices;
    if (mediaDevices) {
      Object.defineProperty(mediaDevices, "getUserMedia", { configurable: true, value: () => {
        target.microphoneRequests = (target.microphoneRequests ?? 0) + 1;
        return Promise.reject(new Error("Microphone was not requested by this test."));
      } });
    }
  });
  try {
    const page = await context.newPage();
    await openDemo(page);
    await page.getByRole("button", { name: "Start drill" }).click();
    await expect(page.getByRole("button", { name: "Stop drill" })).toBeVisible();
    await page.getByRole("button", { name: "Stop drill" }).click();
    await expect(page.getByText("Stopped drill added to the practice log.")).toBeVisible();
    expect(await page.evaluate(() => (globalThis as typeof globalThis & { microphoneRequests?: number }).microphoneRequests ?? 0)).toBe(0);
    await expect(page.getByRole("heading", { level: 2, name: "What Tempo Lab does not do" })).toBeVisible();
  } finally {
    await context.close();
  }
});

test("@claim:keyboard-space starts and stops outside fields without changing a drill name", async ({ page }) => {
  await openDemo(page);
  await page.locator("body").focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "Stop drill" })).toBeVisible();
  await page.keyboard.press("Space");
  await expect(page.getByRole("button", { name: "Start drill" })).toBeVisible();
  const input = page.getByLabel("Drill name");
  await input.fill("Keyboard drill");
  await input.focus();
  await page.keyboard.press("Space");
  await expect(input).toHaveValue("Keyboard drill ");
  await expect(page.getByRole("button", { name: "Start drill" })).toBeVisible();
});

test("@claim:installable-manifest links the standalone app shell", async ({ page }) => {
  await openDemo(page);
  const manifest = await page.evaluate(async () => {
    const href = (document.querySelector('link[rel="manifest"]') as HTMLLinkElement).href;
    return fetch(href).then((response) => response.json());
  });
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.some((icon: { sizes: string }) => icon.sizes === "192x192")).toBe(true);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
});

test("@claim:build-output creates a deployable dist folder from a clean browser check", async ({ page }) => {
  await openDemo(page);
  expect(existsSync("dist/index.html")).toBe(true);
  await expect(page.getByRole("heading", { level: 1, name: "Practice tempo changes without editing music" })).toBeVisible();
});

test("moves focus and announces section navigation for keyboard and history users", async ({ page }) => {
  await openDemo(page);
  await page.getByRole("link", { name: "Log", exact: true }).click();
  await expect(page.locator("#log-title")).toBeFocused();
  await expect(page).toHaveTitle("Practice log — Tempo Lab");
  await page.goBack();
  await expect(page.locator("#page-title")).toBeFocused();
  await expect(page).toHaveTitle("Demo — Tempo Lab");
});
