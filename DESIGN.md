# Design system

Source of truth for the web app's look. If a style is not here, it should not be on a page.

## What the interface is

A working instrument for two people: the server at the counter (one hand, phone or tablet, in a hurry) and the kitchen manager at a desk (comparing, planning, checking). It reports weighed food. It should feel like a calibrated scale's display and a lab notebook, not a startup dashboard.

## Principles

1. **One dominant thing per screen.** Serve: the portion to serve. Learn: the three readings of one plate. Kitchen: how much to cook. Evidence: the like-for-like comparison.
2. **Numbers are the interface.** Quantities are set in a condensed, tabular face like an instrument readout. Units always follow the number.
3. **The plate is the unit of record.** The served-plate glyph with its returned arc is the signature mark. It appears wherever a plate is a row.
4. **Provenance is always visible.** Observed, predicted and simulated are stamped labels, never colour alone.
5. **Say what it does.** Buttons are verb + object ("Serve 3 scoops"). No marketing copy, no superlatives.
6. **Rules before boxes.** Sections are separated by whitespace and hairlines. A boxed surface is reserved for the one primary task area and for inputs.

## Research basis

Practitioner write-ups on why AI-built interfaces look alike, read on 11 Oct 2026 (blog posts and tool docs, not studies):
[Mowgli, "15 tells and fixes"](https://mowgli.ai/blog/why-ai-built-apps-look-the-same),
[Diffier, vibe-coded design tips](https://blog.getdiffer.com/design-tips-vibe-coded-project),
[Anti-slop prompt framework](https://moelkholy1995.medium.com/beyond-make-it-beautiful-the-anti-slop-framework-for-ai-frontend-craftsmanship-c99bbee6c994),
[AI slop design guide](https://vibecodekit.dev/ai-slop-design).
Recurring advice used here: derive colour and type from the subject rather than a stock palette; assign radius and shadow by role instead of uniformly; make one block dominant and separate the rest with rules; delete decorative icons, tracked all-caps eyebrows and stat strips; write specific copy; keep motion tied to actions.

## Typography

Self-hosted (`@fontsource`, no third-party requests).

| Role | Face | Use |
|---|---|---|
| Interface | IBM Plex Sans 400 / 500 / 600 | Labels, body, buttons, tables |
| Readout | IBM Plex Sans Condensed 500 / 600 | Page titles, quantities, large figures |
| Identifier | IBM Plex Mono 400 | Tokens, hashes, request ids |

Plex was chosen for its instrument and engineering lineage; it is a deliberate pair, not a fallback.

Scale (px / line-height): 12.5/1.4 note · 14/1.5 body · 16/1.5 lead · 20/1.3 section · 30/1.15 page · 64/1 readout. Size jumps are large on purpose. No all-caps tracked labels; labels are sentence case, 13 px, medium weight.

## Colour

Derived from the subject: a stainless serving tray, cooked rice, a green scale display, a weighing-error amber.

| Token | Value | Meaning |
|---|---|---|
| `--tray` | `#eef0ec` | Page ground: stainless-tray grey, slightly green |
| `--paper` | `#fbfbf9` | Primary work surface and inputs |
| `--ink` | `#16201a` | Text, primary rules |
| `--ink-2` | `#4a4f49` | Secondary text |
| `--muted` | `#6f746d` | Captions, units |
| `--rule` | `#cfd3cb` | Hairlines |
| `--scale` | `#1f6b43` | Primary action, "used as evidence" |
| `--scale-ink` | `#164d31` | Hover, text on tinted ground |
| `--amber` | `#9a5f0b` | Uncertainty, returned food, simulated |
| `--amber-wash` | `#f3e6c8` | Simulated / caution ground |
| `--signal` | `#a8302a` | Infeasible, error |
| `--s1` `--s2` `--s3` | `#2a78d6` `#eb6834` `#1baf7a` | Chart series only (validated for colour-blind separation) |

Rejected: purple/indigo gradients, glow, glass, neon on near-black, cream-and-terracotta.

## Space, grid, shape

- Spacing steps: 4, 8, 12, 16, 24, 40, 64 px. Page gutters 16 (phone) / 32 (desktop). Content max width 1180 px.
- Radius by role: inputs and buttons 3 px; the primary panel 4 px; stamped labels 2 px; plate glyphs are circles because plates are. No other radii.
- Shadow: none on content. One shadow, on toasts only.
- Borders are 1 px `--rule`, or `--ink` for the top rule of a section.

## Components

- **Navigation:** text links on one line with an ink underline on the current section. The mode (Demo or Pilot) is a stamped label at the right.
- **Buttons:** primary = solid `--scale`, one per screen region; secondary = 1 px ink outline; tertiary = text. Height 44 px (36 px dense). Label is verb + object. No arrows.
- **Forms:** label above, 44 px field, hint below in `--muted`. Units sit inside or after the field.
- **Tables:** no zebra, no box. Hairline between rows, numerals right-aligned and tabular, header in sentence case.
- **Stamped label:** 2 px radius, 1 px border, 12.5 px. Observed = `--scale`, Predicted = `--s1`, Simulated = `--amber`. Never filled.
- **Charts:** one y-scale, ink text, series colours from `--s1..3`, direct labels, legend when two or more series, a table alternative, units on axes.
- **Photo editor:** the photo is the workspace. Food is tinted amber with a solid edge, the plate rim is a dashed white ellipse, and taps are marked with a plus (include) or minus (exclude) so colour is never the only cue. One row of five tools, one hint line for the active tool, and a single readout: the food's share of the plate. Waiting states say what is happening and always offer the by-hand route.
- **Feedback:** inline for form errors and results; toast only for "saved". Errors say what failed and what to do.
- **Focus:** 3 px `--scale` outline at 45% opacity, offset 2 px, on every control.

## Responsive

Phone first for Serve and the return form: one column, the suggestion and its action above the fold, 44 px targets. Desktop adds the side log and the two-column Kitchen and Evidence layouts. No horizontal page scroll at 360 px; wide tables scroll inside their container.

## Rejected patterns

Hero followed by three feature cards · numbered 01/02/03 badges · tinted icon squares · emoji · stat-tile strips · uniform rounded cards · gradient text · blur and translucency · tracked all-caps eyebrows · fade-up on every section · hover-lift on cards · decorative illustration · invented metrics.
