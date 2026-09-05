# Independent verification 4 — Repeatable tempo-change drills

Verified on 5 September 2026 against implementation candidate `5d8b685d106c87382ab4d8afccc93a59d5225618`, documentation baseline `9e3863b10eebda8f2224f7fa1015b4b975712710`, and <https://adaptive-metronome-lab.sociobot.in>.

## Verdict: FAIL

**FAIL — 7 findings and 7 untested or incompletely tested public claim outcomes.**

The product works end to end in the exercised live and local paths. It creates repeatable tempo-change drills for musicians. The first action is **Try it with sample data**. However, the claim contract requires every public promise to have a claim entry and an outcome-based tagged test. Several public data-handling promises are missing from the registry or only partially asserted. The live app also retains the earlier short-lived, fixed-name asset caching limitation.

No product code was changed during this verification.

## Findings

### F-4-1 — High — the JSON restore test does not prove restoration

The public claim says Tempo Lab “backs up and imports drills and practice attempts as JSON.” The tagged test downloads the four drills and three attempts, but imports them back into the same already-populated demo. It then checks the success message and the pre-existing **Chorus ramp** heading. It never removes the records or compares IndexedDB after import. A no-op importer that still displayed the message would pass this test.

This also leaves earlier review finding F-1-10 only partly resolved. That finding specifically required the import test to compare restored records.

Required repair: clear both demo stores without reloading, import the downloaded file, and assert the exact drills and practice attempts in IndexedDB and the rendered UI. Keep invalid-import atomicity as a separate regression.

### F-4-2 — Medium — two public individual-deletion claims are absent from the registry

The live privacy page says, “You can delete individual drills and practice attempts in the app.” The interface exposes **Delete drill** and per-row delete-log controls, but `.factory/claims.json` has no claim or tagged outcome test for either operation. Manual live checks confirmed both controls currently work, reducing product risk but not satisfying the repeatable claim contract.

Required repair: add separate claim entries and tests for deleting one drill without deleting its log, and deleting one practice attempt without changing drills or other attempts.

### F-4-3 — Medium — demo disposal is not asserted after “Start for real”

README and `.factory/demo.md` say **Start for real** clears `demo:tempo-lab`. The `demo-isolation` test clicks that action and verifies the real database, but never inspects the demo database afterward. Its own sandbox description says to compare both namespaces.

Required repair: after leaving the demo, inspect `demo:tempo-lab` and assert both stores are empty while `tempo-lab` is unchanged.

### F-4-4 — Medium — the completed-attempt half of the practice-log claim is not asserted by its tagged test

The declared claim says stopped **and completed** drills are added to the practice log. Its tagged test starts and immediately stops one drill, then checks only the stopped row and log count. Other mode tests reach completion, but the exact `practice-log` claim command does not assert that a completed attempt was stored with complete status.

Required repair: exercise and inspect one stopped attempt and one completed attempt in the `@claim:practice-log` test, or split them into separate claims.

### F-4-5 — Medium — clearing site data is not tested for practice attempts

The claim says clearing browser site data removes saved drills and practice attempts. The tagged test creates and checks only a drill, clears IndexedDB, and checks only the drills store. It never creates or inspects a practice attempt.

Required repair: create both record types, clear site data, reload, and assert both stores and both rendered collections are empty.

### F-4-6 — Medium — the “no device identifier” share claim is not registered or asserted

README and `/privacy/` say a share link has no device identifier. The registered share claim mentions settings and no practice log. Its test checks the single `route` query key and that the URL does not contain the literal word `log`, but it does not decode the route payload or assert the allowed fields. An encoded extra identifier would pass.

Required repair: include the device-identifier promise in the claim registry and decode the payload in its tagged test, asserting the exact allowed key set and values.

### F-4-7 — Low — production assets do not use immutable, content-hashed caching

The live JavaScript and CSS are fixed paths (`/assets/app.js`, `/assets/app.css`) served with `Cache-Control: public, must-revalidate, max-age=30`, not content-hashed immutable assets. The versioned service-worker cache and controlled-update regression both pass, so this did not break offline or update behavior. It remains the caching gap recorded by verification 2 and verification 3 and does not meet the supplied performance caching guidance.

Required repair: emit content-hashed asset filenames and send long-lived immutable caching for those files while keeping the service worker uncacheable.

## Declared claim commands

