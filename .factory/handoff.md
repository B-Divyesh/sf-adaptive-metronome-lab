# Tempo Lab v1 handoff — verification FAIL

## Verification status (2026-08-28)

**FAIL for candidate `cca26b57f1614d15a6f6bd8da5237d9398b2436b` at `https://adaptive-metronome-lab.sociobot.in`.** Fresh installs, core drills, local persistence, exports, accessibility, mobile, privacy, and offline reload pass. However, an already-installed PWA remains served the old cache-first `/assets/app.js` because this candidate changes the app bundle without changing the fixed `tempo-lab-v1` service-worker cache/version or application URLs. The candidate's high-tempo visual-cue fix therefore does not reach existing PWA users. A share/import route can also bypass all mode amount limits (for example, drift `±999 BPM`).

Exact reproduction, hashes, all commands/results, passing evidence, and required retest are in [`.factory/verification.md`](verification.md). No product source was changed by verification.

Required before release: version the service-worker/app cache per release (or content-hash asset URLs) and test a controlled prior client upgrading on the same origin; validate imported/shared amount ranges by mode.

---

Build work order: `adaptive-metronome-lab-build-1`

Completed: 2026-08-28

Artifact: static offline-first PWA (`dist/`)

## What shipped

- Four functional adaptive metronome modes:
  - bounded, seeded random drift that changes every two bars;
  - linear positive or negative tempo ramps;
  - delayed final beats every second bar without moving the base grid;
  - configurable silent recovery gaps with an accented return bar.
- Web Audio scheduling with a 25 ms scheduler loop and 150 ms look-ahead, separate from visual rendering.
- Sound, animated visual, and supported-device vibration cues; no microphone use.
- Bar/meter, BPM, intensity, and session-length controls with live route preview and estimated duration.
- Multiple named presets with fresh deterministic seeds, IndexedDB persistence, load/delete, and settings-only share URLs.
- Attempt logging for completed and intentionally stopped drills, including variation, bars reached, time, and outcome.
- CSV log export and full JSON preset/log backup and import.
- Installable PWA manifest, 192/512 maskable icons, versioned app-shell service worker, runtime caching, offline fallback, update toast, and network-state language.
- Responsive 390px layout, keyboard-accessible native controls, global Space transport shortcut outside form controls, visible focus treatment, and reduced-motion fallback.
- First-class loading, empty, invalid-share, storage/audio error, offline, and unsupported-vibration states.
- Static `/privacy/` and `/terms/` pages, MIT license, complete README, robots.txt, and sitemap.
- Original generated art-deco transit-poster hero with full source/prompt provenance. Responsive WebP files are 26 KB and 81 KB.

## Product and visual decisions

The product is framed as a “tempo railway”: every drill is a repeatable route and the current beat is a station. The single-mode midnight-ink, cream-paper, brass, coral, and mint system avoids a generic dashboard appearance while keeping controls legible during practice. Full rationale, tokens, type, spacing, motion, prompt, review, and provenance are in `.factory/design.md`.

No external fonts, scripts, analytics, accounts, payment code, or runtime APIs are used. All application data stays in the browser unless the user exports it or copies a settings-only share link.

## How to run and verify

```sh
npm ci
npm test
npm run build
npm run test:e2e
npm run preview
```

The exact production command is `npm run build`; output lands in `dist/`, with `dist/index.html` at the root.

Verified locally on 2026-08-28:

- `npm test`: 6/6 deterministic planner tests passed.
- `npm run build`: passed; Vite 7.3.6 production output created in `dist/`.
- `npm run test:e2e`: 8 passed, 2 intentionally skipped duplicate project checks. Covered desktop and 390px mobile save/reload, native-keyboard mode selection, no horizontal overflow, real Web Audio start/stop/log flow, axe WCAG 2 A/AA scan, and Chromium offline reload after service-worker installation.
- `npm audit`: 0 vulnerabilities.
- `/opt/fleet/lib/verify-url.sh`: HTTP 200, 520 ms local load, no console/page errors, `lang=en`, title present, exactly one H1, main landmark present, 0 images missing alt, 0 unlabeled buttons.
- Browser visual smoke test: 1440×1000 and 390×844 full-page captures; no horizontal overflow at 390px.

### Lighthouse mobile (local production preview)

Measured with Lighthouse 13.4.1 and headless Chromium:

| Category / metric | Result |
| --- | ---: |
| Performance | 100 |
| Accessibility | 100 |
| Best practices | 100 |
| SEO | 100 |
| First Contentful Paint | 0.9 s |
| Largest Contentful Paint | 1.4 s |
| Total Blocking Time | 0 ms |
| Cumulative Layout Shift | 0 |
| Speed Index | 0.9 s |

Production budgets: initial JS 24.4 KB uncompressed (8.9 KB gzip), CSS 14.9 KB uncompressed (4.2 KB gzip), no fonts, mobile hero 26.0 KB WebP. These are below the 200 KB JS, 50 KB CSS, 120 KB font, and 300 KB hero limits.

## Known gaps and next steps

- Vibration depends on browser and device support; the option is visibly disabled where `navigator.vibrate` is unavailable.
- Web Audio output latency varies with hardware and browser. Scheduling is deterministic, but no product can remove device-level output latency; users should avoid Bluetooth when precise audible latency matters.
- Browser/PWA uninstall or clearing site data can erase IndexedDB. JSON backup is provided; cloud sync is intentionally out of v1 scope.
- No AI listening assessment or notation/audio-file editing is included, matching the explicit non-goals.
- A useful beta follow-up is a local, opt-in dashboard showing whether a user has replayed three saved drills within 30 days, without transmitting activity.
