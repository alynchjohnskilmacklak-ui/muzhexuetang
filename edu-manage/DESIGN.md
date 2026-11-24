---
version: v2
name: Muzhe Academy Warm Light
description: "A warm, low-eye-strain education platform built around a warm cream canvas, forest-green identity, and restrained brass accents. Deep forest green carries primary actions; brass marks brand highlights and selected levels, while #E8784A remains a warm illustration and parent-role accent. Designed for mobile-first school communication and learning workflows."

colors:
  primary: "#14574D"
  on-primary: "#ffffff"
  primary-hover: "#10483F"
  primary-focus: "#0B3D35"
  primary-bg: "#EAF4F1"
  brand-green: "#14574D"
  brand-green-deep: "#0D3732"
  brand-gold: "#8A6517"
  brand-gold-fill: "#D6B45B"
  brand-gold-bg: "#F8F1DE"
  brand-orange: "#E8784A"
  ink: "#1a1201"
  ink-muted: "#5a4e3a"
  ink-subtle: "#756A58"
  ink-tertiary: "#756A58"
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
  semantic-success-action: "#137A5A"
  semantic-success-bg: "#eaf7f1"
  semantic-warning: "#A56B00"
  semantic-warning-text: "#805A0D"
  semantic-warning-bg: "#F8F1DE"
  semantic-error: "#B42318"
  semantic-error-bg: "#FEF0EE"
  semantic-info: "#14574D"
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
    rowHoverBg: "rgba(20,87,77,.045)"
  chart-container:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: 24px
---

## Overview