All 20 declared commands were run individually after `npm ci` from the clean worktree. Every command exited successfully. That does not cure the incomplete assertions above.

| Claim | Result |
| --- | --- |
| `demo-isolation` | PASS — 2 projects |
| `free-to-use` | PASS — 2 projects |
| `offline-reload` | PASS — desktop; intentional mobile duplicate skipped |
| `drift-replay` | PASS — 2 projects |
| `tempo-ramp` | PASS — 2 projects |
| `delayed-beat` | PASS — 2 projects |
| `recovery-gap` | PASS — 2 projects |
| `cue-options` | PASS — 2 projects |
| `save-drill` | PASS — 2 projects |
| `share-link` | PASS — 2 projects |
| `practice-log` | PASS command; incomplete completion assertion (F-4-4) |
| `csv-export` | PASS — 2 projects |
| `json-backup-import` | PASS command; ineffective restore assertion (F-4-1) |
| `private-browser-storage` | PASS — 2 projects |
| `clear-browser-data` | PASS command; practice-attempt half untested (F-4-5) |
| `same-origin-runtime` | PASS — 2 projects |
| `no-recording-or-grading` | PASS — 2 projects |
| `keyboard-space` | PASS — 2 projects |
| `installable-manifest` | PASS — 2 projects |
| `build-output` | PASS — 2 projects |

The combined `npm run test:claims` run also passed: 39 passed and one intentional mobile duplicate skipped. Each of the 20 IDs occurs exactly once in `tests/claims.spec.ts`.

## Clean-checkout quality gates

The worktree started clean at `9e3863b`. The only change from the implementation candidate to that documentation baseline was `.factory/handoff.md`; no later product artifact existed.

```text
npm ci                 PASS — 61 packages; 0 vulnerabilities
npm test               PASS — 12/12 Vitest tests
npm run build          PASS — dist/index.html produced
npm run test:e2e       PASS — 63 passed, 5 intentional project skips
npm run test:claims    PASS — 39 passed, 1 intentional project skip
npm audit --omit=dev   PASS — 0 vulnerabilities
verify-url.sh (live)   PASS — title/lang/H1/main/alt/buttons/console
```

Production size: 30,862 B JavaScript raw / 10.75 kB gzip; 17,670 B CSS raw / 4.69 kB gzip; 25,956 B mobile hero. These are within the supplied 200 kB JS, 50 kB CSS, and 300 kB mobile-image budgets.

Live mobile Lighthouse 13.0.1 scored Performance 100, Accessibility 100, Best Practices 100, and SEO 100. FCP was 0.9 s, LCP 1.1 s, TBT 0 ms, and CLS 0.

## Live browser evidence

Fresh Chromium contexts were used at 1440×900 and 390×844.

- Before scrolling, both sizes showed the job **Practice tempo changes without editing music**, named musicians as the audience, and showed **Try it with sample data**. The action ended at CSS y=790.8 on desktop and y=703.0 on phone.
- The sample opened in one click with a persistent demo label, four named drills, and three realistic practice attempts.
- A real drill was seeded separately. A demo-only save appeared only in `demo:tempo-lab`; reset restored four drills and three attempts; **Start for real** returned to the unchanged real drill.
- All-cues-off showed the recovery instruction. Turning Visual back on allowed start, stop, and log creation.
- A malformed log import changed neither demo store, and reload remained usable. A 40 BPM ramp was clamped to a finite supported destination.
- Space started and stopped outside fields. The skip link had a visible solid focus ring. Hash navigation focused the destination heading and changed the route title.
- The 390 px page had zero horizontal overflow and every visible link/button measured at least 44×44 CSS px. Reduced motion matched and used automatic rather than smooth scrolling.
- Fresh service-worker control followed by offline mode and reload retained the demo and showed **Offline · practice available**.
- Request capture during normal use was same-origin only. Desktop and phone runs had no console or page errors.
- Manual live deletion reduced the demo stores from four drills/three attempts to three/two, confirming the current controls work despite F-4-2's missing regression coverage.

Evidence screenshots and machine reports are under `/work/.evidence/`, including `live-desktop-first-screen.png`, `live-phone-first-screen.png`, `verify-url/verify.json`, and `lighthouse-live-mobile.json`.

## Routes, accessibility, metadata, and 404

