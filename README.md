# Tempo Lab

Tempo Lab is an offline-first adaptive metronome for musicians who want controlled, repeatable timing variation without editing notation or audio. It turns a practice session into a saved “route”: a deterministic set of clicks that can be replayed, shared, and logged.

Live: <https://adaptive-metronome-lab.sociobot.in>

## What it does

- **Bounded drift:** seeded tempo changes that remain inside a chosen BPM range.
- **Tempo ramp:** a steady move from the starting BPM to a chosen destination.
- **Delayed beat:** the last cue of every second bar arrives 20–180 ms late while the underlying grid stays fixed.
- **Recovery gap:** two reference bars, 1–4 silent bars, then an accented return.
- Sound, visual, and supported-device vibration cues.
- Named presets in IndexedDB, reproducible seeds, settings-only share links, and fresh-route creation.
- A local practice log with CSV export plus full JSON backup/import.
- Installable PWA behavior with a precached practice room and offline fallback.

Tempo Lab does not access the microphone, grade playing, or make performance claims. Presets and logs remain on the device unless the user explicitly exports or shares them.

## Run locally

Requires Node.js 20 or newer.

```sh
npm ci
npm run dev
```

Vite prints the local URL. No environment variables or external runtime services are required.

## Test and build

```sh
npm test          # deterministic drill unit tests
npm run test:e2e # Chromium: persistence, keyboard, mobile, axe, offline reload
npm run build     # exact production build command
```

The static production artifact is written to `./dist`, with `dist/index.html` at its root. To inspect it locally:

```sh
npm run preview
```

Deploy the contents of `dist/` to any static host. The service worker assumes the app is served from `/`.

## Data and privacy

IndexedDB stores saved drills and practice logs. Clearing site storage removes them. The JSON backup and import flow lets users move or retain their data. Share links encode only drill name/settings and never include the practice log or a stable device identifier. There are no analytics, third-party scripts, CDN fonts, accounts, payments, or network APIs.

See [the visual thesis](.factory/design.md), [privacy policy](public/privacy/index.html), [terms](public/terms/index.html), and [handoff](.factory/handoff.md).

## License

MIT. See [LICENSE](LICENSE).
