# Adversarial first-read review 1 — Tempo Lab

Reviewed 2026-08-28 at commit `3382611fa7433a313da92de8616fc30d068bba0c` and against <https://adaptive-metronome-lab.sociobot.in/> in fresh Chromium contexts at 390×844 and 1440×900.

## Verdict: FAIL

There are 24 findings, including 16 blocking findings. The first screen does not say that this is for musicians, no one-click sample demo exists, the nominal demo URLs use real storage, `.factory/claims.json` and all claim-tagged tests are absent, and unknown routes silently render the home page instead of a designed 404. A first-time visitor cannot verify the product's numerous feature and privacy claims through the required sandbox.

## Cold first screen, before scrolling

### 390px

- What does it do? I can infer that it builds some kind of practice “drill,” but the visible text never says “metronome” or explains the four tempo behaviors.
- For whom? I cannot answer. No audience is named.
- What should I click first? “Build a drill” is the only primary action, but it does not say what will appear and offers no sample.

Exact text that failed: the H1 is only **“Tempo Lab”**; the supporting text is **“Build controlled variation. Replay the exact route. Keep the score untouched.”**; the eyebrow is **“Precision practice line · runs offline”**; and the action is **“Build a drill.”** The image suggests a metronome, but essential meaning cannot depend on interpreting artwork.

### Desktop

The answer is the same. The larger layout makes the art and controls visible together, but the H1 remains a brand name, the audience remains absent, and the action still opens an empty configuration form rather than an explained first result.

## Findings

### Blocking

#### F-1-1 — The first screen does not state the job or audience

- Location/quote: home H1 **“Tempo Lab”**; **“Build controlled variation. Replay the exact route. Keep the score untouched.”**
- Why this fails: the H1 is not the job, “variation” and “route” are unexplained, and musicians are never named. The screen also lacks the required privacy/offline/price facts.
- Concrete fix: use **“Practice tempo changes without editing music”** as the H1; follow with **“For musicians who need repeatable drift, ramp, delayed-beat, and recovery drills.”** Add **“Works offline after the first visit,” “Drills and logs stay in this browser,”** and **“Free to use.”** Make **“Try it with sample data”** primary and explain **“Loads four example drills and a practice log.”**

#### F-1-2 — There is no sample demo, and the nominal demo paths touch real data

- Location/quote: no landing action mentions demo or sample data; `/demo` and `/?demo=1` render the ordinary empty app; `.factory/demo.md` is absent.
- Evidence: neither path shows **“Demo — sample data, nothing is saved,”** Reset, Start for real, sample drills, or sample history. In one browser context, a drill saved on `/` appeared on `/demo`, and a drill saved on `/demo` appeared again on `/` (`demoReadsReal: true`, `demoWritesReal: true`).
- Why this fails: there is no one-click try-out, no realistic first result, and the supposed demo route reads and writes the production `tempo-lab` IndexedDB namespace.
- Concrete fix: implement `/demo` with seeded realistic drills and logs in a `demo:` namespace or memory; add the persistent banner, Reset demo, and Start for real; discard demo changes on exit; document it in `.factory/demo.md` and README; add isolation tests that seed real data and prove demo cannot read or mutate it.

#### F-1-3 — The required claim registry and claim-tagged tests do not exist

- Location: `.factory/claims.json` is absent; repository search finds no `@claim:` tests.
- Why this fails: there are zero declared claim commands to run from a clean sandbox, so none of the claims below is accepted even though the general test suite passes.
- Concrete fix: create `.factory/claims.json`; give every claim exactly one observable `@claim:<id>` test that starts at `/demo`; run the listed commands in CI. Split unrelated outcomes into separate entries.

#### F-1-4 — Offline and installability claims are unlisted

- Exact quotes: landing **“Precision practice line · runs offline,” “Online · offline ready,” “Offline · practice available”**; README **“Tempo Lab is an offline-first adaptive metronome…”** and **“Installable PWA behavior with a precached practice room and offline fallback.”**
- Concrete fix: add an `offline-reload` claim and tagged test that loads `/demo`, waits for control, sets the context offline, reloads, and exercises the seeded drill. Add a separate installability/manifest claim test or remove “Installable PWA.”

#### F-1-5 — Bounded-drift and deterministic replay claims are unlisted

- Exact quotes: landing **“Replay the exact route,” “A seeded tempo route changes every two bars and always stays inside your chosen bound,”** and **“Every route is generated from its saved seed, so replaying a bounded-drift drill produces the same tempo changes.”** README repeats these in its opening paragraph, Bounded drift bullet, and **“reproducible seeds”** bullet.
- Concrete fix: add tagged tests that run the demo seed twice, compare every planned BPM, check change boundaries every two bars, and assert every value remains inside the selected bound.

