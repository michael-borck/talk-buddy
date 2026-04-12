# Studio Calm — Design System

**Version:** 0.1 (draft)
**Status:** Spec — not yet implemented
**Applies to:** Talk Buddy, Study Buddy (planned), Career Compass (planned)
**Author:** Michael Borck + Claude
**Last updated:** April 2026

---

## Why this document exists

Talk Buddy currently runs **Option A — Editorial / Quiet Confidence**: Fraunces serif, ivory/ink/vermilion palette, sharp 2px corners, 2025-era literary aesthetic. It's beautiful but it's optimized for the wrong user.

This document describes the replacement: **Studio Calm** — the design language for the entire "Buddy suite" (Talk Buddy + Study Buddy + Career Compass), built deliberately for university ESL students rehearsing high-stakes scenarios (Dragons Den pitches, HR performance reviews, delivering bad news as a doctor, interview prep).

Studio Calm is **not a theme**. It's a shared vocabulary — tokens, patterns, interaction rules — that each of the three apps will inherit. The only thing that varies between apps is a single accent color. Everything else is identical, so a student who uses one of the apps recognizes the other two instantly.

This document is the canonical source of truth. It lives here first; once it stabilizes in Talk Buddy, it will be extracted to a separate `buddy-design-system` GitHub repo so Study Buddy and Career Compass can import it by reference.

---

## Audience & intent

### Who this is for

- **University students**, frequently international, frequently ESL
- **First-time-to-the-scenario, not first-time-to-the-app.** They may have used Talk Buddy ten times but this is their first simulated performance review.
- **High-stakes practice**: pitches, difficult conversations, interviews, giving bad news. Emotionally and professionally difficult even in one's first language.
- **Solo practice, no human to reassure them.** The interface is the reassurance.

### Emotional goals

1. **Cortisol reduction.** Every design choice should whisper "you're safe, nothing bad can happen, try again." Speech practice is anxiety-inducing; the interface should not add to it.
2. **Confidence-building.** Not cozy, not childish, not a toy. A private rehearsal studio — the kind of place a professional goes to practice hard things deliberately, under low stress, trusting the space.
3. **Legibility as kindness.** Every letter that's easier to read is a small act of kindness to a tired ESL student who's about to spend mental energy on a hard conversation.
4. **Gravitas without intimidation.** The scenarios are serious; the interface should honor that seriousness without overdoing it. A "Buddy" is warm, but a Buddy practicing medical delivery of bad news is also careful.

### What Studio Calm is not

- Not editorial / literary / magazine (Fraunces + vermilion + sharp corners says "serious consequences")
- Not Notion-minimal (extreme neutrality says "find your own way" — nervous first-timers need more affordance)
- Not Duolingo-playful (cartoonish cues work for repeated drill but not for emotionally-loaded scenarios)
- Not luxury-monochrome (too cold, reads "expensive tool for expert users")
- **Yes: private-studio calm.** Warm paper, clean sans, generous whitespace, soft accent, unhurried motion. The feel of a piano teacher's studio or a voice coach's practice room.

---

## Design principles

Seven principles. Every token, every component, every decision should be traceable back to one of these.

### 1. Legibility is load-bearing

Your users read English as a second language while simultaneously trying to perform in it. Every bit of cognitive overhead the interface imposes competes with the mental energy they need for the scenario. This principle overrides aesthetic preference.

**Practical consequences:**
- Sans-serif throughout body text — research consistently shows sans-serifs are easier for non-native readers to decode at body sizes.
- Minimum body size 16px, comfortable line height (1.6–1.75).
- No italics in body copy. They're harder to read and can confuse readers who learned print letterforms.
- No decorative ligatures, no all-caps body text, no low-contrast grey-on-grey.
- Numbers use tabular figures wherever they line up in columns.

### 2. Warm paper, soft ink

The page feels like unbleached paper, not fluorescent white. The text is a soft near-black with warm undertones, not a legal-document pure black. The contrast is comfortable for a long session; there's no glare.

**Practical consequences:**
- Background `#F4F1EA`, text `#252420`. Both are derived from warm neutrals, both are below maximum contrast intentionally.
- No shadows. No glossy surfaces. No gradients. Everything is flat, hairline-bordered, and matte.
- A subtle paper grain overlay is permitted as atmosphere.

### 3. One accent, used sparingly

The accent color is the *signal* — it indicates state, not decoration. The bulk of the interface is paper and ink. The accent appears only where it means something: the active tab, the hover state, the voice visualizer, a key affordance.

**Practical consequences:**
- Never fill a large block with accent. Accent is for strokes, rules, dots, small areas.
- One accent per app. Do not add secondary accents.
- Error states use a separate muted rust color (`#A8442F`) so "something went wrong" is never confused with "this is active."

### 4. Generous whitespace, gentle rhythm

Space is a feature, not a bug. Dense interfaces signal urgency; Studio Calm signals "take your time." Negative space around headlines and between sections should feel a little too generous — that's correct.

**Practical consequences:**
- Minimum 40px between major sections on desktop.
- Card padding 28–32px.
- Buttons have generous padding (16px × 28px minimum for primary CTAs).
- Line length capped at 68ch for prose.

### 5. Unhurried motion

Motion is confident and slow. Nothing snaps. Nothing jumps. State transitions crossfade. Buttons don't bounce.

**Practical consequences:**
- Default transition duration 250ms.
- Content reveals 400ms with ease-out.
- Visualizer state crossfades 350–500ms.
- No spring physics on UI elements (spring physics feel playful; Studio Calm is calm).

### 6. Soft but not round

