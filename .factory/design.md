# Tempo Lab visual thesis

## Direction: the tempo railway

Tempo Lab is an **art-deco transit poster turned into an instrument panel**. A practice drill is a route: the base tempo is its departure board, variation is a controlled bend in the line, and the recovery click is an arrival marker. The aesthetic belongs to the interwar railway poster without imitating a specific operator or artist—flat geometry, strong diagonals, inked rules, and a limited mineral palette. This suits a tool about movement with control: expressive, but never arbitrary.

The interface is intentionally single-mode. Its dark indigo “night platform” background reduces glare during practice, while cream paper surfaces and brass controls provide high contrast. There is no decorative light theme because the poster premise depends on a consistent ink-and-paper world; the background is explicitly painted everywhere, including the install splash.

## Palette

| Token | Value | Use |
| --- | --- | --- |
| `--ink` | `#10243a` | page background, deep print ink |
| `--ink-raised` | `#18334d` | secondary rails and recessed surfaces |
| `--paper` | `#fff3d0` | primary text and paper panels |
| `--paper-dim` | `#d8caa8` | secondary copy (7.4:1 on ink) |
| `--brass` | `#f4be4f` | primary actions, active beat |
| `--brass-ink` | `#1b2733` | text on brass (9.2:1) |
| `--coral` | `#ef6b57` | route markers, warnings |
| `--mint` | `#6fd0ad` | saved/success state |
| `--danger` | `#ff8f7d` | destructive/error text |

All body text combinations target WCAG AA ≥4.5:1. Statuses use symbols and language as well as color.

## Type

Two local/system families only. Display type uses `Georgia, 'Times New Roman', serif` in uppercase with restrained tracking, echoing engraved destination boards without downloading a font. Utility text and numbers use `Arial, Helvetica, sans-serif`; counters use tabular figures. Scale: 13, 16, 20, 28, 40, and fluid 64px. Body text never falls below 16px.

## Spacing and shape

An 8px base rhythm: 4, 8, 12, 16, 24, 32, 48, 64. The desktop shell uses a 1200px maximum width. Controls are at least 44px; most are 48–56px. Poster corners are clipped, not softly rounded: `clip-path` or 2–4px radii suggest cut card stock. Group by proximity; ruled panels appear only for independently operable regions. A diagonal route stripe and concentric metronome arcs are the recurring geometry.

## Interaction grammar

- Brass means “act now”; cream means information; coral marks the current beat or a constraint.
- The main transport is visually dominant and remains in reach on a 390px screen.
- Range changes update the route preview and numeric readout immediately.
- Beat motion expands from the central lamp, matching the sound’s origin. Drill transitions move along the route, not as unrelated popups.
- Start/stop is available with Space when focus is not inside a field. Arrow keys operate native ranges. Escape closes dialogs.
- Every audio cue has a visual equivalent; optional vibration is a progressive enhancement with a labeled toggle.

## Motion policy

UI transitions last 160–240ms and use opacity/transform only. A single beat pulse lasts no more than 180ms and never flashes more than the actual selected tempo; above 180 BPM the visual pulse becomes a steady alternating ring to avoid >3 flashes/second. Under `prefers-reduced-motion: reduce`, route drawing and transforms are removed, the beat lamp changes state without scaling, and smooth scrolling is disabled. No decorative animation loops.

## Responsive intent

Desktop shows the transport beside the drill controls so adjustment and playback stay visible together. Below 760px the destination-board header condenses, the illustration becomes a shallow banner, controls stack in the musical reading order, and nonessential explanatory labels shorten. No fixed bottom bar obscures safe areas. The primary button stays full-width and all content fits at 320% zoom through reflow.

## Asset plan and provenance

### Generated hero: `tempo-line-hero`

- Use case: `stylized-concept`; wide hero illustration behind the product title.
- Subject/world: an abstract brass pendulum crossing a midnight transit map, with four stations representing drift, ramp, delayed beat, and recovery.
- Medium/materials: original flat screen print, slightly misregistered mineral inks on warm paper, crisp geometric rays, no photorealism.
- Light/lens: graphic poster lighting, wide horizontal composition, central-left focal point and calmer space at right.
- Palette words: midnight indigo, warm cream, burnished brass, signal coral, oxidized mint.
- Negative list: no people, no instruments with brands, no typography, no numbers, no logos, no watermark, no gradients, no UI screenshot, no fake text, no copyrighted characters.
- Prompt: “Use case: stylized-concept. Asset type: wide website hero illustration. Create an original art-deco transit poster for a precision tempo practice tool: an abstract brass metronome pendulum becomes a railway route crossing a midnight-indigo map, with four simple geometric station markers, concentric timing arcs, warm cream paper cutouts, signal-coral and oxidized-mint accents. Flat screen-print illustration, slightly misregistered mineral inks, crisp rays and strong diagonal movement, sophisticated 1930s travel-poster energy without copying any artist. Wide composition, focal pendulum left of center, quiet darker area on the right for interface overlap. No people, no brands, no typography, no numbers, no logos, no watermark, no gradients, no UI screenshot, no fake text, no copyrighted characters.”
- Generator: Factory Azure image generation via `/opt/fleet/lib/gen-image.sh`, deployment `factory-image`.
- License/provenance: generated specifically for Tempo Lab on 2026-08-28; original project asset. The shipped footer discloses AI-generated artwork.

Product icons, beat marks, route diagrams, and PWA icons are authored in SVG/CSS in this repository because they are precise interface geometry rather than illustrative raster art.