牧哲学堂 (Muzhe Academy) is an education management platform serving parents of middle-school students in Xinle city (Shijiazhuang). The design system is a warm, low-eye-strain light canvas built around `{colors.canvas}` (#faf8f5 warm cream), warm near-black text (`{colors.ink}` #1a1201), and a warm orange family that uses a deeper accessible tone for interactive controls.

**Key Characteristics:**
- Warm light canvas — `{colors.canvas}` (#faf8f5) is a warm cream, not pure white
- Forest-green action color (`{colors.primary}` #14574D) — used on primary CTAs, focus rings, and selected states; white text remains highly legible
- Brass accent (`{colors.brand-gold}` #8A6517) with a pale brass surface (`{colors.brand-gold-bg}` #F8F1DE) — used for brand highlights and level labels
- Bright orange accent (`{colors.brand-orange}` #E8784A) — used for illustration, chart series, and warm parent-role details
- Four-step surface ladder (canvas to surface-1/2/3/4) carries hierarchy through subtle warmth shifts
- Cards use `{rounded.lg}` 14px corners with hairline borders and subtle warm shadow
- System font stack with Chinese support: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans SC', 'Microsoft YaHei', sans-serif`
- Geist Mono for code, data, and monospace contexts

## Colors

### Brand & Accent
- **Primary Forest** (`{colors.primary}` #14574D): Primary CTA, text on selected states, and focus rings.
- **Primary Hover** (`{colors.primary-hover}` #10483F): Deeper green for hover states.
- **Primary Focus** (`{colors.primary-focus}` #0B3D35): Deep green for active/pressed states.
- **Primary Background** (`{colors.primary-bg}` #EAF4F1): Pale green for selected backgrounds.
- **Brand Brass** (`{colors.brand-gold}` #8A6517): Readable brass text and small marks; pair the brighter brass fill with dark ink.
- **Bright Orange Accent** (`{colors.brand-orange}` #E8784A): Brand illustrations and chart series; pair with dark text when used as a large fill.

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
- **Ink Subtle** (`{colors.ink-subtle}` #756A58): Tertiary text — footnotes, placeholders.
- **Ink Tertiary** (`{colors.ink-tertiary}` #756A58): Secondary low-priority text; disabled controls also reduce opacity.

### Semantic Colors
- **Success** (`{colors.semantic-success}` #1D9E75): Positive states, safe-tier indicators, attendance present.
- **Success Action** (`{colors.semantic-success-action}` #137A5A): Green buttons and message bubbles with white text.
- **Success BG** (`{colors.semantic-success-bg}` #eaf7f1): Subtle green background for safe-tier cards.
- **Warning** (`{colors.semantic-warning}` #A56B00): Warnings, pending states; use dark ink for readable text.
- **Warning Text** (`{colors.semantic-warning-text}` #805A0D): Warning text on light backgrounds.
- **Warning BG** (`{colors.semantic-warning-bg}` #F8F1DE): Pale brass background for pending and caution states.
- **Error** (`{colors.semantic-error}` #B42318): Errors, reach-tier indicators, attendance absent.
- **Error BG** (`{colors.semantic-error-bg}` #FEF0EE): Pale red background for error states.
- **Info** (`{colors.semantic-info}` #14574D): Reuses the accessible forest-green brand action.

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
- Primary (CTAs, focus): `#14574D`
- Brand orange accent: `#E8784A`
- Brand brass: `#8A6517` (text) / `#D6B45B` (fill)
- Primary Hover: `#10483F`
- Text (headlines): `#1a1201`
- Text Muted (secondary): `#5a4e3a`
- Text Subtle (tertiary): `#756A58`
- Border (hairline): `rgba(0,0,0,.06)`
- Success: `#1D9E75`
- Warning: `#A56B00` (text: `#805A0D`, brass fill: `#D6B45B`)
- Error: `#B42318`

### Ready-to-Use Prompts
- "Build a dashboard page with metrics cards, charts, and a data table using the DESIGN.md warm-light system."
- "Create a student list page with a searchable data table, following DESIGN.md table and card styling."
- "Style the volunteer simulation page following DESIGN.md's warm-light theme, forest-green actions, and restrained brass highlights."
- "Build a settings form with DESIGN.md's input fields and forest-green primary buttons."

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

## Motion Language (persistent project rule)

### Reference-directed login opening

The 7-second `Muzhe Joy` opening uses the warm canvas and the supplied school mark. The intro-only background is `--color-intro-canvas:#faf8f5` with paper light `--color-intro-paper:#fffdf9`, a faint orange wash at the upper left, a faint teal wash at the lower right, and two book-page arcs along the bottom. These restrained SVG washes are an explicit exception for this brand opening; application pages retain the standard solid surfaces. Handwriting uses deeper rose `#bd526b`, peach `#bc633b`, gold `#977024`, mint `#258979`, sky `#347f9f`, and lilac `#8763aa` for legibility on the light field. The original mark retains orange `#ff773d` and teal `#00bcb2`, enlarged at the visual centre, with the school name and existing motto beneath. The always-visible skip button uses brand orange with dark text and a deeper orange outline. Reduced motion shows the static mark and signature and exits within 900ms. All colours are isolated `--color-intro-*` tokens in globals.css.

Use motion to make state and navigation easier to read. Keep it quiet, quick, and physically coherent; avoid a collection of decorative effects that competes with learning content. Apply the patterns below to the relevant controls and flows, not indiscriminately to every card.

1. **Pressable controls**: press to `scale(.96)` with a brief inset shadow; release with one small overshoot and settle. Keep the click ripple anchored to the actual pointer position.
2. **Switches and checkboxes**: stretch the switch thumb briefly while it travels; draw a checked mark from its lower-left stroke. Do not alter the control's hit area.
3. **Card tilt and reflected light**: opt in only for a small number of focal, tactile cards. Limit tilt to roughly 4–5 degrees, follow pointer/touch position, and spring back when released. Keep the radial reflection and rotating conic border low contrast; never put them on every card or use them as a card background.
4. **Pill-to-panel and shared-element transitions**: use a stable shared name for the source and destination. Preserve the element's identity through size and corner-radius changes. Feature-detect browser support and leave navigation fully functional without animation.
5. **Charts**: snap the pointer to real data points and synchronize the selected date and value. Animate the value with a decelerating count; retain a readable tooltip and keyboard/touch access.
6. **Bottom drawers**: support a half-height preview and a full-height state. Follow the active gesture, resist overscroll with a rubber-band curve, and settle based on both displacement and release velocity.
7. **Lists**: stagger only newly revealed, short lists; use a small vertical offset and restrained spring easing. Do not replay long-list animations on every render.
8. **Accessibility and performance**: honor `prefers-reduced-motion`; do not prevent normal page scrolling to get touch tilt; clean up pointer state on cancel/unmount. Prefer CSS and existing platform APIs over adding a motion dependency for these effects.
9. **Card-to-detail flow**: let a selected content card become the matching full-screen detail hero. Keep the same stable shared-element identity in both views, stagger only the supporting content, and use the same transition in reverse when returning so the original list position is restored.
10. **Stacked study cards**: show depth with small scale and offset differences; expand cards in a short sequence and use a soft spring to restore the stack. Keep the active card clearly on top and avoid making hidden cards look actionable.
11. **Card drag expansion**: where a card expands by dragging its bottom edge, let the gesture drive both content height and cover size; resist overscroll and snap by distance plus release velocity.
12. **Horizontal card rails**: use a consistent gap, partial adjacent-card preview, and mandatory scroll snapping. Leave room for keyboard scrolling and do not hijack vertical page scroll.
13. **Perspective flip cards**: keep both faces opaque with backface visibility enabled; follow pointer position with a soft radial highlight, and return the light to center when the pointer leaves.

When extending motion, check the interaction on a narrow touch viewport and desktop pointer input. Verify the reduced-motion path and ensure that content layout does not jump before or after the animation.

Current reference implementations: parent learning-material covers open into the full-screen preview and return to their prior list/cover view; the preview cover's lower grip changes cover height while the reading area resizes; the parent archive timeline shares its selected card with the entry hero; vocabulary review uses the expandable three-card stack and opaque, perspective-flipped cards; lesson-preview history is the mobile horizontal snap rail. Extend these patterns before creating another interaction system.