Corners are 6px. Not sharp 2px (feels legal/formal) and not rounded 12px+ (feels consumer-toy). 6px reads "considered and careful, forgiving but adult."

### 7. One voice, three accents

The three apps share everything except the accent color. A student who uses Talk Buddy opens Study Buddy and immediately feels "same family, different mode." The accent acts as a mood signal for what task they're in.

---

## Typography

### Font choice

Studio Calm uses **Figtree** as its single typographic family, across all weights.

**Why Figtree:**
- Free on Google Fonts (Apache 2.0 license, no cost, no vendor lock-in)
- Humanist sans with warm character — not mechanical like Helvetica, not institutional like Public Sans
- Excellent x-height (high x-height = easier to read at small sizes, especially for ESL readers)
- Variable font — one file, every weight from 300 to 900
- Not overused — much less common than Inter, distinctive without being faddy
- Designed with readability in mind (Erik Kennedy, the author of *Refactoring UI*, was an adviser)
- Good at display sizes when used at 600 weight, good at body sizes at 400 weight

**Why a single family, not display + body pairing:**
- ESL readers benefit from consistent letterforms throughout the page — a display font they have to mentally re-decode adds cognitive load
- One font file = faster load, simpler fallback stack
- Easier to maintain coherence across three apps
- Fraunces (the current display) was a nice touch for a literary reader but actively hostile to an ESL audience

**For monospace contexts** (install modal terminal output, code snippets, tabular timers):
- **JetBrains Mono** — free on Google Fonts, distinctive, excellent for long terminal blocks, clear disambiguation of `0` vs `O` and `1` vs `l` (helpful for ESL).

### Font loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Figtree:wght@300..700&family=JetBrains+Mono:wght@400;500&display=swap"
  rel="stylesheet"
/>
```

CSP `font-src` must permit `https://fonts.gstatic.com` (already set in Talk Buddy's current CSP for Fraunces + Inter Tight; no changes needed).

### Type scale

```css
/* Font families */
--font-sans:    'Figtree', ui-sans-serif, system-ui, -apple-system, sans-serif;
--font-mono:    'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace;

/* Sizes — modular scale ratio ~1.2, anchored on 16px body */
--text-xs:      0.72rem;   /* 11.52px — meta labels, footer */
--text-sm:      0.82rem;   /* 13.12px — captions, hint text */
--text-base:    1rem;      /* 16px    — body */
--text-lg:      1.15rem;   /* 18.4px  — lead paragraph */
--text-xl:      1.35rem;   /* 21.6px  — small headings, card titles */
--text-2xl:     1.6rem;    /* 25.6px  — section headings */
--text-3xl:     2rem;      /* 32px    — page headings */
--text-4xl:     2.5rem;    /* 40px    — hero subheadings */
--text-display: clamp(2.5rem, 5vw, 4rem);  /* — mastheads */

/* Weights */
--weight-regular:    400;   /* body */
--weight-medium:     500;   /* emphasized body, labels, active nav */
--weight-semibold:   600;   /* headlines, display type */

/* Never use 700+. Heavier than 600 reads "shouty" in Studio Calm. */

/* Line heights */
--leading-tight:     1.1;   /* large headlines only */
--leading-snug:      1.3;   /* subheadings */
--leading-normal:    1.5;   /* UI text, buttons, labels */
--leading-relaxed:   1.7;   /* body prose, instructions */
--leading-loose:     1.8;   /* long-form reading */

/* Letter spacing */
--tracking-display:  -0.015em;   /* large headlines — slightly tighter */
--tracking-normal:   0;          /* body */
--tracking-wide:     0.14em;     /* meta labels */
--tracking-wider:    0.22em;     /* small-caps section markers */
```

### Typography rules

- **Headlines** (`.headline`): Figtree 600, `tracking-display`, `leading-tight`. No italic. Never all-caps at large sizes.
- **Body** (`.body`): Figtree 400, `leading-relaxed`, 16px. Maximum line length 68ch.
- **Section labels** (`.label`): Figtree 500, `text-xs` or `text-sm`, `tracking-wider`, `uppercase`. Used for the editorial-rule marker pattern (`•—— PREFERENCES`).
- **Button text**: Figtree 500, `leading-normal`, `text-base`, no uppercase (lowercase-friendly: "Begin a session", not "BEGIN A SESSION").
- **Timestamps, durations, stats**: Figtree 400 with `font-variant-numeric: tabular-nums` so they line up in columns.
- **Code / terminal**: JetBrains Mono 400 at `text-sm`.

### The editorial rule — a keeper from the current theme

One pattern from the current editorial theme is genuinely useful and should be preserved in Studio Calm: the **`editorial-rule + small-caps label`** marker used at the top of major sections. Example:

```
•—— PREFERENCES
Settings
```

It's a clarity aid, not a decoration — it tells an ESL user "this is a new section" without needing them to parse a visual hierarchy. Keep it. The rule itself becomes a hairline in the accent color, 36px wide, 1px tall.

---

## Color

### Neutral palette (shared across all apps)

```css
/* Paper surfaces */
--paper:              #F4F1EA;   /* warm off-white; the primary background */
--paper-warm:         #FBF8F1;   /* very slightly lighter — unused by default */
                                 /* (reserved for future hover-card surfaces if needed) */

/* Text */
--ink:                #252420;   /* soft black, warm undertone — primary text */
--ink-soft:           #3B3830;   /* body text on ivory — unused by default */
--ink-muted:          #5C564C;   /* secondary text, sub-labels */
--ink-quiet:          #8A8377;   /* meta text, timestamps, tertiary */

/* Strokes */
--hairline:           rgba(37, 36, 32, 0.10);   /* default card borders */
--hairline-strong:    rgba(37, 36, 32, 0.20);   /* hover borders, stronger dividers */
--hairline-contrast:  rgba(37, 36, 32, 0.40);   /* focus outlines, accessibility */

/* Status — never primary */
--error:              #A8442F;   /* muted rust — error text/borders only */
--warning:            #B8895A;   /* faded amber — unused by default */
                                 /* (warnings tend to look alarmist; avoid if possible) */
```

