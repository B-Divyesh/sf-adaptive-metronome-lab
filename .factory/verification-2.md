# Independent verification 2 — FAIL

Verified on 2026-08-28 against candidate commit `d06e86d5f29f1f4769d6c99e1c6ef6e5bd1b87a5` and <https://adaptive-metronome-lab.sociobot.in>.

## Decision

**FAIL.** The live deployment is the candidate and the normal PWA, privacy, accessibility, build, offline, and performance checks pass. However, invalid practice-log data accepted through the supported JSON import can persistently prevent the app from loading, a valid ramp-control boundary produces a zero-BPM/infinite route, and valid recovery controls can complete without a recovery bar. These violate the brief's functional, controlled-drill and invalid-input recovery requirements.

## Defects

### High — an invalid JSON log import is persisted and bricks the practice room on reload

The importer validates only that each log has string `id` and `startedAt` properties. It writes those logs before rendering validates their other fields, and startup performs no log validation. A malformed record therefore survives the displayed import error and breaks every later startup.

Fresh reproduction on both the production build and the live URL in isolated Chromium contexts:

1. Import this file through **Import JSON**:

   ```json
   {"drills":[],"logs":[{"id":"bad-log","startedAt":"not-a-date"}]}
   ```

2. Tempo Lab displays `That file is not a valid Tempo Lab JSON backup.`
3. Inspecting IndexedDB before reload shows the exact `bad-log` record was nevertheless stored.
4. Reload. The page reports `TypeError: Cannot read properties of undefined (reading 'replace')` and remains permanently at `Opening the practice room…`.

The user has no in-product recovery because the import controls never render. Clearing all site data recovers the app but can destroy the user's legitimate saved drills and logs. The unsafe validation/write path is at `src/main.ts:278-291`, the non-atomic writes are at `src/storage.ts:40-43`, and the startup/render failure is exposed at `src/main.ts:108-110` and `src/main.ts:319-332`.

Required fix: validate every `PracticeLog` field and date before any write, import drills/logs atomically in one IndexedDB transaction, and validate/quarantine legacy invalid log records during startup. Add a reload regression test proving malformed input does not alter stored data or prevent rendering.

### Medium — valid ramp controls create a zero-BPM, infinite session

Fresh reproduction on local production and live:

1. Choose **Tempo ramp**.
2. Set the valid starting-tempo minimum, `40 BPM`.
3. Set the valid destination-change minimum, `-40`.

The UI renders `-40 → 0 BPM`, `About Infinity:NaN`, and `0:00 / Infinity:NaN`. The final planned beat is exactly 0 BPM, so scheduling cannot finish normally. Both values are accepted by the visible controls and `validateDrill`; the combination is not bounded. Relevant logic is at `src/drill.ts:9-13`, `src/drill.ts:35-38`, and `src/drill.ts:62-65`.

Required fix: constrain the ramp destination to a positive, practice-safe supported tempo (preferably the advertised 40–220 BPM domain), update the dependent control range when starting BPM changes, validate imported/shared combinations, and add cross-field boundary tests.

### Medium — a valid recovery drill can end before its advertised recovery bar

Fresh reproduction on local production and live:

1. Choose **Recovery gap**, `4` silent bars, `4` total bars, and `2/4` at `220 BPM`.
2. Start the visual-only drill and let it complete.

The route description promises `gives two reference bars, 4 silent bars, then a recovery bar`, but observed phases are only `Reference bars`, `Internal pulse · 1 of 4`, and `Internal pulse · 2 of 4`; the route then logs Complete. The allowed four-bar session is shorter than the seven bars required for this cycle. Similar incompatible combinations exist for 2–4 silent bars.

Required fix: ensure recovery-drill length always includes at least one full `2 reference + N silent + 1 recovery` cycle, or reject/adjust incompatible length and silence combinations. Add every supported amount/length combination to planner tests.

### Low — several 390px touch targets are below 44×44 CSS px

Independent bounding-box measurement found the home link at 151.8×40, the Log navigation link at 41.4×44, the empty-state `Build the first route` link at 133.4×17, and footer Privacy/Terms links at about 45.9×16 and 38.1×16. This misses the attached accessibility/design baseline for touch targets. The primary transport passed at 350×49.9.

## Clean-checkout and automated evidence

The worktree began clean at the requested commit. `origin/main` and a fresh `git ls-remote` both resolved to `d06e86d5f29f1f4769d6c99e1c6ef6e5bd1b87a5` before report changes.

Commands and results:

```text
npm ci                 PASS — 61 packages installed, 0 audit findings
npm test               PASS — 8/8 Vitest tests
npm run build          PASS — tsc --noEmit && vite build; dist/ produced
npm run test:e2e       PASS — 13 passed, 3 intentional duplicate-mobile skips
npm audit --omit=dev   PASS — 0 vulnerabilities
```

There is no standalone lint script. The available TypeScript check is part of the exact production build and passed.

## Independent functional exercise

