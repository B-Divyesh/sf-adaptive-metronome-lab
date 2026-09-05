# Tempo Lab

Tempo Lab creates repeatable tempo-change drills for musicians without changing notation or audio. Save a drill, replay the same clicks, and export your practice history.

Try the sample: <https://adaptive-metronome-lab.sociobot.in/demo>

## What it does

- Changes tempo every two bars within a selected BPM limit.
- Moves evenly from one tempo to another.
- Delays the final cue of every second bar.
- Adds silent bars before an accented recovery bar.
- Saves named drills and practice attempts in this browser.
- Copies drill-setting links and exports CSV or JSON backups.

After one online visit, Tempo Lab works offline. It has sound, visual, and supported-device vibration cues. Tempo Lab does not record or grade your playing.

## Try the sample

Open `/demo` or choose **Try it with sample data** on the home page. The demo loads four example drills and three practice attempts in the `demo:tempo-lab` IndexedDB namespace. It never reads or writes the real `tempo-lab` namespace.

Use **Reset demo** to restore the supplied sample. Use **Start for real** to clear the demo namespace and open the empty real workspace.

See [.factory/demo.md](.factory/demo.md) for the sample contents and reset behavior.

## Run locally

Requires Node.js 20 or newer.

```sh
npm ci
npm run dev
```

Vite prints the local address.

## Test and build

```sh
npm test          # drill planner tests
npm run test:e2e  # browser, accessibility, mobile, PWA, and recovery tests
npm run test:claims # every public product claim from /demo
npm run build     # writes dist/index.html and its static assets
```

The production artifact is `./dist`, with `dist/index.html` at its root. Deploy it to a static host at the domain root. The service worker uses root-relative paths.

Every public claim is listed in [.factory/claims.json](.factory/claims.json). Each entry names an exact command and an observable browser outcome. Run the listed commands after `npm ci` from a clean checkout.

## Data and privacy

Saved drills and practice attempts are stored in browser IndexedDB. Clearing site data removes them. A share link contains a drill name and settings, not a practice log or device identifier.

Tempo Lab loads its app resources from this site. It does not request microphone access.

See [the visual thesis](.factory/design.md), [privacy policy](public/privacy/index.html), [terms](public/terms/index.html), and [handoff](.factory/handoff.md).

## License

MIT. See [LICENSE](LICENSE).
