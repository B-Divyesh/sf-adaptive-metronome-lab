# Tempo Lab demo sandbox

## Open the demo

Open `/demo` or `/?demo=1`. The home-page **Try it with sample data** action opens `/demo` in one click.

## Sample data

The demo starts with these realistic practice drills:

- Pocket drift at 96: 16 bars of ±5 BPM drift.
- Chorus ramp: 88 BPM to 112 BPM across 16 bars.
- Late backbeat: 104 BPM with an 80 ms delayed final cue.
- Recovery count: two reference bars, three silent bars, and a recovery bar.

It also includes three completed or stopped practice attempts. The planner opens on Pocket drift at 96.

## Isolation and reset

Real data uses IndexedDB database `tempo-lab`. Demo data uses the separate `demo:tempo-lab` database. Demo mode never reads or writes the real database.

The persistent banner says **Demo — sample data, nothing is saved**. **Reset demo** clears and reseeds only `demo:tempo-lab`. **Start for real** clears that demo database and navigates to `/`; it does not copy or modify demo records in the real workspace.

The demo sample is part of the app shell, so it remains available for the offline-reload claim after the first online visit.
