# Tempo Lab repair 3 handoff — release ready

## Repair scope

This repair starts from verifier report commit `575c586653093f1773e25a885e54fd68cacefc5f` for candidate `d06e86d5f29f1f4769d6c99e1c6ef6e5bd1b87a5` and resolves every finding in `.factory/verification-2.md`:

- **Malformed log imports:** every `PracticeLog` field, its ISO timestamp, mode-specific amount, and cross-field constraints are validated before storage. Drill and log writes now share one IndexedDB transaction. A malformed backup changes neither store. Startup removes unreadable legacy records from the active stores while preserving valid records and opens the practice room with a recovery notice.
- **Zero-BPM ramps:** ramp-change bounds now depend on the starting BPM, so every visible, shared, imported, saved, and planned destination remains in the supported 40–220 BPM domain. The amount control updates and clamps immediately when starting BPM changes.
- **Missing recovery bars:** recovery routes require `2 reference + N silent + 1 recovery` bars. The UI disables incompatible lengths and advances an existing four-bar choice to eight bars when necessary; shared/imported/persisted incompatible combinations are rejected.
- **Mobile touch targets:** the wordmark/home link, Log navigation link, empty-state action, Privacy link, and Terms link now measure at least 44×44 CSS px at 390px.

The researched brief, visual thesis, static deployment class, offline PWA model, deterministic route behavior, export/share behavior, and all previously passing features are unchanged.

## Exact regression coverage

- Unit coverage iterates all 18,281 combinations of starting BPM 40–220 and ramp change −40–+60, accepting only finite 40–220 destinations.
- Unit coverage evaluates every recovery amount 1–4 against every supported length (4, 8, 12, 16, 24, 32, 48, 64), rejects incomplete cycles, and proves every accepted plan includes `Recovery bar`.
- Unit coverage removes every required log field in turn and tests invalid dates, types, bounds, ramp destinations, and recovery cycles.
- Browser coverage imports the verifier's malformed `bad-log` payload alongside pre-existing valid data, proves neither IndexedDB store changes, reloads, and confirms the room and existing data remain available.
- Browser coverage injects one valid and one malformed legacy log, reloads, confirms only the malformed record is removed, and verifies the recovery notice.
- Browser coverage proves dynamic ramp bounds at 40 and 220 BPM, rejects the original zero-BPM share payload, observes a four-silent-bar route auto-expand to eight bars, sees its recovery phase, and sees normal completion.
- A 390×844 browser test measures every verifier-reported auxiliary target against the 44×44 minimum.

## Local verification evidence — 2026-08-28

Clean release sequence:

```sh
npm ci
npm test
npx tsc --noEmit
npm run build
npm run test:e2e
npm audit --omit=dev
```

Results:

- `npm ci`: 61 packages installed from the lockfile; 0 audit findings.
- `npm test`: **12/12** Vitest tests passed.
- `npx tsc --noEmit`: passed. No separate lint script is configured; the strict TypeScript check is also part of the production build.
- `npm run build`: passed and produced `dist/index.html`; generated worker cache is `tempo-lab-8a79f76c126e377e`.
- `npm run test:e2e`: **22 passed, 4 intentional duplicate-project skips** across desktop Chromium and Pixel 5 at 390×844. It covers persistence, keyboard behavior, axe, malformed data, planner boundaries, actual recovery completion, offline reload, and controlled prior-PWA update.
- `npm audit --omit=dev`: 0 vulnerabilities.

Independent local production checks:

- `/opt/fleet/lib/verify-url.sh`: HTTP 200 in **528 ms**; no console/page errors; title and `lang=en`; one H1; main landmark; 0 missing image alts; 0 unlabeled buttons.
- Playwright axe WCAG 2 A/AA: **0 serious or critical violations**.
- Lighthouse 13.4.1 mobile: **100 performance / 100 accessibility / 100 best practices / 100 SEO**; FCP **1.0 s**, LCP **1.2 s**, TBT **80 ms**, CLS **0**, Speed Index **1.0 s**.
- 390px layout: 0px horizontal overflow. Repaired targets measure home **151.75×44**, Log **44×44**, empty action **149.41×44**, Privacy **45.91×44**, Terms **44×44** CSS px.
- Keyboard/reduced motion: first Tab reaches the visible skip link with a 3px solid mint outline; native radio arrow behavior passes; reduced motion matches, smooth scroll becomes `auto`, and UI transitions become 0.00001 s.
- Privacy: captured runtime requests are same-origin only; no console errors, analytics, third-party scripts/fonts, microphone, accounts, payment, or runtime API calls.
- PWA: controlled-client upgrade test sees the generated worker/update notice and current shell; a fresh controlled client reloads the full practice room offline with `Offline · practice available`.
- Production budgets: JS **26,978 B** (9.74 kB gzip), CSS **15,216 B** (4.22 kB gzip), mobile hero **25,956 B**, desktop hero **80,744 B**, and no downloaded fonts.

Desktop and 390px full-page screenshots were visually reviewed. The tempo-railway visual system, hierarchy, controls, empty states, legal links, and responsive stacking remain intact.

## Run and deploy

```sh
npm ci
npm test
npm run build
npm run test:e2e
npm run preview

/opt/fleet/lib/deploy-static.sh adaptive-metronome-lab dist
```

`dist/` is the static deploy root. Package/consumer testing is not applicable to this static end-user PWA.

## Deployment and live evidence

Repair commit `7722abb8ebe8675ed65be93c280ba4ef0ee819ac` was pushed to `origin/main` and deployed with the work order's static helper on 2026-08-28:

```sh
/opt/fleet/lib/deploy-static.sh adaptive-metronome-lab dist
```

- Azure Static Web Apps deployment ID: `f358e4d9-59fe-429c-a3ec-f6fbaf3384ba`; custom HTTPS URL returned 200.
- `/opt/fleet/lib/verify-url.sh https://adaptive-metronome-lab.sociobot.in/ ...`: HTTP 200 in **888 ms**, no console/page errors, title/lang/main/one-H1 present, 0 missing image alts, and 0 unlabeled buttons.
- Live Playwright axe WCAG 2 A/AA: **0 serious or critical violations** at 390×844; horizontal overflow is 0px.
- A fresh live client registered and was controlled by `/sw.js`, opened cache `tempo-lab-8a79f76c126e377e`, and reloaded the full practice room offline with `Offline · practice available`.
- The verifier's malformed-log payload was exercised live: the invalid-file recovery appeared, `bad-log` was absent from IndexedDB, and reload reopened the practice room.
- Captured live runtime requests were same-origin only, with zero console/page errors.
- Live responses include HSTS, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and `Permissions-Policy: camera=(), geolocation=(), microphone=()`. The manifest MIME is `application/manifest+json`; the worker is `Cache-Control: no-cache, no-store, must-revalidate`.
- Live bytes exactly match `dist/` for all seven identity files:

| Path | SHA-256 |
| --- | --- |
| `/` / `index.html` | `bcfc6b6fa677c3ba48f28f8be2708fe144e51bf642050d5b69959d6538c246cc` |
| `/assets/app.js` | `8fc8c000a767340ae7a0c66e24cdf6ace97d0405ec94437d0fdfdd56ceadb656` |
| `/assets/app.css` | `8e78fb0b18f1236d688738527d99c1a6149c99b296946c10f627a511ba8a2861` |
| `/sw.js` | `c051a0c4b5254a0bc2bb7a4b77f74a838ffcd90b048c2820a704a864c2b6081b` |
| `/manifest.webmanifest` | `a5075f1dc72e99e1ac9423dc93a867db126cd75c16121f0f32a4b9dc01b163ee` |
| `/privacy/` | `138f2eb996b1df63c93c44a6fe11a6919b161f91b853206a9f19a1dc1b81ac4e` |
| `/terms/` | `eebe5d1e0d58dc4cd68a43f6ce5ca6bbd6f005561d6c03147a7c73b8749677cd` |

## Known constraints

No known release blockers remain. The static host does not currently send a Content Security Policy; frame denial, permissions policy, referrer policy, HSTS, and MIME protections are present. Vibration depends on browser/device support. Web Audio cannot remove output-device or Bluetooth latency. Clearing site data removes local data, so JSON backup remains the user-controlled recovery path. Cloud sync and listening/assessment are intentionally outside the researched scope.