- Exercised all four modes and every advertised amount endpoint: drift 1/20 BPM, ramp -40/+60, delay 20/180 ms, and recovery 1/4 silent bars.
- Completed and logged a visual-only 220 BPM, 4-bar, 2/4 drift route; started/stopped and logged delayed-beat routes on desktop and live 390px mobile.
- With all cues disabled, Start showed the explicit cue-required error; re-enabling Visual recovered and playback started.
- Saved a name containing `<`, `>`, and `&`, verified safe rendering and persistence after reload.
- A valid settings-only delayed-beat share link replayed name, 137 BPM, 170 ms, 24 bars, and 7/4 in a fresh page; its only query key was `route`.
- CSV export downloaded a correctly quoted record and header. JSON backup parsed with product/version/export timestamp/drill/log keys and the expected log count.
- Existing automated adversarial coverage also rejected out-of-range shares, mixed invalid drill imports, and invalid legacy drill records; the fresh malformed-log case above exposes the missing parallel validation for logs.

## Accessibility, keyboard, desktop, and mobile

- Independent axe WCAG 2 A/AA scans against both local production and live found **0 serious or critical** violations.
- `/opt/fleet/lib/verify-url.sh` found title, `lang=en`, one H1, a main landmark, no missing image alt, no unlabeled button, and no normal-load console/page errors. Load observations were 549 ms local and 632 ms live.
- Keyboard-only smoke confirmed Arrow navigation for the mode radio group, Space start/stop outside form fields, native Space entry inside a text field, and no trap. First Tab exposed the skip link at `(16,12)`, 201.9×48.8, with a visible 3 px mint outline.
- At 390×844 there was 0 px horizontal overflow, core delayed-beat playback worked, and the primary target was 350×49.9. Desktop and 390px full-page screenshots were visually reviewed with no overlap or clipped core content.
- Under `prefers-reduced-motion: reduce`, the media query matched, scroll behavior was `auto`, transitions reduced to `0.00001s`, and a 220 BPM cue used the steady `fast-beat` state rather than a pulse.

## PWA, offline, update, privacy, and live identity

- The exact repository PWA update regression passed: a controlled prior client received the generated worker, displayed the update notice, cached the current app shell, and reloaded without the prior-shell marker.
- Fresh live install registered and controlled `https://adaptive-metronome-lab.sociobot.in/sw.js`, using cache `tempo-lab-5488cd8c8745728a`. An offline reload retained the complete practice room and displayed `Offline · practice available`.
- The manifest is served as `application/manifest+json`, declares standalone display, versioned start URL, matching theme/background colors, and 192/512 PNG icons; the 512 icon includes maskable purpose.
- Normal local and live browser captures made only same-origin requests (12 local and 8 live in the recorded sessions). Source/runtime review found no analytics, CDN fonts/scripts, account, microphone, payment, or runtime API calls. User data remains in IndexedDB except for explicit export/share actions.
- Live headers include HSTS, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Permissions-Policy: camera=(), geolocation=(), microphone=()`. No CSP is present; this is a hardening observation, not a verdict driver.

Live and local SHA-256 hashes matched exactly:

| Path | SHA-256 |
| --- | --- |
| `/` and `/index.html` | `bcfc6b6fa677c3ba48f28f8be2708fe144e51bf642050d5b69959d6538c246cc` |
| `/assets/app.js` | `baf34fbad0fdf3586f4543fdf4bb99b6ebd16b075dfc31a0bf7b112804ad9401` |
| `/assets/app.css` | `8f783b565dd066bb80558b694fe6d77d07210cc3c09e856a7edca0aea4db6b9d` |
| `/sw.js` | `796fbdcf0624ff5bf4031a50649d4d5c067ca8655321119ea6697427ebd21648` |
| `/manifest.webmanifest` | `a5075f1dc72e99e1ac9423dc93a867db126cd75c16121f0f32a4b9dc01b163ee` |
| `/privacy/` | `138f2eb996b1df63c93c44a6fe11a6919b161f91b853206a9f19a1dc1b81ac4e` |
| `/terms/` | `eebe5d1e0d58dc4cd68a43f6ce5ca6bbd6f005561d6c03147a7c73b8749677cd` |

This proves the tested live app is the candidate artifact, in conjunction with `origin/main` resolving to the candidate.

## Performance, caching, and budgets

- Fresh local mobile Lighthouse 13.4.1: **96 performance, 100 accessibility, 100 best practices, 100 SEO**; FCP 1.557 s, LCP 1.766 s, TBT 205 ms, CLS 0, Speed Index 1.616 s.
- Production JavaScript is 24,902 B raw / 9,115 B gzip (budget 200 KB); CSS is 14,916 B raw / 4,192 B gzip (budget 50 KB); no fonts are downloaded. Mobile hero is 25,956 B and desktop hero 80,744 B (mobile-image budget 300 KB).
- `sw.js` is correctly `no-cache, no-store, must-revalidate`; the generated worker and cache name are content-versioned. Other live responses use `public, must-revalidate, max-age=30` with fixed asset URLs rather than immutable hashed HTTP assets. Update/offline behavior passed, but immutable hashed assets remain a non-blocking optimization opportunity.

## Retest requirements

After repair, repeat malformed-log import and reload with existing valid data present; assert no records change and the app remains usable. Test all ramp start/change pairs for finite, positive destinations and all recovery amount/length pairs for an actual recovery phase. Repeat the clean gates, byte identity, controlled PWA upgrade, offline reload, live axe scan, and 390px target measurements.