| Route | HTTP | Title | H1 | Axe serious/critical |
| --- | ---: | --- | --- | ---: |
| `/` | 200 | Tempo Lab — practice tempo changes | Practice tempo changes without editing music | 0 |
| `/demo` | 200 | Demo — Tempo Lab | Practice tempo changes without editing music | 0 |
| `/privacy/` | 200 | Privacy — Tempo Lab | Privacy | 0 |
| `/terms/` | 200 | Terms — Tempo Lab | Terms | 0 |
| unknown path | 404 | Page not found — Tempo Lab | Page not found | 0 |

All routes had `lang=en`, one H1, one main landmark, route-specific metadata, canonical links, Open Graph/Twitter metadata, favicon, and apple-touch icon. The social image is 1200×630. All discovered links returned 200, apart from the deliberate unknown-path 404. The live CSP is a response header and includes `frame-ancestors 'none'`; no CSP console errors occurred.

## Candidate and deployment identity

The live artifact matched the fresh local build byte for byte for `index.html`, `assets/app.js`, `assets/app.css`, `sw.js`, `manifest.webmanifest`, `404.html`, both legal pages, the social image, icons, robots file, and sitemap. Representative SHA-256 values:

| File | SHA-256 local = live |
| --- | --- |
| `index.html` | `da70ca9e2947fc996667ce85f640587ad4ffb518e762fc4c7d0e43e41c9662ac` |
| `assets/app.js` | `b8cd0d78ed80e57024e55d5572f981912db695145fc9b5de25a58de2921f5fe0` |
| `assets/app.css` | `ef9b3071c6d6fba54b67a199ecc8a93679112dbf38b9220f1059cfc33aee08f4` |
| `sw.js` | `4bcf5d979782fe95fd1615dd4c455252c33317b4adbe010992672ca9f7549698` |

`origin/main` and the starting checkout both resolved to documentation SHA `9e3863b`. The implementation under review remains `5d8b685`; later commits are report-only.

## Earlier finding disposition

| Earlier item | Current disposition |
| --- | --- |
| Verification 1: installed PWA could not update | Fixed. The controlled-prior-client regression passed in the full suite; offline reload also passed live. |
| Verification 1: out-of-range shared/imported settings | Fixed. Boundary validation tests and the full suite passed. |
| Verification 2: malformed log import could brick startup | Fixed. Atomic invalid-import and reload checks passed locally and live. |
| Verification 2: zero-BPM/infinite ramp | Fixed. All unit combinations passed; the live 40 BPM boundary stayed finite. |
| Verification 2: recovery could end before recovery bar | Fixed. Recovery planner/browser coverage passed. |
| Verification 2: sub-44 px mobile targets | Fixed at the required 390 px viewport; fresh measurement found none. |
| Verification 2/3: fixed-name short-cache assets | Still present; recorded as F-4-7. |
| Review F-1-1 | Fixed: job, audience, first action, result, and three facts are present. |
| Review F-1-2 | Runtime isolation/reset is fixed; disposal assertion remains incomplete as F-4-3. |
| Review F-1-3 | Registry and 20 tags exist, but coverage is incomplete as F-4-1 through F-4-6. |
| Review F-1-4 to F-1-9 | Fixed: offline/install, drift, ramp, delay, recovery, and cue commands passed. |
| Review F-1-10 | Runtime features work, but JSON restore proof remains incomplete as F-4-1. |
| Review F-1-11 | Storage isolation and same-origin runtime passed; deletion and identifier assertions remain incomplete as F-4-2, F-4-5, and F-4-6. |
| Review F-1-12 to F-1-15 | Fixed: no-recording, same-origin, build, and keyboard claims passed. |
| Review F-1-16 | Fixed: `/demo` is distinct and unknown paths return the designed HTTP 404. |
| Review F-1-17 to F-1-20 | Fixed: metadata, routing focus, shared shell, and landing structure passed. |
| Review F-1-21 to F-1-23 | Fixed: current copy uses direct drill terminology and result-naming actions. |
| Review F-1-24 | Fixed: restrictive CSP is present as a live response header. |

Backend tenant, restart, health, and 429 checks do not apply: this is a static local-first PWA with no backend. CLI, library, and desktop consumer-install checks also do not apply.

## Acceptance condition

Do not declare PASS until all seven untested or incompletely tested public claim outcomes have exact claim coverage and the fixed-name caching gap is resolved or the performance contract is explicitly revised. Re-run every declared claim command, the full gates, live route/Axe/offline checks, Lighthouse, and artifact hash comparison after repair.