#### F-1-6 — Tempo-ramp behavior is unlisted

- Exact quotes: landing **“The click moves evenly from the starting tempo to a faster or slower destination.”** README **“Tempo ramp: a steady move from the starting BPM to a chosen destination.”**
- Concrete fix: add a tagged test that asserts the first BPM, last BPM, monotonic direction, supported 40–220 range, and even interpolation for the sample ramp.

#### F-1-7 — Delayed-beat behavior is unlisted

- Exact quotes: landing **“The final click of every second bar arrives late while the underlying grid stays steady”** and **“Delayed clicks never move the underlying beat grid.”** README repeats the 20–180 ms range and every-second-bar behavior.
- Concrete fix: add a tagged scheduler test that measures the specified delayed cue while asserting later grid timestamps do not shift.

#### F-1-8 — Recovery-gap behavior is unlisted

- Exact quotes: landing **“Two reference bars give way to silent bars, followed by an accented recovery bar”** and **“Recovery gaps mute the reference, then return on a marked bar.”** README promises **“two reference bars, 1–4 silent bars, then an accented return.”**
- Concrete fix: add a tagged test for every supported silence count that observes two reference bars, the exact silent span, and one accented recovery bar.

#### F-1-9 — Sound, visual, and vibration cue claims are unlisted

- Exact quotes: landing **“Use the visual and vibration cues with sound, or as alternatives.”** README **“Sound, visual, and supported-device vibration cues.”**
- Concrete fix: add separate observable tests for Web Audio scheduling, visible beat state, and a mocked `navigator.vibrate`; explicitly test the unsupported-device state.

#### F-1-10 — Save, share, log, export, backup, and import claims are unlisted

- Exact quotes: landing **“The name and settings stay only on this device,” “Completed and stopped drills are logged here with the variation you attempted,”** and controls **“Save drill,” “Share link,” “Export CSV,” “Back up JSON,” “Import JSON.”** README claims named presets, settings-only share links, fresh-route creation, a local practice log, CSV export, and JSON backup/import.
- Concrete fix: list each independently testable result in claims.json. Tests must inspect IndexedDB, open a share URL in a fresh context, parse downloaded CSV/JSON, import the fixture, and compare records—not merely assert that controls exist.

#### F-1-11 — Local-storage and privacy claims are unlisted

- Exact quotes: landing **“Tempo Lab is a private, local-first practice tool.”** README **“Presets and logs remain on the device unless the user explicitly exports or shares them,” “IndexedDB stores saved drills and practice logs,” “Clearing site storage removes them,” “The JSON backup and import flow lets users move or retain their data,”** and **“Share links encode only drill name/settings and never include the practice log or a stable device identifier.”**
- Concrete fix: add tagged tests that record all requests for the whole demo flow, allow only same-origin requests, inspect the share payload, verify IndexedDB contents, clear site data, and prove records disappear. Replace “local-first” with the concrete storage statement.

#### F-1-12 — Microphone, grading, score, and performance claims are unlisted

- Exact quotes: landing **“Keep the score untouched”** and **“Tempo Lab does not listen to or grade your playing.”** README **“Tempo Lab does not access the microphone, grade playing, or make performance claims.”**
- Concrete fix: replace the metaphor with **“Tempo Lab does not edit notation or audio.”** Add a tagged permissions/request test proving no microphone request occurs and a static check proving no recording APIs are called; retain the no-grading statement only with corresponding observable coverage.

#### F-1-13 — No-service and no-third-party claims are unlisted

- Exact quotes: README **“No environment variables or external runtime services are required”** and **“There are no analytics, third-party scripts, CDN fonts, accounts, payments, or network APIs.”**
- Concrete fix: add a clean-start test with no environment variables, a production request-log test that permits only same-origin assets, and static checks for external scripts/fonts and analytics; otherwise narrow the sentence to what is tested.

#### F-1-14 — Build and deployment claims are unlisted

- Exact quotes: README **“The static production artifact is written to `./dist`, with `dist/index.html` at its root,” “Deploy the contents of `dist/` to any static host,”** and **“The service worker assumes the app is served from `/`.”**
- Concrete fix: add a build-artifact claim test for `dist/index.html`; rewrite **“Deploy to a static host at the domain root”** instead of claiming any host, then test that documented configuration.

#### F-1-15 — The keyboard claim is unlisted

