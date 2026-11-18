---
version: v2
name: Muzhe Academy Warm Light
description: "A warm, low-eye-strain education platform canvas built around #faf8f5 (warm cream), warm near-black text (#1a1201), and the signature warm orange (#E8784A) as the single chromatic accent. Designed for parents (mostly middle-aged, mobile-first, evening use) checking school options for their children."

colors:
  primary: "#E8784A"
  on-primary: "#ffffff"
  primary-hover: "#f08a5f"
  primary-focus: "#d0683a"
  primary-bg: "#fff3ec"
  ink: "#1a1201"
  ink-muted: "#5a4e3a"
  ink-subtle: "#9a8e7a"
  ink-tertiary: "rgba(0,0,0,.35)"
  canvas: "#faf8f5"
  surface-1: "#ffffff"
  surface-2: "#faf8f5"
  surface-3: "#f5f2ee"
  surface-4: "#f0ece7"
  hairline: "rgba(0,0,0,.06)"
  hairline-strong: "rgba(0,0,0,.1)"
  hairline-tertiary: "rgba(0,0,0,.04)"
  inverse-canvas: "#1a1201"
  inverse-surface-1: "#2a2211"
  inverse-surface-2: "#3a3221"
  inverse-ink: "rgba(255,255,255,.9)"
  brand-secure: "#7a7fad"
  semantic-success: "#1D9E75"
  semantic-success-bg: "#eaf7f1"
  semantic-warning: "#f5a623"
  semantic-warning-text: "#C77F00"
  semantic-error: "#E24B4A"
  semantic-info: "#E8784A"
  semantic-overlay: "#000000"

chart:
  series-1: "#E8784A"
  series-2: "#1D9E75"
  series-3: "#8892f0"
  series-4: "#f5a623"
  series-5: "#D4537E"
  series-6: "#185FA5"

typography:
  display-xl:
    fontFamily: Geist
    fontSize: 80px
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: 0
  display-lg:
    fontFamily: Geist
    fontSize: 56px
    fontWeight: 600
    lineHeight: 1.10
    letterSpacing: 0
  display-md:
    fontFamily: Geist
    fontSize: 40px
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: 0
  headline:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.20
    letterSpacing: 0
  card-title:
    fontFamily: Geist
    fontSize: 22px
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: 0
  subhead:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: 400
    lineHeight: 1.40
    letterSpacing: 0
  body-lg:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.50
    letterSpacing: 0
  body:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.50
    letterSpacing: 0
  body-sm:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.50
    letterSpacing: 0
  caption:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.40
    letterSpacing: 0
  button:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.20
    letterSpacing: 0
  eyebrow:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.30
    letterSpacing: 0.4px
  mono:
    fontFamily: Geist Mono
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.50
    letterSpacing: 0

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  xxl: 24px
  pill: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 96px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 8px 14px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
  button-secondary:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    border: "1px solid {colors.hairline-strong}"
    padding: 8px 14px
  card-default:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    border: "1px solid {colors.hairline}"
    padding: 24px
    shadow: "0 8px 24px rgba(26,18,1,.04)"
  card-featured:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    border: "1px solid {colors.hairline}"
    padding: 24px
  text-input:
    backgroundColor: "#fafafa"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    border: "1px solid #EFE3DC"
    padding: 8px 12px
  text-input-focused:
    backgroundColor: "#fafafa"
    textColor: "{colors.ink}"
    border: "2px solid {colors.primary}"
  top-nav:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    height: 56px
  sidebar:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-muted}"
    width: 240px
  footer:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-subtle}"
    padding: 64px 32px
  status-badge:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.pill}"
    padding: 2px 8px
  data-table:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    headerBg: "{colors.canvas}"
    headerColor: "{colors.ink-muted}"
    rowHoverBg: "rgba(232,120,74,.04)"
  chart-container:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: 24px
---

## Overview

