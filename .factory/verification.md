# Verification report — FAIL

Verified on 2026-08-28 against candidate commit `cca26b57f1614d15a6f6bd8da5237d9398b2436b` and the live URL <https://adaptive-metronome-lab.sociobot.in>.

## Decision

**FAIL.** A fresh installation is functional, but an already-installed Tempo Lab PWA cannot receive this candidate (or a future candidate that leaves the service worker unchanged). That makes the candidate's own high-tempo visual-cue fix unreachable for existing users and does not meet the offline-PWA update requirement.

## Blocking defects

### High — existing installed PWAs are permanently pinned to old application JavaScript

`public/sw.js` has a fixed cache name (`tempo-lab-v1`) and precaches fixed application URLs (`/assets/app.js` and `/assets/app.css`) with a cache-first fetch handler. The candidate changes `src/main.ts`, so the built JavaScript changes, but it does not change `sw.js`, the cache name, or the application URL.

Fresh reproduction:

1. Built `HEAD^` and the candidate in isolated directories. The prior application hash was `068c261dd3cc4d54d23c1f86857b8c9a6441c878e90156570101def7fa15bd95`; the candidate application hash is `bc26dd2cb9049fcb5f554e8628c5d67116fee8fd414b344da3633300f279d108`.
2. Served the prior build, installed/controlled it with the service worker, then switched the same origin to the candidate build without clearing browser storage.
3. Reloaded the controlled client. A fetch of `/assets/app.js` still contained the old `toggle("fast-beat")` code, did not contain the candidate `add("fast-beat")` code, `navigator.serviceWorker.controller` remained true, and no update toast appeared.

Both builds have the identical service-worker hash `7c481186c994d2235345b4e7161d215b52dd1a29220f517491e54bde9abe465b`. This is not a network-cache timing issue: the service worker's Cache Storage entry is returned indefinitely before a network request is considered. Version the service-worker cache and app assets for every release (or use content-hashed app URLs), then verify a controlled prior client receives the update and update message.

### Medium — share/import validation accepts values outside every advertised drill bound

The UI constrains drift to 1–20 BPM, but `validateDrill` only checks that `amount` is numeric. A settings-only share URL containing `{ "m": "drift", "b": 120, "l": 16, "t": 4, "a": 999, "s": 1 }` loaded successfully, displayed `±999 BPM`, and displayed the normal "Shared route loaded" notice. Similar bypasses are possible for ramp, delay, and recovery. This contradicts the product's bounded/practice-safe controls and treats malformed user-supplied share/import data as valid. Validate amount ranges by mode (and restrict all persisted values to the supported UI domain); reject with the existing recovery message.

## Passing evidence

### Clean local build and automated checks

- Began at a clean worktree at the specified commit; `npm ci` completed and `npm audit --omit=dev` reported 0 vulnerabilities.
- `npm test`: **6/6** Vitest planner tests passed.
- `npm run build`: passed (`tsc --noEmit` plus Vite); produced `dist/`.
- `npm run test:e2e`: passed (**8 passed, 2 intentional mobile duplicate skips**). The suite covers save/reload, keyboard radio selection, start/stop/log, axe scan, mobile overflow, and offline reload.
- Production bundles are within budget: JavaScript 24,427 B (8,910 B gzip), CSS 14,916 B (4,190 B gzip), no downloaded fonts; mobile hero 25,956 B and desktop hero 80,744 B.

### Independent browser exercise

- Normal practice flow: all four modes (bounded drift, ramp, delayed beat, recovery gap) started and stopped successfully; stopped attempts were logged. A 4-bar/2-beat/220-BPM route completed and recorded `Complete`.
- Boundaries: BPM 40 and 220, ramp −40, delayed beat 180 ms, and recovery 4 silent bars updated the preview correctly. At 220 BPM the dial used steady `fast-beat` with no pulse; at 180 BPM it removed `fast-beat` and pulsed.
- Invalid/recovery paths: starting with sound, visual, and vibration all disabled produced the explicit cue-required error; re-enabling visual recovered. Invalid JSON import displayed `That file is not a valid Tempo Lab JSON backup.` CSV export contained its expected header and practice record. Named drill persistence survived reload.
- Desktop and 390×844 mobile screenshots were visually reviewed. Mobile had 0 px horizontal overflow; the primary control measured 350×49.9 CSS px.
- Keyboard smoke: Tab reaches the visible skip link with a 3 px solid focus outline; ArrowRight changes the native radio group. Reduced-motion context sets smooth scroll to `auto` and transitions to 0.01 s.
- Independent `@axe-core/playwright` WCAG 2 A/AA scan found **0 serious or critical violations**. Local and live browser runs had 0 console errors and 0 page errors.

### PWA, privacy, and live deployment

- Fresh live PWA install/control succeeded. Cache `tempo-lab-v1` contained the shell, assets, legal pages, manifest, icons, and offline page. After `context.setOffline(true)`, reload showed the practice room and `Offline · practice available`.
- The live root, `assets/app.js`, `assets/app.css`, `sw.js`, and manifest byte-hashes exactly matched the candidate production build. `origin/main` also resolved to `cca26b57f1614d15a6f6bd8da5237d9398b2436b` before this verification-report commit.
- Captured live browser requests were same-origin only. Source inspection found no analytics, CDN fonts, third-party scripts, microphone request, or runtime API endpoint; storage is IndexedDB and export/share remain user initiated.
- Live HTTPS responses include HSTS, `Referrer-Policy: strict-origin-when-cross-origin`, and `X-Content-Type-Options: nosniff`. Chromium reported no PWA installability errors.

## Non-blocking delivery/policy observations

- The live manifest is served as `application/octet-stream`, not `application/manifest+json`. Chromium currently accepts it, but serving the declared manifest MIME type is safer for PWA compatibility.
- The live responses expose no CSP, frame-ancestors/X-Frame-Options, or Permissions-Policy, and application assets use `Cache-Control: public, must-revalidate, max-age=30` rather than immutable versioned-asset caching. These are not the reason for the FAIL, but they should be addressed with the update-cache redesign.
- Lighthouse 13.4.1 collected provisional local mobile scores of 100/100/100/100 (performance/accessibility/best practices/SEO; FCP/LCP 0.2 s, TBT 50 ms, CLS 0), but Chromium crashed while Lighthouse captured the final full-page screenshot and emitted `TARGET_CRASHED`. Treat that one run as diagnostic rather than a valid performance gate; the static budgets and independent browser checks above passed.

## Required retest

After fixing the High defect, repeat the two-build controlled-client scenario: install the previous build, deploy the candidate on the same origin, confirm the update notice appears, refresh, and assert that the cached `/assets/app.js` hash/content is the candidate rather than the prior build. Also verify malformed share/import values are rejected and a normal fresh/offline reload still works.