- Exact quote: landing **“Press Space to start or stop outside a form field.”**
- Concrete fix: add a tagged keyboard test that presses Space on the document to start and stop, then proves Space does not trigger transport inside each form-control type.

#### F-1-16 — Unknown and demo routes silently return the home app

- Location/evidence: `/404` and `/definitely-missing-review-path` return HTTP 200, title **“Tempo Lab — adaptive metronome drills,”** H1 **“Tempo Lab,”** and the complete practice UI. `staticwebapp.config.json` has only a catch-all navigation fallback and no 404 response override. `/demo` also resolves to the ordinary home state.
- Why this fails: mistyped links look valid, there is no designed recovery page, and the required demo deep link is broken.
- Concrete fix: add a product-styled `404.html` with **“Page not found”** and a home action; configure `responseOverrides.404.rewrite`; implement a real `/demo`; give each route its own title and canonical URL.

### Non-blocking findings

#### F-1-17 — Required metadata is incomplete on every route

- Location: home has a description, SVG favicon, title, and `lang`, but no canonical, Open Graph fields, Twitter card, 1200×630 social image, or 180px apple-touch icon. Privacy and Terms omit those items plus the favicon. `/demo` has the home title. The sitemap omits Demo and a real 404.
- Concrete fix: add route-specific canonical, OG/Twitter title and description, the product-art social image, SVG/favicon and 180px icon references; use **“Demo — Tempo Lab”** and list all public routes in `sitemap.xml`.

#### F-1-18 — Hash navigation does not move focus or announce the destination

- Location/evidence: activating **“Log”** changes the URL to `/#log`, but `document.activeElement` becomes `BODY`; Back returns `/` with focus still on `BODY`. The title and H1 do not change.
- Why this fails: keyboard and screen-reader users receive no route/section-change focus cue.
- Concrete fix: on hash navigation and popstate, focus the destination heading with `tabindex="-1"`, update an `aria-live="polite"` route announcement, and restore meaningful focus on Back. Add an end-to-end focus test.

#### F-1-19 — Header and footer are not consistent across routes

- Location: Privacy and Terms show only **“← Back to Tempo Lab”** rather than the wordmark and standard navigation. Their footers contain no Privacy/Terms links. The home footer lacks **“Built by Param Factory”** and a version/build ID.
- Concrete fix: use the same skip link, wordmark, limited nav, product one-liner, Privacy, Terms, factory credit, and build ID on Home, Demo, Privacy, Terms, and 404.

#### F-1-20 — The landing skeleton omits required orientation sections

- Location: the hero is followed directly by the full editor. There is no three-step **“How it works”** section, no first-screen set of three plain facts, and no explicit price fact despite the product being free.
- Concrete fix: after the live demo preview, add three short steps such as **“Choose a tempo change,” “Practice the generated clicks,” “Save or export the result.”** Put offline, local storage, and free facts on the first screen. Retitle the final section **“What Tempo Lab does not do.”**

#### F-1-21 — Railway lore obscures meaning and the same object has three names

- Location/quotes: **“Precision practice line,” “Replay the exact route,” “Route planner,” “Now departing,” “Your local lines,” “Station record,” “No departures recorded,” “practice room,”** and **“A variation instrument, not a score editor.”** The editable/saved object alternates among “drill,” “route,” and “line.”
- Why this fails: the artwork already carries the railway identity; operational text makes a visitor translate metaphors before acting.
- Concrete fix: choose **“drill”** throughout. Use **“Build a drill,” “Current drill,” “Saved drills,” “Practice log,” “No practice attempts yet,” “the app,”** and **“What Tempo Lab does not do.”** Delete decorative labels that duplicate the direct headings.

#### F-1-22 — Four buttons do not name their result clearly

- Location/quotes: **“New route,” “Share link,” “Load,”** and **“Delete.”**
- Concrete fix: use **“Create new drill,” “Copy share link,” “Load drill,”** and **“Delete drill.”** Existing **“Save drill,” “Start drill,” “Export CSV,” “Back up JSON,”** and **“Import JSON”** pass.

#### F-1-23 — Visitor-facing README copy uses unexplained technical terms

- Location/quotes: **“offline-first adaptive metronome,” “deterministic set of clicks,” “seeded tempo changes,” “IndexedDB,” “reproducible seeds,” “settings-only,” “fresh-route creation,” “Installable PWA behavior,”** and **“pre-cached practice room.”**
- Concrete fix: rewrite the opening as **“Tempo Lab creates repeatable tempo-change drills for musicians without changing notation or audio. Save a drill, replay the same clicks, and export your practice history.”** Rewrite feature bullets as user results; keep `IndexedDB`, Vite, and service-worker details only in developer/setup sections.

