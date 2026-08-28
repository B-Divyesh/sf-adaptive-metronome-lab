# Tempo Lab independent verification handoff — FAIL

## Verdict

**FAIL** for candidate `d06e86d5f29f1f4769d6c99e1c6ef6e5bd1b87a5` at <https://adaptive-metronome-lab.sociobot.in>, verified 2026-08-28.

The deployment byte-matches the candidate and its normal build, tests, accessibility, privacy, update, offline, and performance checks pass. It is not release-ready because invalid log imports can persistently brick the app, valid ramp boundaries can produce a zero-BPM infinite session, and valid recovery settings can complete without any recovery bar.

Full evidence and reproduction steps are in [verification-2.md](verification-2.md).

## Defects

- **High:** importing `{"drills":[],"logs":[{"id":"bad-log","startedAt":"not-a-date"}]}` displays an invalid-file error but persists the log. After reload, a `TypeError` leaves the UI at `Opening the practice room…`; in-app recovery is impossible and clearing site data risks legitimate local data.
- **Medium:** Tempo ramp at the allowed 40 BPM / -40 boundary renders `-40 → 0 BPM` and `Infinity:NaN`; the route cannot finish normally.
- **Medium:** Recovery gap with 4 silent bars and a 4-bar length promises a later recovery bar but completes after only two reference and two silent bars.
- **Low:** multiple auxiliary links at 390px are below the required 44×44 CSS px touch target; the primary transport target passes.

## Verification evidence

From the clean requested checkout:

```text
npm ci                 PASS
npm test               PASS — 8/8
npm run build          PASS — tsc --noEmit + Vite, dist/ produced
npm run test:e2e       PASS — 13 passed, 3 intentional skips
npm audit --omit=dev   PASS — 0 vulnerabilities
```

There is no separate lint script. Independent local/live browser runs covered all modes, endpoints, normal completion/stopping, invalid-cue recovery, named save/reload, share replay, CSV/JSON export, desktop, 390×844 mobile, keyboard-only use, visible focus, reduced motion, outbound requests, malformed import persistence, service-worker install/update/offline reload, live policies, and response caching.

- Live and `dist/` SHA-256 hashes matched for HTML, JS, CSS, worker, manifest, privacy, and terms.
- Independent axe local/live: 0 serious/critical findings.
- Normal runs: 0 console/page errors, 0 third-party requests.
- Live offline reload: passed under cache `tempo-lab-5488cd8c8745728a`.
- Local mobile Lighthouse: 96 performance / 100 accessibility / 100 best practices / 100 SEO; LCP 1.766 s, CLS 0.
- JS 24,902 B, CSS 14,916 B, mobile hero 25,956 B; all stated bundle budgets pass.
- Headers include HSTS, referrer policy, nosniff, frame denial, and camera/geolocation/microphone denial. Worker caching is no-store; general assets revalidate after 30 seconds. No CSP is present.

## Required next steps

1. Strictly validate all imported log fields/dates before writing, make import atomic, and quarantine invalid persisted logs on startup.
2. Enforce finite positive ramp destinations across UI, share, import, persistence, and planner logic.
3. Prevent recovery sessions shorter than a complete reference/silence/recovery cycle.
4. Raise remaining mobile touch targets to at least 44×44 CSS px.
5. Add regressions for all four cases, then rerun the full clean/local/live/PWA verification described in `.factory/verification-2.md`.

No product code was modified during verification.