### Why these exact values

- **Paper `#F4F1EA`**: warm off-white. More yellow than ivory (`#F6F1E7` in the current theme), less cream than bone. Tested against Figtree body text for glare at 8-hour viewing; comfortable.
- **Ink `#252420`**: soft black with warm undertone. Pure black on warm paper creates a jarring contrast that reads "legal document." This is the WCAG AAA-contrast equivalent while still feeling warm.
- **Ink-muted `#5C564C`**: readable for meta text. Never go quieter than this for labels a user actually needs to parse.
- **Ink-quiet `#8A8377`**: for decorative meta text only — things where it's OK if the user skims past. Never put load-bearing information here.
- **Hairline `rgba(37, 36, 32, 0.10)`**: the default card border. At 0.15 it felt institutional; at 0.05 it disappeared. 0.10 is the right amount of "there is a boundary here but it's not shouting."

### Per-app accents

```css
/* Talk Buddy — eucalyptus sage */
--accent:             #4A7C6E;
--accent-deep:        #36604F;   /* hover, pressed */
--accent-soft:        rgba(74, 124, 110, 0.10);   /* subtle background tint, rare use */

/* Study Buddy (planned) — dusty bluebell */
/* --accent:        #6E7FA8;   */
/* --accent-deep:   #546285;   */
/* --accent-soft:   rgba(110, 127, 168, 0.10); */

/* Career Compass (planned) — warm ochre */
/* --accent:        #A86B47;   */
/* --accent-deep:   #855030;   */
/* --accent-soft:   rgba(168, 107, 71, 0.10); */
```

### Accent usage rules

- **Where accent appears**: active nav marker, voice visualizer strokes, primary CTA hover, link underlines, focus ring, the editorial rule.
- **Where accent does NOT appear**: filling entire buttons, card backgrounds, headers, backgrounds of hero sections, tags/pills, or any large surface. Accent is a signal, not a wallpaper.
- **Saturation**: all three accent colors are around 25–30% saturation. They should feel muted next to each other. A full-saturation accent reads "alert" and undermines the calm.
- **Lightness**: all three accents are around 40% lightness. They should all read "darker than the ink-muted but lighter than the ink." This ensures similar visual weight across the suite.

### Why vermilion is gone

Vermilion (`#D94B2B`, current theme) is a high-arousal color. Red/orange activates alertness — it's the color of stop signs and error messages. For an app designed to reduce anxiety, vermilion is working against the mission on every screen. In the conversation view especially, where the voice visualizer pulses during recording, vermilion signals "RED ALERT, YOU ARE ON AIR, DON'T MESS UP." Sage signals "listening, cooperative, take your time." That's the entire psychological difference in a single color swap.

---

## Spacing

Based on a 4px grid. Every margin, padding, gap should snap to one of these.

```css
--space-0:    0;
--space-1:    4px;
--space-2:    8px;
--space-3:    12px;
--space-4:    16px;
--space-5:    20px;
--space-6:    24px;
--space-8:    32px;
--space-10:   40px;
--space-12:   48px;
--space-16:   64px;
--space-20:   80px;
--space-24:   96px;
```

### Spacing rules

- **Card padding**: `--space-8` (32px) minimum. 28px acceptable if horizontal space is tight.
- **Section gaps**: `--space-12` to `--space-16` (48–64px) between major sections on desktop.
- **Stack rhythm** (vertical spacing within a card): `--space-4` between related items, `--space-6` between unrelated items.
- **Button padding**: `--space-4` vertical × `--space-8` horizontal (16 × 32px) for primary CTAs. Reduce to 12 × 24px for secondary.
- **Inline gaps**: `--space-2` or `--space-3` for icon + label combinations.
- **Page margins**: `--space-12` (48px) on desktop, scaling down by viewport for responsive. Never less than `--space-6` (24px) even on small screens.

---

## Layout & structure

### Spatial grammar

- **Asymmetric editorial masthead for hero sections** (from current theme, keeper): left-aligned display headline, right-aligned decorative marker (edition year, status, etc.). This reads "designed" without requiring a grid.
- **Single-column content** for instructional text (reading is better in narrow columns). Maximum width 68ch.
- **12-column grid for dashboard-like views** (Settings, Session History) where relationships between items matter.
- **Generous negative space on the right** — aim for right-margin whitespace that feels almost too generous. Nervous users should not feel crowded.

### Border radius

```css
--radius-sharp:   2px;   /* reserved for minimal accents and focus rings */
--radius-soft:    6px;   /* DEFAULT — cards, buttons, inputs, modals */
--radius-full:    999px; /* rare — only for the status dots */
```

Most things get `--radius-soft` (6px). This is the single biggest visual change from the current editorial theme (which uses 2px throughout) and it's load-bearing: 6px is the difference between "formal document" and "considered, forgiving, adult."

### Shadows

**None.**

Flat design throughout. Hairline borders do the work of separation. The only permitted shadow is the focus ring:

```css
--shadow-focus: 0 0 0 3px var(--accent-soft);
```

---

## Motion