#### F-1-24 — The deployed site sends no Content Security Policy

- Location/evidence: live response headers include HSTS, Referrer-Policy, nosniff, frame denial, and Permissions-Policy, but no `Content-Security-Policy`; the static host config defines none.
- Concrete fix: add a response-header CSP matching the self-hosted assets and required worker/blob behavior. Keep `frame-ancestors` in the response header, then verify a clean console on every route.

## Copy audit

Word counts use whitespace-delimited words. No audited sentence exceeds 22 words, and none contains a banned marketing word. Flags are identified after the inventories.

### Landing page sentences

| Words | Sentence |
| ---: | --- |
| 3 | Build controlled variation. |
| 4 | Replay the exact route. |
| 4 | Keep the score untouched. |
| 15 | A seeded tempo route changes every two bars and always stays inside your chosen bound. |
| 14 | The click moves evenly from the starting tempo to a faster or slower destination. |
| 15 | The final click of every second bar arrives late while the underlying grid stays steady. |
| 14 | Two reference bars give way to silent bars, followed by an accented recovery bar. |
| 9 | The name and settings stay only on this device. |
| 10 | Press Space to start or stop outside a form field. |
| 7 | Name the drill above and save it. |
| 7 | Your first repeatable route will appear here. |
| 12 | Completed and stopped drills are logged here with the variation you attempted. |
| 18 | Every route is generated from its saved seed, so replaying a bounded-drift drill produces the same tempo changes. |
| 8 | Delayed clicks never move the underlying beat grid. |
| 11 | Recovery gaps mute the reference, then return on a marked bar. |
| 10 | Tempo Lab does not listen to or grade your playing. |
| 11 | Use the visual and vibration cues with sound, or as alternatives. |
| 15 | Start with a comfortable range and stop if a drill is not useful to you. |
| 8 | Tempo Lab is a private, local-first practice tool. |
| 9 | Original AI-generated poster artwork; interface geometry drawn in code. |

### README sentences and sentence-like bullets

| Words | Sentence |
| ---: | --- |
| 20 | Tempo Lab is an offline-first adaptive metronome for musicians who want controlled, repeatable timing variation without editing notation or audio. |
| 21 | It turns a practice session into a saved “route”: a deterministic set of clicks that can be replayed, shared, and logged. |
| 12 | Bounded drift: seeded tempo changes that remain inside a chosen BPM range. |
| 13 | Tempo ramp: a steady move from the starting BPM to a chosen destination. |
| 19 | Delayed beat: the last cue of every second bar arrives 20–180 ms late while the underlying grid stays fixed. |
| 12 | Recovery gap: two reference bars, 1–4 silent bars, then an accented return. |
| 6 | Sound, visual, and supported-device vibration cues. |
| 12 | Named presets in IndexedDB, reproducible seeds, settings-only share links, and fresh-route creation. |
| 11 | A local practice log with CSV export plus full JSON backup/import. |
| 11 | Installable PWA behavior with a precached practice room and offline fallback. |
| 13 | Tempo Lab does not access the microphone, grade playing, or make performance claims. |
| 15 | Presets and logs remain on the device unless the user explicitly exports or shares them. |
| 5 | Requires Node.js 20 or newer. |
| 5 | Vite prints the local URL. |
| 9 | No environment variables or external runtime services are required. |
| 13 | The static production artifact is written to `./dist`, with `dist/index.html` at its root. |
| 4 | To inspect it locally: |
| 9 | Deploy the contents of `dist/` to any static host. |
| 10 | The service worker assumes the app is served from `/`. |
| 7 | IndexedDB stores saved drills and practice logs. |
| 5 | Clearing site storage removes them. |
| 13 | The JSON backup and import flow lets users move or retain their data. |
| 17 | Share links encode only drill name/settings and never include the practice log or a stable device identifier. |
| 13 | There are no analytics, third-party scripts, CDN fonts, accounts, payments, or network APIs. |
| 9 | See the visual thesis, privacy policy, terms, and handoff. |
| 1 | MIT. |
| 2 | See LICENSE. |

### Copy flags and proposed rewrites