牧哲学堂 (Muzhe Academy) is an education management platform serving parents of middle-school students in Xinle city (Shijiazhuang). The design system is a warm, low-eye-strain light canvas built around `{colors.canvas}` (#faf8f5 warm cream), warm near-black text (`{colors.ink}` #1a1201), and the signature warm orange (`{colors.primary}` #E8784A) as the single chromatic accent.

**Key Characteristics:**
- Warm light canvas — `{colors.canvas}` (#faf8f5) is a warm cream, not pure white
- Orange brand accent (`{colors.primary}` #E8784A) — used on primary CTAs, focus rings, selected states
- Four-step surface ladder (canvas to surface-1/2/3/4) carries hierarchy through subtle warmth shifts
- Cards use `{rounded.lg}` 14px corners with hairline borders and subtle warm shadow
- System font stack with Chinese support: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans SC', 'Microsoft YaHei', sans-serif`
- Geist Mono for code, data, and monospace contexts

## Colors

### Brand & Accent
- **Primary Orange** (`{colors.primary}` #E8784A): Primary CTA, brand mark, focus rings, selected states, chart series primary.
- **Primary Hover** (`{colors.primary-hover}` #f08a5f): Lighter orange for hover states.
- **Primary Focus** (`{colors.primary-focus}` #d0683a): Deeper orange for active/pressed states.
- **Primary Background** (`{colors.primary-bg}` #fff3ec): Very light orange for selected backgrounds.

### Surface Hierarchy
- **Canvas** (`{colors.canvas}` #faf8f5): Default page background — warm cream.
- **Surface 1** (`{colors.surface-1}` #ffffff): Cards, panels, elevated containers.
- **Surface 2** (`{colors.surface-2}` #faf8f5): Same as canvas, for secondary surfaces.
- **Surface 3** (`{colors.surface-3}` #f5f2ee): Subtle warm gray for nested sections.
- **Surface 4** (`{colors.surface-4}` #f0ece7): Deeper warm gray for hovered rows.
- **Hairline** (`{colors.hairline}` rgba(0,0,0,.06)): Default 1px borders.
- **Hairline Strong** (`{colors.hairline-strong}` rgba(0,0,0,.1)): Emphasized borders.

### Text
- **Ink** (`{colors.ink}` #1a1201): All headlines and emphasized body — warm near-black, NOT #000.
- **Ink Muted** (`{colors.ink-muted}` #5a4e3a): Secondary text — meta info, descriptions.
- **Ink Subtle** (`{colors.ink-subtle}` #9a8e7a): Tertiary text — footnotes, placeholders.
- **Ink Tertiary** (`{colors.ink-tertiary}` rgba(0,0,0,.35)): Disabled text.

### Semantic Colors
- **Success** (`{colors.semantic-success}` #1D9E75): Positive states, safe-tier indicators, attendance present.
- **Success BG** (`{colors.semantic-success-bg}` #eaf7f1): Subtle green background for safe-tier cards.
- **Warning** (`{colors.semantic-warning}` #f5a623): Warnings, pending states.
- **Warning Text** (`{colors.semantic-warning-text}` #C77F00): Warning text on light backgrounds.
- **Error** (`{colors.semantic-error}` #E24B4A): Errors, reach-tier indicators, attendance absent.
- **Info** (`{colors.semantic-info}` #E8784A): Reuses primary orange.

## Typography

### Font Stack
- **Sans**: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans SC', 'Microsoft YaHei', sans-serif`
- **Mono**: `ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace`

### Principles
- Letter spacing stays at 0 — Chinese and mixed Chinese/Latin labels remain stable.
- Single voice from display to body — same family, narrower weights.
- Mono only for data, code, and calendar contexts.

## Responsive Behavior

| Name | Width | Key Changes |
|---|---|---|
| Desktop-XL | 1440px | Full dashboard |
| Desktop | 1280px | Standard layout |
| Tablet | 1024px | Card grid adjusts |
| Mobile | 768px | Single column, full-width cards, sticky elements |

## Design Principles

### Color Strategy: Restrained
- Canvas is warm cream (#faf8f5), never pure white
- Orange accent at ≤10% of visible surface area
- Neutral palette is warm-tinted, not cool gray
- Data tiers use semantic colors (green/amber/red) sparingly as subtle backgrounds, not loud stripes

### Do
- Reserve `{colors.canvas}` (#faf8f5) as the system's anchor surface
- Use `{colors.primary}` orange ONLY for: primary CTA, focus ring, selected state, key emphasis
- Use the surface ladder for hierarchy: canvas → surface-1 (white cards) → surface-3 (nested sections)
- Keep typography warm and readable — #1a1201, not #000
- Use `{rounded.lg}` (12-14px) for cards, `{rounded.md}` (8-10px) for interactive elements
- Prefer subtle background tints over colored borders for tier differentiation

### Don't
- Don't use side-stripe colored borders (>1px colored left/right borders on cards) — use subtle background tints instead
- Don't use gradient text or glassmorphism effects
- Don't use identical card grids for data with inherent hierarchy — create visual tiers
- Don't use hero-metric templates (giant single numbers as page headers)
- Don't use `#000000` or `#ffffff` pure black/white — always warm-tinted
- Don't introduce a second chromatic accent beyond the semantic palette
- Don't use em dashes or `--` in Chinese text — use Chinese punctuation (comma, period, parentheses)
- Don't ship a dark-mode page — this is a warm-light-only system

## Design Slop Tests

### AI Slop Detection
These patterns are common in AI-generated education/SaaS UI and MUST be avoided:
1. **Side-stripe cards**: Colored left-border stripes (>1px) on cards for tier/category indication → Use subtle background tints or status dots instead
2. **Identical card grids**: Every card same size in a perfect grid → Vary card sizes or use list rows with hierarchy
3. **Gradient text**: Any `background-clip: text` gradient → Flat warm colors only
4. **Glassmorphism**: `backdrop-filter: blur()` on cards → Solid backgrounds with hairline borders
5. **Hero metrics**: Single giant number as page hero → Contextual, comparative presentation
6. **Education teal cliche**: White background + teal/cyan accent → Warm cream + warm orange
7. **Emoji-heavy labels**: Using emoji as section icons in production UI → Use proper Icon component or text labels

### Education Industry Template Detection
A parent viewing the page should NOT think "this looks like every other school SaaS." Signals to avoid:
- White (#fff) canvas with teal/blue accent
- Rows of identical white cards with shadow
- Large hero illustrations of generic school buildings
- Overuse of "success green" badges everywhere

## Product Register

- **Product**: 教育管理系统中的志愿填报模拟 (Volunteer School Selection Simulator)
- **Users**: 新乐市中考学生家长 (Parents of Xinle middle school students), mostly aged 35-50, mobile-first, evening usage
- **Tone**: 可信、清晰、不浮夸 (Trustworthy, clear, understated)
- **Anti-pattern**: NOT a generic SaaS card wall, NOT the "white bg + teal" education template

## Project Implementation

This repository implements the design system in three places:
- `DESIGN.md`: source of truth for agents and design decisions
- `src/app/globals.css`: CSS custom properties (Tailwind v4 `@theme` tokens) plus global utility classes
- `src/app/providers.tsx`: Ant Design v5 `ConfigProvider` theme tokens

Implementation rules:
- Prefer Ant Design components for forms, tables, cards, menus, layout, and feedback
- Use CSS custom properties from `globals.css` for custom layout and spacing
- Reuse the semantic chart palette: `#E8784A`, `#1D9E75`, `#8892f0`, `#f5a623`, `#D4537E`, `#185FA5`
- Avoid gradients as page or card backgrounds
- Do not introduce hard-coded colors outside this file

### Quick Color Reference
- Canvas (page bg): `#faf8f5`
- Surface 1 (cards): `#ffffff`
- Primary (CTAs, focus): `#E8784A`
- Primary Hover: `#f08a5f`
- Text (headlines): `#1a1201`
- Text Muted (secondary): `#5a4e3a`
- Text Subtle (tertiary): `#9a8e7a`
- Border (hairline): `rgba(0,0,0,.06)`
- Success: `#1D9E75`
- Warning: `#f5a623`
- Error: `#E24B4A`

### Ready-to-Use Prompts
- "Build a dashboard page with metrics cards, charts, and a data table using the DESIGN.md warm-light system."
- "Create a student list page with a searchable data table, following DESIGN.md table and card styling."
- "Style the volunteer simulation page following DESIGN.md's warm-light theme and orange accent."
- "Build a settings form with DESIGN.md's input fields and orange primary buttons."

## Growth Feature Palette

The parent growth page (成长动态) uses a warm brown sub-palette derived from the primary ink scale. These are NOT separate tokens — they are tint/shade variants of `{colors.ink}` and `{colors.primary}` used exclusively for the growth timeline and badge wall:

| Role | Value | Derived From |
|------|-------|-------------|
| growth-title | `#2f241b` | ink + lighter |
| growth-eyebrow | `#b4663f` | primary + muted |
| growth-quote-bg | `#fffcf8` | canvas + warmer |
| growth-quote-border | `#f0ddd2` | primary + very light |
| growth-node-bg | `#fff8f1` | surface-3 + warm |
| growth-badge-earned | `#fff3d8` | warning + light |
| growth-badge-locked | `#f3eee8` | surface-3 |

These are defined in `globals.css` under `.growth-*` classes. Do NOT use these values outside the growth feature. All other pages use the main design tokens.