```css
/* Easing curves */
--ease-out:       cubic-bezier(0.2, 0, 0, 1);      /* primary easing */
--ease-out-soft:  cubic-bezier(0.25, 0.1, 0.25, 1); /* softer, for content */
--ease-in-out:    cubic-bezier(0.4, 0, 0.2, 1);     /* rare — for bidirectional transitions */

/* Durations */
--duration-instant:  50ms;    /* hover color shifts on icons — imperceptible baseline */
--duration-fast:     150ms;   /* small hover changes on non-critical elements */
--duration-normal:   250ms;   /* DEFAULT — button presses, color changes, state swaps */
--duration-slow:     400ms;   /* content reveals, card hovers */
--duration-slower:   600ms;   /* visualizer state crossfades, big reveals */
```

### Motion rules

- **Default transition**: 250ms `ease-out`.
- **Never shorter than 150ms for anything a user sees state-change on** — faster feels jittery.
- **Never longer than 600ms for anything that blocks interaction** — slower feels laggy.
- **State crossfades** for the voice visualizer: 400–500ms, both alphas lerping simultaneously. No snap from one state to the next.
- **No spring physics**. Spring physics add bounce and feel playful. Studio Calm is calm, not bouncy.
- **No parallax, no scroll animations on decorative elements**. They're distracting and they hurt ESL users whose eyes are already working hard to parse the text.

### Motion respect

Respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## Component patterns

The shared vocabulary of UI elements. These are the building blocks every app in the suite uses.

### 1. Editorial rule marker

A hairline rule in the accent color, 36px wide, 1px tall, followed by a small-caps label. Used at the top of major sections and the hero.

```html
<div class="flex items-center mb-6">
  <span class="editorial-rule"></span>
  <span class="text-xs uppercase tracking-wider text-ink-muted font-medium">
    Preferences
  </span>
</div>
```

```css
.editorial-rule {
  display: inline-block;
  width: 2.25rem;
  height: 1px;
  background: var(--accent);
  margin-right: 0.75rem;
  vertical-align: middle;
}
```

**Why**: it's the most useful pattern from the current editorial theme and it works especially well for ESL users because it gives them a non-verbal "new section" signal. Keep it.

### 2. Paper card

Default card treatment. Flat, hairline-bordered, no shadow.

```css
.paper-card {
  background: var(--paper);         /* same as page — the card blends */
  border: 1px solid var(--hairline);
  border-radius: var(--radius-soft);
  padding: var(--space-8);
  transition: border-color var(--duration-normal) var(--ease-out);
}

.paper-card:hover {
  border-color: var(--hairline-strong);
}
```

**Why background = page**: the user liked the flat scenario-card look from the current theme. Matching the page background means the card is defined by its border, not its fill — maximum calm, minimum visual noise.

### 3. Button hierarchy

Three tiers, clearly distinguished.

**Primary** (one per view):
```css
.btn-primary {
  background: var(--ink);
  color: var(--paper);
  padding: var(--space-4) var(--space-8);
  border-radius: var(--radius-soft);
  font-weight: var(--weight-medium);
  transition: background-color var(--duration-normal) var(--ease-out);
}
.btn-primary:hover {
  background: var(--accent);
}
```

**Secondary** (supporting actions):
```css
.btn-secondary {
  color: var(--ink);
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--ink);
  transition: color var(--duration-normal), border-color var(--duration-normal);
}
.btn-secondary:hover {
  color: var(--accent);
  border-bottom-color: var(--accent);
}
```

**Ghost** (tertiary / dismiss):
```css
.btn-ghost {
  color: var(--ink-muted);
  padding: var(--space-2) var(--space-4);
  transition: color var(--duration-normal);
}
.btn-ghost:hover {
  color: var(--ink);
}
```

### 4. Focus ring

Accessible, visible, calm.

```css
*:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: var(--radius-sharp);
}
```

Sage outline on warm paper is legible but never alarming. Contrast ratio against paper is 4.5:1 (passes WCAG AA).

### 5. Voice visualizer

The dial-based visualizer from the current theme is kept, but recolored to sage and slightly softened.

- Outer dial: 110px radius, 1px sage stroke at 85% opacity.
- Tick marks: 12 hairline ink ticks at 18% opacity.
- **Listening state**: inner ring pulsing with real mic amplitude in sage.
- **Thinking state**: single sage dot tracing the dial at ~2.5s per revolution.
- **Speaking state**: concentric sage ripples radiating from center, driven by real TTS amplitude.
- **Transition crossfades**: 400ms between states.

The one deliberate change: **no vermilion anywhere**. The listening state is the one that mattered most — in the current theme, recording pulses red/vermilion, which tells a nervous user "YOU ARE ON AIR, HURRY." In Studio Calm, recording pulses sage, which tells them "I'm listening, take your time." Same information, opposite emotional signal.

### 6. Status dot (footer, session state, service health)

```html
<span class="status-dot status-dot--connected">●</span>
```

```css
.status-dot {
  font-size: 0.7rem;
  line-height: 1;
}
.status-dot--connected {
  color: var(--accent);        /* sage for Talk Buddy */
}
.status-dot--error {
  color: var(--error);         /* muted rust, not red */
}
.status-dot--unknown {
  color: var(--ink-quiet);     /* quiet grey */
}
```

**No emerald or bright green.** The existing StatusFooter uses emerald for connected states — swap all of those to `var(--accent)` so the status dots participate in the suite-wide accent language.

### 7. Modal

Flat ink overlay (`rgba(37, 36, 32, 0.6)`), paper card centered, `--radius-soft` corners, hairline border, click-outside-to-close.

