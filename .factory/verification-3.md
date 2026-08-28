# Independent verification 3 — PASS

Verified on 2026-08-28 against candidate commit `0c8af33031eb6a056c131cc4ed988647ada09afb` and the live product at <https://adaptive-metronome-lab.sociobot.in/>.

## Decision

**PASS.** This is a production-ready, local-first adaptive metronome matching the researched brief: bounded seeded drift, finite tempo ramp, delayed beat, and repeatable recovery drills; named local presets; settings-only sharing; practice-log exports; and functional offline use. The previous verifier's malformed-log persistence, zero-BPM ramp, incomplete recovery-cycle, and 390px target defects are fixed in the tested artifact.

`origin/main`, the clean checkout `HEAD`, and a fresh `git ls-remote origin refs/heads/main` all resolved to the candidate SHA. Fresh production build bytes match the live deployment exactly for the app shell, JavaScript, CSS, worker, manifest, and legal pages (hashes below), so the live results apply to this candidate.

## Defects by severity

- **Critical:** none.
- **High:** none.
- **Medium:** none.
- **Low:** none that block release.

Non-blocking deployment hardening observations: the static host supplies no Content-Security-Policy, and fixed-name `/assets/app.js` and `/assets/app.css` use `Cache-Control: public, must-revalidate, max-age=30` rather than immutable hashed-asset caching. The versioned service-worker cache (`tempo-lab-8a79f76c126e377e`) precaches the entire shell and cache-first asset behavior/offline reload passed, so neither observation prevented the PWA from meeting its offline requirement.

## Clean-checkout gates

The worktree was clean at the candidate before verification. Commands run from that checkout:

```text
npm ci                 PASS — 61 packages installed; 0 audit findings
npm test               PASS — 12/12 Vitest tests
npm run build          PASS — tsc --noEmit && vite build; dist/ produced
npm run test:e2e       PASS — 22 passed; 4 intentional duplicate-mobile skips
npm audit --omit=dev   PASS — 0 vulnerabilities
```

There is no lint script. `tsc --noEmit` is included in the exact production build and passed. `npm run` exposes only `dev`, `build`, `preview`, `test`, and `test:e2e`; this is a static end-user PWA, not a package or CLI, so consumer-pack testing does not apply.

The built app is within the supplied static budget: JavaScript is 26,978 B raw / 9,740 B gzip (200 KB budget), CSS 15,216 B raw / 4,220 B gzip (50 KB budget), no webfonts are downloaded, mobile hero 25,956 B, and desktop hero 80,744 B. Fresh local mobile Lighthouse (simulated throttling) returned **100 performance, 100 accessibility, 100 best practices, and 100 SEO**: FCP 1.0 s, LCP 1.4 s, TBT 80 ms, CLS 0, interactive 1.4 s.

## Independent product exercise

Using a separate Chromium script against the production build (not just repository tests), I verified:

- All four supplied modes—bounded drift, tempo ramp, delayed beat, recovery gap—started using visual-only cues, could be stopped, and added a practice-log entry. Turning all cues off showed `Turn on at least one cue…`; turning Visual back on immediately recovered normal playback.
- A fast 2/4, 220 BPM recovery route completed and emitted the observed `Recovery bar` phase before `Route complete. Practice logged.`
- Ramp at 40 BPM exposed minimum amount `0`; at 220 BPM it exposed maximum `0`; neither preview became `NaN` or `Infinity`.
- A named preset containing `<` and `&` saved, rendered as text (no injected script), and persisted through reload. Its copied share URL had only a `route` settings payload, never log fields, and opened the `Shared route loaded` state in a fresh page.
- CSV and JSON export controls produced downloads. The previous malformed-log import payload (`{"drills":[],"logs":[{"id":"bad","startedAt":"never"}]}`) displayed the invalid-backup recovery, did not brick the room, and the subsequent reload opened the full planner.
- The committed browser suite independently covers the same repaired persistence path atomically with existing local data, legacy-record quarantine, every 40–220/−40–60 ramp combination, all recovery lengths/amounts, controlled worker update, valid share/import boundaries, keyboard, and export/persistence behavior; all 22 runnable cases passed.

## Accessibility, responsive, errors, and privacy

- `/opt/fleet/lib/verify-url.sh` passed on the local production preview (539 ms) and live site (595 ms): title, `lang=en`, exactly one H1, main landmark, image alt, labeled buttons, and no console/page errors.
- Separate axe WCAG 2 A/AA scans at 390×844 found **0 serious or critical** findings on both local and live URLs.
- Keyboard smoke: first Tab visibly exposed the skip link; native radio Arrow navigation works; Space starts/stops outside a form field. Reduced-motion preference matched, uses `scroll-behavior: auto`, and reduces transitions to `0.00001s`.
- Fresh 390×844 inspection had zero horizontal overflow on local and live. Visible core/auxiliary target measurements passed 44 px minimum: wordmark 151.75×44, Practice 68.58×44, Log 44×44, empty action 149.41×44, Privacy 45.91×44, Terms 44×44. Desktop and mobile full-page screenshots were visually reviewed; no overlap or clipped core controls.
- Normal runtime request capture from separate local and live browsers was same-origin only, with no console/page errors. Source and runtime checks found no analytics, third-party scripts/fonts, microphone access, accounts, payment integration, or runtime network API. Presets/logs reside in IndexedDB; sharing/exporting is explicit and settings-only as documented by `/privacy` and `/terms`.

## PWA, headers, caching, and live identity

- Fresh local and live clients registered and were controlled by `/sw.js`, both using `tempo-lab-8a79f76c126e377e`. After first online load, `context.setOffline(true)` plus reload retained the complete planner and `Offline · practice available` on both. The automated controlled-prior-worker update regression also passed.
- Manifest is served as `application/manifest+json`, declares standalone display, a versioned start URL, matching dark splash colors, and 192/512 icons with maskable 512 purpose. The worker is `no-cache, no-store, must-revalidate` and precaches the application shell.
- Live response policies include HTTPS/HSTS, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Permissions-Policy: camera=(), geolocation=(), microphone=()`.

| Path | SHA-256 (local build = live) |
| --- | --- |
| `/` and `/index.html` | `bcfc6b6fa677c3ba48f28f8be2708fe144e51bf642050d5b69959d6538c246cc` |
| `/assets/app.js` | `8fc8c000a767340ae7a0c66e24cdf6ace97d0405ec94437d0fdfdd56ceadb656` |
| `/assets/app.css` | `8e78fb0b18f1236d688738527d99c1a6149c99b296946c10f627a511ba8a2861` |
| `/sw.js` | `c051a0c4b5254a0bc2bb7a4b77f74a838ffcd90b048c2820a704a864c2b6081b` |
| `/manifest.webmanifest` | `a5075f1dc72e99e1ac9423dc93a867db126cd75c16121f0f32a4b9dc01b163ee` |
| `/privacy/` | `138f2eb996b1df63c93c44a6fe11a6919b161f91b853206a9f19a1dc1b81ac4e` |
| `/terms/` | `eebe5d1e0d58dc4cd68a43f6ce5ca6bbd6f005561d6c03147a7c73b8749677cd` |

## Re-run

```sh
npm ci
npm test
npm run build
npm run test:e2e
npm run preview
```

Use the production preview to repeat the browser, offline, and Lighthouse checks above. No product code was modified during this verification.
