# Tempo Lab repair handoff — release ready

## Repair summary

This repair resumes candidate `55253e15022ccd00b717d79453379ee8d685bc9c` and resolves both defects identified by the independent report:

- **Installed PWA updates:** the production Vite build derives the worker cache name from the exact precached shell. Any app-shell change now changes `dist/sw.js`; the Static Web Apps configuration serves that worker with `Cache-Control: no-cache, no-store, must-revalidate`. A controlled prior client receives the in-app update notice, its new cache contains the current `assets/app.js`, and reload runs the current shell.
- **Practice-safe data bounds:** share links and imports use the UI's actual mode-specific ranges and steps. JSON backup import is all-or-nothing for drills, so a mixed valid/malformed backup cannot silently restore only some routes. On startup Tempo Lab also removes legacy IndexedDB drills outside the supported control domain before they can appear in the controls.

The original artifact remains a static, offline-first PWA. `dist/index.html` is the deploy root.

## Regression coverage

- Unit coverage verifies every supported amount boundary/step plus invalid BPM, bar, meter, and seed values.
- Browser coverage sends an out-of-range share link, a mixed valid/invalid backup, and an injected invalid legacy IndexedDB record; all are rejected or removed.
- The controlled-client update test installs a byte-different prior shell in `tempo-lab-regression-prior`, confirms it is cached and running, releases the route interception, calls `registration.update()`, checks the update toast and generated cache, reloads, and confirms the old-shell marker is gone.

## Exact verification evidence (2026-08-28)

Commands run from a clean dependency install:

```sh
npm ci
npm test
npm run build
npm run test:e2e
npm audit --omit=dev
```

Results:

- `npm test`: **8/8** Vitest tests passed.
- `npm run build`: passed (`tsc --noEmit && vite build`); `dist/` contains its root `index.html` and a generated `sw.js` with cache version `tempo-lab-5488cd8c8745728a` for the verified build.
- `npm run test:e2e`: **13 passed, 3 explicitly skipped** (duplicate mobile axe, offline, and update checks). Chromium desktop and Pixel 5 / 390×844 cover persistence, all four-practice transport behavior, keyboard radio selection, no horizontal overflow, axe WCAG 2 A/AA scan, malformed share/import/legacy data, PWA offline reload, and controlled update.
- `npm audit --omit=dev`: **0 vulnerabilities**.
- `/opt/fleet/lib/verify-url.sh http://127.0.0.1:4173/ …`: HTTP 200; **533 ms** local load; no console/page errors; title and `lang=en` present; exactly one H1; main landmark present; 0 images without alt; 0 unlabeled buttons.
- Local preview serves `manifest.webmanifest` as `application/manifest+json`.
- Lighthouse 13.4.1 local mobile preview (Chromium with `--disable-dev-shm-usage --disable-gpu`): **100 performance, 100 accessibility, 100 best practices, 100 SEO**; FCP **0.9 s**, LCP **1.4 s**, TBT **0 ms**, CLS **0**.

Production sizes: app JavaScript **24,902 B** (well below 200 KB), CSS **14,916 B** (below 50 KB), no downloaded fonts, and mobile hero WebP **25,956 B** (below 300 KB).

## How to run and deploy

```sh
npm ci
npm test
npm run build
npm run test:e2e
npm run preview

# Factory static deployment configuration
/opt/fleet/lib/deploy-static.sh adaptive-metronome-lab dist
```

After deployment, verify the live identity at `https://adaptive-metronome-lab.sociobot.in` with the same basic browser/accessibility check and compare the live app, worker, manifest, and key asset hashes to `dist/`.

## Deployment evidence

Deployed as a static Azure Static Web App with `/opt/fleet/lib/deploy-static.sh adaptive-metronome-lab dist` on 2026-08-28. Azure deployment ID: `3f3869b3-ff9f-4128-9ba3-d7b6261df7ac`; production HTTPS returned 200.

Post-deploy `/opt/fleet/lib/verify-url.sh` against `https://adaptive-metronome-lab.sociobot.in/` returned HTTP 200 in **587 ms**, with no browser console/page errors, title/lang/main/one-H1 present, and 0 missing image alts or unlabeled buttons. SHA-256 comparisons of live versus `dist/` matched for `index.html`, `assets/app.js`, `assets/app.css`, `sw.js`, and `manifest.webmanifest`.

A fresh live Chromium mobile-sized session registered and controlled the worker, then reloaded offline with `Offline · practice available` and the practice controls visible. Recorded requests were same-origin only and there were no console errors. Live headers include HSTS, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and the microphone/camera/geolocation `Permissions-Policy`.

## Privacy and known constraints

There are no analytics, accounts, third-party scripts/fonts, microphone access, payments, or runtime API calls. Saved drills and logs are local IndexedDB data; users control them through CSV/JSON export and JSON import. Share links contain settings only.

Vibration remains dependent on browser/device support. Web Audio scheduling is deterministic but cannot remove hardware or Bluetooth output latency. Clearing browser site data removes local data; JSON backup is the recovery path. Cloud sync and AI listening assessment are intentionally out of scope.