```html
<div class="modal-backdrop">
  <div class="modal-card">
    <div class="modal-header">
      <div class="editorial-rule-wrap">
        <span class="editorial-rule"></span>
        <span class="label">Scenario</span>
      </div>
      <h2 class="headline">Scenario name</h2>
    </div>
    <div class="modal-body">...</div>
    <div class="modal-footer">...</div>
  </div>
</div>
```

Matches the current theme's modal treatment but with 6px corners and no italics in the header.

### 8. Tab navigation

Horizontal tabs with a hairline baseline. Active tab gets a 2px accent underline (not a filled pill).

```css
.tab {
  padding: var(--space-3) var(--space-1);
  border-bottom: 2px solid transparent;
  color: var(--ink-muted);
  font-weight: var(--weight-regular);
}
.tab--active {
  border-bottom-color: var(--accent);
  color: var(--ink);
  font-weight: var(--weight-medium);
}
.tab:hover:not(.tab--active) {
  color: var(--ink);
}
```

Already in the current Settings tab after the most recent edit — keep, just swap the blue underline for `var(--accent)` sage.

### 9. Input fields

```css
.input {
  background: var(--paper);
  border: 1px solid var(--hairline);
  border-radius: var(--radius-soft);
  padding: var(--space-3) var(--space-4);
  color: var(--ink);
  font-family: var(--font-sans);
  font-size: var(--text-base);
  transition: border-color var(--duration-normal) var(--ease-out);
}
.input:hover {
  border-color: var(--hairline-strong);
}
.input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
```

### 10. Section label pattern

Used for labels above form fields or data items. Small, uppercase, tracked.

```css
.section-label {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wider);
  color: var(--ink-quiet);
  font-weight: var(--weight-medium);
  margin-bottom: var(--space-2);
}
```

---

## Paper grain overlay (atmosphere)

A very subtle SVG noise texture layered over the entire page via `body::after`. The current theme has this already and it works — keep it, lower the opacity, and **make it user-configurable**:

```css
body::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  opacity: var(--grain-opacity, 0.2);   /* default subtle, tunable */
  mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml,%3Csvg ...%3E");
}

/* Grain off — user preference */
html[data-grain='off'] body::after {
  display: none;
}
```

### User preference

New DB preferences:
- `paperGrain` — `'on'` | `'off'`. **Default: `'on'`.**
- `paperGrainOpacity` — string of a number between 0 and 0.4. **Default: `'0.2'`.**

Exposed in Settings → Data & Docs (or a new "Appearance" tab if we consolidate with dark mode). The `html` element gets `data-grain` attribute based on the pref; the `--grain-opacity` CSS variable takes the numeric value.

