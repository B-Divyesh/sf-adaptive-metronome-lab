# Tempo Lab repair 4 handoff

## Outcome

**PASS — all 24 findings in adversarial review 1 were repaired and verified.**

Implementation candidate deployed: `5d8b685d106c87382ab4d8afccc93a59d5225618` (`fix: add isolated demo and review contracts`).

Verification documentation commit: `4bcbeaea59d0cb653d87ee2ebd52e66bc2f5c7ae` (`docs: record repair verification`). This SHA marker is a report-only update and does not change the deployed implementation.

Tempo Lab is an offline metronome for musicians who want repeatable tempo-change drills without changing notation or audio. The first action is **Try it with sample data**, which opens four realistic drills and a three-attempt practice log.

## What changed

- Added a real `/demo` sandbox and `?demo=1` entry. Demo data uses the separate `demo:tempo-lab` IndexedDB namespace, seeds four named drills and three logs, shows the persistent demo label, and supports Reset demo and Start for real without changing real data.
- Added `.factory/claims.json` with 20 public claims and one outcome-based `@claim:<id>` Playwright test for each. The tests use the demo entry point and cover offline reload, timing modes, cues, saving, sharing, log/export/import, local storage, privacy, keyboard operation, manifest, and build output.
- Rewrote the first screen and product text in plain words. It now names the job, audience, first result, offline/browser/free facts, how it works, and what the app does not do.
- Added `/demo`, `/privacy`, `/terms`, offline, and designed 404 pages with route titles, metadata, shared header/footer, focus announcements, and direct navigation. The static host now returns the product 404 page with HTTP 404 instead of rewriting unknown paths to the app.
- Added canonical, Open Graph, Twitter, favicon, apple-touch, sitemap, and product social artwork metadata. Added response-header CSP and other security headers.
- Updated the PWA precache/manifest for the new routes and assets. Offline reload preserves the seeded demo after the first visit.
- Added the demo guide, copy audit, catalog description, and refreshed README. The catalog description is also at `/work/.evidence/catalog-description.txt`.

## Review reconciliation

| Review finding | Disposition and evidence |
| --- | --- |
| F-1-1 | Fixed: first screen has the required job headline, musician audience, sample action/result, and three plain facts. Fresh desktop and phone checks passed. |
| F-1-2 | Fixed: isolated seeded `/demo`, persistent label, reset, start-for-real, and `demo-isolation` claim. |
| F-1-3 to F-1-15 | Fixed: 20-entry claims registry; each listed command passed from this checkout. |
| F-1-16 | Fixed: `/demo` is real and an unknown URL returns product-styled 404 with HTTP 404. |
| F-1-17 | Fixed: route-specific title/canonical/OG/Twitter/favicon/apple icon metadata and sitemap entries. |
| F-1-18 | Fixed: hash/history changes move focus to the destination heading and announce the destination. |
| F-1-19 | Fixed: shared skip link, wordmark/nav, footer links, factory credit, and build identifier across routes. |
| F-1-20 | Fixed: landing page includes first-screen facts, live product preview, three-step How it works, and plain privacy/non-goals section. |
| F-1-21 to F-1-23 | Fixed: direct drill terminology, result-naming buttons, and visitor-focused README language. Full copy audit is in `.factory/copy-audit.md`. |
| F-1-24 | Fixed: deployed responses send a restrictive CSP with `frame-ancestors` as a response header; live console checks were clean. |

Earlier repaired history also remains covered: malformed imports are atomic, 40 BPM ramp plans stay finite, recovery includes a return bar, and mobile targets meet 44 px. The full unit/browser suite re-exercised these paths.

## Verification

Run from a clean checkout after `npm ci`:

```sh
npm test
npm run build
npm run test:e2e
npm run test:claims
```

Results for this repair:

- `npm test`: 12 passed.
- `npm run build`: passed; `dist/index.html` exists. App JS is 30.86 kB raw / 10.75 kB gzip; CSS is 17.67 kB raw / 4.69 kB gzip.
- `npm run test:e2e`: passed (67 passed, one intentional duplicate mobile skip).
- All 20 exact commands declared in `.factory/claims.json` passed individually from the clean checkout; `npm run test:claims` is the combined convenience command.
- `npm audit --omit=dev`: 0 vulnerabilities.
- Local Static Web Apps emulator: `/demo` 200; an unknown route returned the designed 404 with HTTP 404; `verify-url.sh` passed.
- Axe via `@axe-core/playwright`: 0 serious or critical violations at `/`, `/demo`, `/privacy/`, `/terms/`, and an unknown route. (The standalone axe CLI has no system Chrome in this worker; the Playwright axe integration used the installed browser.)
- Local Lighthouse: Performance 100, Accessibility 100, Best Practices 100, SEO 100; LCP 1314 ms, CLS 0.000, TBT 0 ms.
- Production cold check at `https://adaptive-metronome-lab.sociobot.in`: new desktop and 390 px phone contexts passed the first-screen, sample data, banner, populated output, no-overflow, and no-console-error checks. A dedicated fresh context reloaded `/demo` offline after service-worker control and retained the sample. The live unknown route returned the designed 404 and HTTP 404.
- Live `verify-url.sh`: HTTP 200; title, `lang`, one H1, main landmark, alt text, labeled buttons, and no console errors passed. Live Axe results were 0 serious/critical violations on all public routes.
- SHA-256 comparison of live versus `dist/` matched for `index.html`, `assets/app.js`, `assets/app.css`, `sw.js`, `manifest.webmanifest`, and `404.html`.

## Run and deploy

```sh
npm ci
npm run dev
npm test
npm run build
```

Deploy the contents of `dist/` to the domain root with the supplied `staticwebapp.config.json`. This repair was deployed to the production product with the existing durable static deployment configuration; no stateful backend or external service is used.

## Demo and privacy

Use `/demo` or `/?demo=1` to open the sample. Reset only clears the demo namespace. Start for real discards the demo namespace and opens the separate real-data namespace. See `.factory/demo.md` for the sample contents and storage details.

Drills and logs stay in the browser unless the user exports a file or copies a settings-only share link. Tempo Lab does not request microphone access, record playing, grade performance, edit notation, or edit audio. See `/privacy` and `/terms`.

## Known gaps

None known. The product intentionally has no backend, account, payments, cloud sync, or AI feature because those are outside the researched offline practice-tool scope.