- **Unclear slogan:** the first three landing sentences do not name tempo, a metronome, or musicians. Replace them with the F-1-1 headline and audience sentence.
- **Jargon:** “seeded,” “bounded-drift,” “beat grid,” and “local-first” appear in visitor copy. Use **“repeatable pattern,” “drift drill,” “underlying tempo,”** and **“stored only in this browser.”**
- **README jargon:** use the F-1-23 opening and move implementation terms to setup documentation.
- **Inconsistent terms and railway labels:** apply the exact replacements in F-1-21.
- **Contextless/mood labels:** replace or remove **“Precision practice line,” “Now departing,” “Your local lines,” “Station record,” “Operating notes,”** and **“A variation instrument, not a score editor.”**
- **Buttons:** apply the four rewrites in F-1-22.

Terminology after repair should be: configurable practice object → **drill**; pattern type → **variation**; completed/stopped record → **practice attempt**; collection of attempts → **practice log**; browser persistence → **stored in this browser**; isolated sample state → **demo**.

## Demo, privacy, offline, and request evidence

- One-click demo: FAIL; no action exists.
- Sample state on entry: FAIL; `/demo` and `?demo=1` show empty normal state.
- Banner, Reset, Start for real: FAIL; all absent.
- Isolation: FAIL; live `/demo` reads and writes the same IndexedDB data as `/`.
- Outgoing requests: PASS for the tested live flow; all observed requests were same-origin document, JS, CSS, and hero assets.
- Offline shell: PASS independently in the local production browser suite; 22 browser tests include offline reload. A fresh live controlled client also rendered **“Build your drill”** after network disable. This remains an unlisted claim because no claims registry/tag exists.

## Structure and accessibility checks

- PASS: `lang=en`, one H1, one main landmark, image alt, labeled buttons, responsive 390px layout with no horizontal overflow.
- PASS: live axe WCAG 2 A/AA scan reported zero serious or critical violations.
- PASS: required homepage/title pattern is structurally acceptable at 39 characters, and Privacy/Terms use route-specific titles. The H1 content itself fails F-1-1.
- PASS: all nine home-page links and the external `sociobot.in` legal-page link returned 200.
- PASS: first-load application JS is 26.98 kB uncompressed and 9.74 kB gzip.
- PASS: the art-deco railway visual identity is distinct, original, documented in `.factory/design.md`, and not a generic SaaS card/gradient template.
- FAIL: metadata, 404 behavior, route focus, shared skeleton, and CSP are covered by F-1-16 through F-1-24.

## Claims execution

`.factory/claims.json` does not exist, so there were no declared claim commands to run. This is not a pass or “zero claims”; it is an untested-claims failure.

For context only, the available non-claim gates passed from this initially clean checkout:

```text
npm ci             PASS — 61 packages, 0 vulnerabilities
npm test           PASS — 12/12
npm run build      PASS — dist/index.html, 26.98 kB JS (9.74 kB gzip)
npm run test:e2e   PASS — 22 passed, 4 intentional skips
verify-url.sh      PASS — HTTP 200, no console errors, title/lang/main/alt checks
live axe           PASS — 0 serious/critical violations
```

## Earlier history reconciliation

No `.factory/review-*.md` or `.factory/polish-*.md` files existed before this review. The prior `.factory/handoff.md` and verification reports describe four repaired findings; all four were rechecked from scratch:

| Earlier issue | Live confirmation | Code/test confirmation | Result |
| --- | --- | --- | --- |
| Malformed log import persisted and broke reload | Bad log import left IndexedDB byte-for-byte unchanged; reload opened **“Build your drill.”** | Atomic validation/import path present; browser regression passed. | Fixed |
| 40 BPM ramp allowed a zero destination | At 40 BPM, ramp change minimum is `0`; duration remains finite. | Exhaustive 18,281-combination unit test and browser boundary test passed. | Fixed |
| Recovery could finish without recovery bar | Selecting four silent bars expands length from 4 to 8. | Planner and browser phase regression passed. | Fixed |
| Mobile targets below 44px | Home 151.75×44, Log 44×44, empty action 149.41×44, Privacy 45.91×44, Terms 44×44. | Mobile bounding-box regression passed. | Fixed |

No earlier finding is being reissued under its old ID.

## Missed leverage

No additional AI feature is justified. A metronome must remain deterministic and offline, and model output would not improve its core timing job. The brief-implied save/share, CSV export, and JSON import/export features exist. Cloud sync would weaken the local privacy model unless explicitly chosen, so it is not a finding. The obvious missing tryability feature is the sandbox demo already covered by F-1-2.

## What would make this perfect

Resolve every finding above: make the first screen explain the job and audience, add an isolated seeded demo, convert every promise into a tagged claim test, implement honest routing and 404 behavior, complete metadata and shared page chrome, replace railway lore with direct task language, and add the missing CSP. Re-run this entire review from fresh browser/storage contexts; acceptance requires zero findings and zero untested claims.
