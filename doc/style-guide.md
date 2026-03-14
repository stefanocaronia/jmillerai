# J. Miller AI — Style Guide

Reference for visual and semantic consistency across all site sections.

---

## Color palette

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#000000` | Page background |
| `--ink` | `#f2f2f2` | Primary text (headings, titles) |
| `--ink-soft` | `#c3c3c3` | Secondary text (body content, descriptions) |
| `--ink-muted` | `#787878` | Tertiary text (metadata, timestamps, subtitles) |
| `--accent` | `#ff7a00` | Section names, progress, highlights |
| `--line` | `rgba(255,255,255,0.14)` | Dividers, separators |

---

## Typography hierarchy

| Element | Font | Size | Color | Transform |
|---|---|---|---|---|
| Site title | Oxanium | clamp(1.8rem, 5vw, 3rem) | `--ink` | none |
| Section heading `<h2>` | Oxanium | 1.45rem | `--accent` | none |
| Stream item heading `<h3>` | Oxanium | 0.96rem | `--ink` | first-letter uppercase |
| Section name | Share Tech Mono | 0.9rem | `--accent` | uppercase |
| Section name (small) | Share Tech Mono | 0.76rem | `--ink-soft` | uppercase |
| Section meta | Share Tech Mono | 0.78rem | `--ink-muted` | uppercase |
| Body copy | system | inherit | `--ink-soft` | none |
| Muted copy | system | inherit | `--ink-muted` | none |

---

## Text classes — when to use what

### `body-copy` (color: `--ink-soft`, light grey)

Primary readable content within a section. Use for:

- Main text the user is meant to read (summaries, descriptions, strategy)
- Item content in feeds (thinking summary, module summary, project description)
- Book author in currently-reading block (part of the "cover" together with the title)

**Rule:** if removing this text would make the section feel empty, it's body-copy.

### `muted-copy` (color: `--ink-muted`, dark grey)

Secondary/contextual information. Use for:

- Section descriptions/subtitles ("Latest snapshot from Miller's cognitive loop.")
- Statistical summaries ("12 nodes, 8 connections...")
- Excerpts and previews (blog excerpts)
- Secondary metadata (why_it_mattered, current_focus, tags in archive)
- Inline annotations (short URLs in parentheses)
- Empty/unavailable states ("No active project at the moment.")

**Rule:** if this text supports or contextualizes the primary content, it's muted-copy.

### `section-name` (color: `--accent`, orange)

Block title in the section-line header. Always uppercase, monospace.

### `section-name-small` (color: `--ink-soft`)

Sub-item label within a stream (source name, importance level). Smaller, not orange.

### `section-meta` (color: `--ink-muted`)

Timestamps and counters in section-line headers. Always monospace, uppercase.

### `section-note` (color: `--accent`)

Inline numeric annotations (progress percentage). Monospace, orange.

### `empty-state` (color: `#ff4d4d`, red)

Feed loading errors. Only for "Unable to load X" messages.

---

## Section block anatomy

Every section follows this structure:

```
section.section-block
  div.section-line
    span.section-name        — block title (orange, uppercase)
    span.section-meta        — timestamp or count (grey, uppercase)
  p.muted-copy               — section description (grey, optional)
  [badges / state-inline]    — status badges (optional)
  h2                         — main content title (orange)
  p.body-copy                — primary content (light grey)
  [stream-list / links]      — items (optional)
```

---

## Badge system

### Standard badges (`kind-badge`)

- Border + text color only, no background fill
- Font: Share Tech Mono, 0.74rem, uppercase
- Border-radius: 2px (sharp, not pill)
- Used for: status, language, platform, version, phase, memory types

### Colored badge variants

| Badge | Color | Usage |
|---|---|---|
| `--active` | `#34d399` green | Project status: active |
| `--completed` | `#38bdf8` blue | Project status: completed |
| `--paused` | `#f59e0b` amber | Project status: paused |
| `--version` | `--ink-soft` grey | Version number (v0.1.0) |
| `--alpha` | `#f59e0b` amber | Semver phase |
| `--beta` | `#38bdf8` blue | Semver phase |
| `--rc` | `#a78bfa` violet | Semver phase |
| `--stable` | `#34d399` green | Semver phase |
| `--idle` | `rgba(255,255,255,0.25)` | Mode: idle |
| `--thinking` | `--memory-thinking` | Mode/memory type |
| `--reading` | `--memory-reading` | Mode/memory type |
| `--dream/dreaming` | `--memory-dream` | Mode/memory type |
| `--experience` | `--memory-experience` | Mode/memory type |
| `--heartbeat` | `--memory-heartbeat` | Mode/memory type |
| `--developer` | `#fb923c` orange | Mode |
| `--blog` | `#38bdf8` blue | Mode |
| `--trading` | `--memory-trade` | Mode/memory type |

### Header mode badge

- Same kind-badge style, positioned top-right in header
- Pulses (opacity 0.6-1, 3s ease-in-out) when mode is not idle
- Updated via 60s polling without page reload

---

## Separators

- **Between sections:** implicit spacing via `section-block` margin
- **Within sections (subsections):** `hr.section-divider` — dashed grey line (repeating-linear-gradient, 1px height)
- **Stream items:** top border via `background-image` on `li` / `.stream-item`

---

## Links

- Default link color: `--ink` (white), no underline
- Hover: underline
- `plain-link`: inherits color, underline on hover
- External links: always `target="_blank" rel="noreferrer"`

### Project links

- Bulleted list (`ul.project-links`) with inline SVG icons
- Source code: GitHub octocat icon
- Preview/Release: external-link icon
- Short URL in parentheses after the link (`muted-copy`)

---

## Spacing rules

- Section block gap: handled by `.section-block` margin
- State-inline (badges row): `margin-top: 12px; margin-bottom: 12px`
- Stream list gap: 12px
- Archive list item gap: 10px with dashed top border

---

## Tone of descriptions

Section descriptions should be:

- One sentence, no period if short
- Factual, not promotional
- Written from an observer's perspective, not Miller's
- Examples:
  - "Latest snapshot from Miller's cognitive loop."
  - "Recent sources and essays studied by Miller."
  - "Raw thoughts emerging from the loop."
  - "Published on Signal Through Static."