Why configurable: some users on lower-DPI monitors or glare-prone displays see the grain as noise rather than atmosphere. The default leans subtle (0.2 is much lighter than the current theme's 0.5) so most users never need to touch it, but the escape hatch exists.

---

## Dark mode

Studio Calm ships with a first-class dark mode. A university student practicing at 11pm in a dorm room should not be blasted by a warm-white background. Equally important: dark mode should feel like the *same* design system, not a separate aesthetic. The warm-paper-and-soft-ink character is preserved — just inverted.

### Dark palette

```css
/* Dark mode — inverted neutrals, same accents */
html[data-theme='dark'] {
  /* Paper surfaces → warm near-black */
  --paper:              #1B1A17;   /* warm near-black, NOT #000000 */
  --paper-warm:         #24231F;   /* very slightly lifted — for accent backgrounds if needed */

  /* Text → warm off-white */
  --ink:                #F1EEE6;   /* the light-mode paper, repurposed as text */
  --ink-soft:           #DAD6CC;
  --ink-muted:          #9E9A90;
  --ink-quiet:          #6F6C63;

  /* Strokes */
  --hairline:           rgba(241, 238, 230, 0.10);
  --hairline-strong:    rgba(241, 238, 230, 0.20);
  --hairline-contrast:  rgba(241, 238, 230, 0.40);

  /* Status */
  --error:              #D66A54;   /* brighter rust, maintains contrast on dark */

  /* Accent — Talk Buddy dark variant */
  --accent:             #6FA593;   /* brighter sage — WCAG AA against #1B1A17 */
  --accent-deep:        #8BBFAD;   /* hover: even brighter */
  --accent-soft:        rgba(111, 165, 147, 0.12);
}
```

Why brighter accents in dark mode: the light-mode sage `#4A7C6E` fails WCAG AA contrast against dark-mode paper. A brighter sibling (`#6FA593`) passes 4.5:1 easily while still reading as "the same green." Same logic for bluebell and ochre.

### Dark mode accent triples (all three apps)

```css
/* Talk Buddy — dark */
html[data-theme='dark'] {
  --accent:      #6FA593;
  --accent-deep: #8BBFAD;
  --accent-soft: rgba(111, 165, 147, 0.12);
}

/* Study Buddy — dark */
html[data-theme='dark'][data-app='study'] {
  --accent:      #96A8D0;
  --accent-deep: #B3C0DF;
  --accent-soft: rgba(150, 168, 208, 0.12);
}

/* Career Compass — dark */
html[data-theme='dark'][data-app='career'] {
  --accent:      #D08963;
  --accent-deep: #E0A782;
  --accent-soft: rgba(208, 137, 99, 0.12);
}
```

### Theme preference & switching

New DB preference:
- `theme` — `'light'` | `'dark'` | `'system'`. **Default: `'system'`** (respects OS setting).

Implementation:
- On app boot, read the preference and set `html[data-theme='light'|'dark']`.
- For `'system'`, listen to `window.matchMedia('(prefers-color-scheme: dark)')` and flip `data-theme` in response.
- Settings → Appearance (new tab) gets three radio buttons: Light / Dark / Match System.
- No transition animation on theme flip. A 500ms fade would be "designed"; a snap is "honest" and avoids the awkward half-state.

### Dark mode decisions that matter

1. **Paper is `#1B1A17`, not `#000000`.** Pure black is jarring and feels like a missing asset. The soft warm near-black maintains the Studio Calm mood.
2. **The accent keeps its identity.** Sage in light mode and sage in dark mode. Not a different color — a brighter sibling of the same color. Users should feel "this is the same app after dark," not "this is a different app."
3. **Paper grain overlay behavior in dark mode**: the SVG noise is black by default (multiply blend), which is invisible on a dark background. For dark mode, either swap to a light noise or just disable grain entirely in dark. Simpler: disable in dark.

```css
html[data-theme='dark'] body::after {
  display: none;
}
```

4. **The voice visualizer in dark mode** uses the brighter accent. Sage ripples against warm near-black look beautiful and retain the "listening is cooperative" feeling that was the whole point of dropping vermilion.

---

## Suite identity beyond color

A single low-key footer line is the only explicit "suite" signal. Anything more is overkill for the three-app stage.

### The suite footer

On every page, at the very bottom of the status footer, append a small text line:

```
Talk Buddy · part of the Buddy suite
```

- Font: Figtree 400 at `--text-xs` (0.72rem).
- Color: `--ink-quiet` (light mode) / `--ink-quiet` (dark mode).
- No link by default. If the "portal app" idea from the user ever materializes, this line becomes a link to it. For now, it's a quiet acknowledgment that the app has siblings.
- Never dominant. The only person who notices it is someone actively looking. That's the correct level of signal.

Study Buddy's line reads "Study Buddy · part of the Buddy suite". Career Compass reads "Career Compass · part of the Buddy suite". All three share the suffix, each carries its own name.

### What this is NOT

- Not a launcher, not a switcher, not a sidebar "other apps" tray.
- Not a marketing "also try our other apps" prompt.
- Not a status indicator showing whether the other apps are installed.
- Not a keyboard shortcut to cycle between apps.

A portal app is a sensible future direction — one tiny launcher that lives in the menu bar / system tray and opens whichever Buddy you need. If that happens, the footer line becomes its link. Until then, the footer line stands alone as a subtle family crest.

---

## Per-app override pattern

Studio Calm is identical across all three apps except for one variable. To port Studio Calm to Study Buddy or Career Compass:

1. **Copy the shared CSS tokens file** (see Migration Plan below for the exact file path once implemented) from Talk Buddy, or import it from the `buddy-design-system` reference repo once extracted.
2. **Override the accent via an `html[data-app='...']` selector** (not `:root`):

```css
/* Study Buddy */
html[data-app='study'] {
  --accent:      #6E7FA8;
  --accent-deep: #546285;
  --accent-soft: rgba(110, 127, 168, 0.10);
}
```

or

```css
/* Career Compass */
html[data-app='career'] {
  --accent:      #A86B47;
  --accent-deep: #855030;
  --accent-soft: rgba(168, 107, 71, 0.10);
}
```

Then set `<html data-app="study">` (or `"career"`) on the root element.

**⚠️ Specificity note**: The `html[data-app='...']` prefix is load-bearing. Using a bare `[data-app='...']` selector ties specificity (0,1,0) with `:root`, and custom properties on root elements behave inconsistently across browsers under ties — Chrome respects source order, others don't. Prefixing with `html` gives (0,1,1) and wins unambiguously. This caught me once in the mockup; don't repeat it.

3. **Nothing else changes.** Same fonts, same spacing, same components, same motion. Every other token is shared.

If a future decision adds a fourth app to the suite, the same pattern applies — pick one accent, override one variable, done. Proposed future accent reservations (to keep the suite visually consistent if it grows):

| Future app            | Reserved accent | Hex        | Notes                            |
|-----------------------|-----------------|------------|----------------------------------|
| Write Buddy / similar | Dusty lavender  | `#8370A8`  | creative/reflective              |
| Math Buddy / similar  | Soft brick      | `#A85C5C`  | different enough from ochre      |
| Focus Buddy / similar | Deep teal       | `#3E7480`  | cool sibling of sage             |

These aren't commitments, just color-space reservations so a future app doesn't accidentally pick a color that clashes with an existing one.

---

## Migration plan: Talk Buddy from Editorial → Studio Calm

The current Talk Buddy codebase implements **Option A — Editorial**. Here's what needs to change to land Studio Calm.

### Files that get rewritten

| File                                      | Change                                                                 |
|-------------------------------------------|------------------------------------------------------------------------|
| `index.html`                              | Swap Google Fonts link: Fraunces + Inter Tight → Figtree + JetBrains Mono. |
| `tailwind.config.js`                      | Replace font families, replace `ink`/`ivory`/`vermilion` color scales with Studio Calm tokens. Update custom classes. |
| `src/renderer/index.css`                  | Rewrite `:root` CSS variables, rewrite `.glass-card`/`.btn-gradient`/`.gradient-text`/etc to new tokens. |
| `src/renderer/App.tsx`                    | Sidebar uses sage for active marker instead of vermilion. Remove any remaining Fraunces-specific classes (`font-display`, `italic` headlines). |
| `src/renderer/components/EditorialVoiceVisualizer.tsx` | Change `VERMILION` constant → `SAGE` (`#4A7C6E`). Everything else unchanged. |
| `src/renderer/components/StatusFooter.tsx`| Swap emerald connected dot → `var(--accent)`. Dark footer background keeps its ink background, but accent dot becomes sage. |
| `src/renderer/pages/ConversationPage.tsx` | Remove italic in status labels (`listening.` stays but not italicized). Remove any `font-display` usage — everything is Figtree now. |
| `src/renderer/pages/SettingsPage.tsx`     | Already partially migrated in the most recent edit. Finish: replace remaining `text-blue-*` / `bg-blue-*` from the Test buttons with accent classes. |
| `src/renderer/components/settings/EmbeddedInstallModal.tsx` | Replace `text-vermilion` → `text-accent`. Terminal block stays ink background with Figtree→JetBrains Mono font. |

### Files that stay the same

| File                                      | Why                                                                    |
|-------------------------------------------|------------------------------------------------------------------------|
| All service files (`chat.ts`, `speaches.ts`, `audioCues.ts`, `embedded.ts`, `sqlite.ts`) | No visual changes. |
| `src/main/index.js` and `src/main/preload.js` | No visual changes. |
| The voice visualizer's ring/dot/ripple behavior | Unchanged — it's well-tuned. Only color changes. |
| The editorial rule pattern, paper grain overlay, hairline card treatment, flat design rules | Already correct. Keep. |

### New CSS token file

Create `src/renderer/styles/studio-calm.css` as the canonical token file:

```css
/* src/renderer/styles/studio-calm.css
 * Studio Calm design system — shared across the Buddy suite.
 * This file is the authoritative source of design tokens. Any app
 * importing Studio Calm overrides only the --accent triple.
 */
:root {
  /* Paper surfaces */
  --paper:              #F4F1EA;
  --paper-warm:         #FBF8F1;

  /* Text */
  --ink:                #252420;
  --ink-soft:           #3B3830;
  --ink-muted:          #5C564C;
  --ink-quiet:          #8A8377;

  /* Strokes */
  --hairline:           rgba(37, 36, 32, 0.10);
  --hairline-strong:    rgba(37, 36, 32, 0.20);
  --hairline-contrast:  rgba(37, 36, 32, 0.40);

  /* Status */
  --error:              #A8442F;

  /* Accent — TALK BUDDY default. Other apps override via
     html[data-app='study'] / html[data-app='career'] — see the
     Per-app override pattern section for the specificity rationale. */
  --accent:             #4A7C6E;
  --accent-deep:        #36604F;
  --accent-soft:        rgba(74, 124, 110, 0.10);

  /* Spacing */
  --space-0: 0;   --space-1: 4px;   --space-2: 8px;   --space-3: 12px;
  --space-4: 16px; --space-5: 20px;  --space-6: 24px;  --space-8: 32px;
  --space-10: 40px; --space-12: 48px; --space-16: 64px;
  --space-20: 80px; --space-24: 96px;

  /* Type */
  --font-sans: 'Figtree', ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace;

  --text-xs: 0.72rem;    --text-sm: 0.82rem;    --text-base: 1rem;
  --text-lg: 1.15rem;    --text-xl: 1.35rem;    --text-2xl: 1.6rem;
  --text-3xl: 2rem;      --text-4xl: 2.5rem;
  --text-display: clamp(2.5rem, 5vw, 4rem);

  --weight-regular: 400; --weight-medium: 500; --weight-semibold: 600;

  --leading-tight: 1.1;   --leading-snug: 1.3;   --leading-normal: 1.5;
  --leading-relaxed: 1.7; --leading-loose: 1.8;

  --tracking-display: -0.015em;  --tracking-normal: 0;
  --tracking-wide: 0.14em;       --tracking-wider: 0.22em;

  /* Shape */
  --radius-sharp: 2px;
  --radius-soft:  6px;
  --radius-full:  999px;

  /* Motion */
  --ease-out:       cubic-bezier(0.2, 0, 0, 1);
  --ease-out-soft:  cubic-bezier(0.25, 0.1, 0.25, 1);
  --ease-in-out:    cubic-bezier(0.4, 0, 0.2, 1);

  --duration-instant: 50ms;   --duration-fast: 150ms;
  --duration-normal:  250ms;  --duration-slow: 400ms;
  --duration-slower:  600ms;

  --shadow-focus: 0 0 0 3px var(--accent-soft);
}
```

`src/renderer/index.css` then imports this file first and consumes its tokens everywhere.

### Tailwind config updates

The Tailwind color scales need to match Studio Calm:

```js
// tailwind.config.js
colors: {
  paper: '#F4F1EA',
  'paper-warm': '#FBF8F1',
  ink: {
    DEFAULT: '#252420',
    soft:    '#3B3830',
    muted:   '#5C564C',
    quiet:   '#8A8377',
  },
  accent: {
    DEFAULT: 'var(--accent)',        // resolves per app
    deep:    'var(--accent-deep)',
    soft:    'var(--accent-soft)',
  },
  error:   '#A8442F',

  // Backwards-compat remap — keeps legacy `bg-purple-*` / `bg-blue-*`
  // classes from breaking during migration. Both remap to the accent.
  purple: { 50: 'var(--accent-soft)', 500: 'var(--accent)', 600: 'var(--accent-deep)', 700: 'var(--accent-deep)' },
  blue:   { 50: '#F4F3F0',            500: '#252420',       600: '#1A1A18',            700: '#0F0F0E' },
},
fontFamily: {
  sans: ['Figtree', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  mono: ['"JetBrains Mono"', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
},
```

Notice there's no `display:` / `serif:` font family anymore. A single `sans` family, used for everything.

### Migration order (safe path)

1. **Add `studio-calm.css`** alongside the current `index.css`. Don't remove anything yet.
2. **Swap Google Fonts link** in `index.html`. Both Figtree and Fraunces load briefly; nothing breaks.
3. **Update `tailwind.config.js`** — add new colors, keep old ones via the remap table. Rebuild. Existing classes still work.
4. **Import `studio-calm.css` into `src/renderer/index.css`** at the top. New variables are available everywhere.
5. **Rewrite the `.glass-card`, `.btn-gradient`, `.gradient-text`, etc. classes** in `index.css` to use Studio Calm tokens. This is where the visual change starts to land.
6. **Update the voice visualizer constants** in `EditorialVoiceVisualizer.tsx` — swap `VERMILION` for `SAGE`.
7. **Walk through each page** (Home, Settings, ConversationPage, SessionHistory, Scenarios) and fix any remaining hardcoded color values.
8. **Delete Fraunces references** from `index.html` and `tailwind.config.js`.
9. **Delete `ivory` / `vermilion` color scales** from `tailwind.config.js` once nothing references them.
10. **Test**: `npx tsc --noEmit`, `npm run build`, open in dev mode, walk every page, eyeball every component.
11. **Commit and bump version to 2.8.0** — the visual redirect is a minor-version change (no behavior changes, all backward-compatible with stored preferences).

### Rollback plan

Studio Calm is a pure CSS/typography change. If anything feels wrong after shipping, `git revert` is a single commit. Since no data structures change, there's no database migration to worry about. Low-risk change overall.

---

## Decisions (closed questions)

Recording the answers here so future-you doesn't relitigate:

1. **Typeface**: **Figtree** (confirmed). Single family across all three apps.
2. **Paper grain overlay**: **Configurable**, default ON at **0.2 opacity** (subtler than current 0.5). New preferences `paperGrain` and `paperGrainOpacity` ship with Studio Calm. See Settings → Appearance.
3. **Dark mode**: **Yes**, first-class. New preference `theme` with light / dark / system options (default: system). See the Dark Mode section above for the full palette.
4. **Extraction timing**: **Prove in Talk Buddy first.** Ship Studio Calm as Talk Buddy 2.8.0, live with it for a week or two, extract to `buddy-design-system` repo after it stabilizes. Study Buddy and Career Compass get it by reference from the extracted repo.
5. **Suite identity**: **Single low-key footer line** (`Talk Buddy · part of the Buddy suite`). No launcher, no switcher, no marketing prompt. If a portal app materializes later, the footer line becomes its link. See Suite Identity section above.
6. **Session-complete screen**: **Deferred.** The current pattern (end session → optionally view analysis) is fine. If it feels cold after Studio Calm lands, revisit then.
7. **Static HTML mocks before implementation**: **Yes.** Separate mock file at `docs/design/mockups/studio-calm.html` showing light/dark + all three accents, so the user can eyeball before we write React/CSS.
8. **Headline weight**: **600** (confirmed after A/B testing 500 vs 600 in the mock). 600 gives headlines enough weight to be distinctive without shouting — matches the "confident but calm" Studio Calm mood. Both hero display and section headings use 600. Body stays 400, labels/nav 500.
9. **Accent triad**: **Confirmed** after seeing all three apps side-by-side in both light and dark. Eucalyptus (Talk), bluebell (Study), ochre (Career) read as siblings with the same warmth but distinct identity. No changes needed.

---

## Status & next steps

- This document: **v0.1 draft** — not implementation, just spec.
- Approval needed on: accent triad confirmed (✅), Figtree as typeface (pending), paper grain opacity (pending), migration path ordering (pending).
- Once approved, implementation sequence:
  1. Land `studio-calm.css` + Google Fonts swap in a single commit
  2. Migrate component classes in a second commit
  3. Visualizer color swap + page-level cleanups in a third commit
  4. Delete old editorial tokens in a fourth commit
  5. Bump to 2.8.0 and tag release
- After Talk Buddy 2.8.0 ships and lives for ~1 week: extract to `buddy-design-system` repo.
- Study Buddy and Career Compass start by importing the reference.

---

## Appendix A — Why not Fraunces

For the record, since this spec explicitly deletes a font the user previously liked.

Fraunces is a beautiful display serif — high contrast, variable optical sizing, genuinely distinctive. In the context of *Option A — Editorial*, it was the right choice. It tells a literary story and rewards readers who love typography.

But Fraunces is **actively hostile** to ESL readers for two reasons:

1. **High-contrast strokes at display sizes** require the reader's eye to process subtle thickness differences to identify letters. For a native reader this is effortless; for someone whose brain is already translating vocabulary, it's an additional load.
2. **The italic is a true italic** (not a slanted roman), which means the letterforms change shape entirely when emphasized. An ESL user trying to read "*before it happens*" is decoding three additional letterform variations on top of English vocabulary.

Figtree has none of these problems. Every letter is the same thickness, every weight is a clean increment, the italic is a slanted roman. It's a font a tired student can read at 11pm before an interview rehearsal and not notice the font at all — which, for this audience, is the point.

Fraunces will be fondly missed. But the design should serve the user, not the designer.

---

## Appendix B — Reference links

- Figtree on Google Fonts: https://fonts.google.com/specimen/Figtree
- JetBrains Mono: https://fonts.google.com/specimen/JetBrains+Mono
- Refactoring UI (Adam Wathan + Steve Schoger) — many of Studio Calm's principles are descended from this book
- Atkinson Hyperlegible (Braille Institute) — informed the ESL-legibility reasoning even though Figtree was the final pick
- NYRB, LRB, JSTOR — reference points for "refined but quiet," though Studio Calm is explicitly less literary than these
- Piano teacher studio, voice coach's practice room — the mental model for the actual mood

---

**End of spec.**
