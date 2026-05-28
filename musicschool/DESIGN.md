---
version: alpha
name: Linear
description: "A near-black product-focused canvas built around #010102 (the deepest dark surface), light gray text (#f7f8f8), and the signature Linear lavender-blue (#5e6ad2) used as the single chromatic accent. Adapted for 牧哲学堂 education management platform."

colors:
  primary: "#5e6ad2"
  on-primary: "#ffffff"
  primary-hover: "#828fff"
  primary-focus: "#5e69d1"
  ink: "#f7f8f8"
  ink-muted: "#d0d6e0"
  ink-subtle: "#8a8f98"
  ink-tertiary: "#62666d"
  canvas: "#010102"
  surface-1: "#0f1011"
  surface-2: "#141516"
  surface-3: "#18191a"
  surface-4: "#191a1b"
  hairline: "#23252a"
  hairline-strong: "#34343a"
  hairline-tertiary: "#3e3e44"
  inverse-canvas: "#ffffff"
  inverse-surface-1: "#f5f6f6"
  inverse-surface-2: "#f6f7f7"
  inverse-ink: "#000000"
  brand-secure: "#7a7fad"
  semantic-success: "#27a644"
  semantic-warning: "#f5a623"
  semantic-error: "#e03e2d"
  semantic-info: "#5e6ad2"
  semantic-overlay: "#000000"

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
  full: 9999px

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
    typography: "{typography.button}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 8px 14px
  button-tertiary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 8px 14px
  card-default:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: 24px
  card-featured:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: 24px
  text-input:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 8px 12px
  text-input-focused:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 8px 12px
  top-nav:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.xs}"
    height: 56px
  sidebar:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-subtle}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.xs}"
  footer:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-subtle}"
    typography: "{typography.caption}"
    rounded: "{rounded.xs}"
    padding: 64px 32px
  status-badge:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 2px 8px
  data-table:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
  chart-container:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: 24px
---

## Overview

牧哲学堂 (Muzhe Academy) is an education management platform. The design system is adapted from Linear's dark-canvas marketing system — a near-black product-focused canvas built around `{colors.canvas}` (#010102), light gray text (`{colors.ink}` #f7f8f8), and the signature Linear lavender-blue (`{colors.primary}` #5e6ad2) as the single chromatic accent.

The system reads as software-craft documentation: dense, technical, and quietly luxurious. Display type is set in Geist (Linear's recommended open-source substitute) at 500–700 with neutral tracking for a durable app interface. Cards live as charcoal panels (`{colors.surface-1}` #0f1011) with hairline borders. The accent lavender appears on the brand mark, focus rings, primary CTAs, and data visualization highlights.

**Key Characteristics:**
- Dark-canvas system — `{colors.canvas}` (#010102) is the deepest dark surface.
- Lavender-blue brand accent (`{colors.primary}` #5e6ad2) — used scarcely on brand, primary CTAs, focus rings, and chart accents.
- Four-step surface ladder (canvas → surface-1 → surface-2 → surface-3 → surface-4) carries hierarchy without shadow.
- Letter spacing stays at `0` across UI tokens so Chinese and mixed Chinese/Latin labels remain stable.
- Cards use `{rounded.lg}` 12px corners with 1px hairline borders.
- Geist Sans as the primary typeface (substitute for Linear's proprietary custom sans).
- Geist Mono for code, data, and monospace contexts.

## Colors

### Brand & Accent
- **Primary Lavender** (`{colors.primary}` #5e6ad2): Primary CTA, brand mark, link emphasis, chart series primary.
- **Primary Hover** (`{colors.primary-hover}` #828fff): Lighter lavender — hovered state of primary CTA.
- **Primary Focus** (`{colors.primary-focus}` #5e69d1): Focus-ring tint — focused inputs and buttons.

### Surface Hierarchy
- **Canvas** (`{colors.canvas}` #010102): Default page background — near-pure black with a faint blue tint.
- **Surface 1** (`{colors.surface-1}` #0f1011): Cards, panels, table backgrounds.
- **Surface 2** (`{colors.surface-2}` #141516): Featured cards, hovered surfaces, selected states.
- **Surface 3** (`{colors.surface-3}` #18191a): Sub-nav, dropdown menus.
- **Surface 4** (`{colors.surface-4}` #191a1b): Deepest lifted surface.
- **Hairline** (`{colors.hairline}` #23252a): 1px borders on cards and dividers.
- **Hairline Strong** (`{colors.hairline-strong}` #34343a): Stronger 1px borders.
- **Inverse Canvas** (`{colors.inverse-canvas}` #ffffff): Pure white — for inverse elements.

### Text
- **Ink** (`{colors.ink}` #f7f8f8): All headlines and emphasized body type.
- **Ink Muted** (`{colors.ink-muted}` #d0d6e0): Secondary text — meta info, descriptions.
- **Ink Subtle** (`{colors.ink-subtle}` #8a8f98): Tertiary text — footer, labels, placeholders.
- **Ink Tertiary** (`{colors.ink-tertiary}` #62666d): Disabled text, footnotes.

### Semantic Colors
- **Success** (`{colors.semantic-success}` #27a644): Success status, attendance present, payment confirmed.
- **Warning** (`{colors.semantic-warning}` #f5a623): Warnings, pending status, payment due.
- **Error** (`{colors.semantic-error}` #e03e2d): Errors, attendance absent, payment overdue.
- **Info** (`{colors.semantic-info}` #5e6ad2): Information, links (reuses primary).

### Data Visualization Palette (ECharts)
For dashboards and reports, extend the primary with a data-safe palette:
- Series 1: `#5e6ad2` (primary lavender)
- Series 2: `#27a644` (success green)
- Series 3: `#f5a623` (warning amber)
- Series 4: `#e03e2d` (error red)
- Series 5: `#828fff` (light lavender)
- Series 6: `#7a7fad` (brand secure)

## Typography

### Font Family
- **Geist Sans** (--font-geist-sans): Primary typeface for all UI — display, body, buttons, captions. Closest open-source match to Linear's custom sans.
- **Geist Mono** (--font-geist-mono): Monospace for code, data tables, calendar time slots, and numeric values.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.display-xl}` | 80px | 600 | 1.05 | 0 | Largest hero headline |
| `{typography.display-lg}` | 56px | 600 | 1.10 | 0 | Section opener headlines |
| `{typography.display-md}` | 40px | 600 | 1.15 | 0 | Dashboard page titles |
| `{typography.headline}` | 28px | 600 | 1.20 | 0 | Card group titles, modal titles |
| `{typography.card-title}` | 22px | 500 | 1.25 | 0 | Individual card titles |
| `{typography.subhead}` | 20px | 400 | 1.40 | 0 | Lead body, intro paragraphs |
| `{typography.body-lg}` | 18px | 400 | 1.50 | 0 | Large body, empty state descriptions |
| `{typography.body}` | 16px | 400 | 1.50 | 0 | Default body, form labels, table cells |
| `{typography.body-sm}` | 14px | 400 | 1.50 | 0 | Card body, form descriptions, sidebar nav |
| `{typography.caption}` | 12px | 400 | 1.40 | 0 | Captions, meta, status badges |
| `{typography.button}` | 14px | 500 | 1.20 | 0 | All button labels |
| `{typography.eyebrow}` | 13px | 500 | 1.30 | 0.4px | Section eyebrow labels |
| `{typography.mono}` | 13px | 400 | 1.50 | 0 | Geist Mono for code, calendar, IDs |

### Principles
- Keep letter spacing at `0`; do not use negative tracking in app UI.
- Single voice from display to body — same family, narrower weights.
- Eyebrow may use light positive tracking (+0.4px) for compact labels; all other UI text stays at `0`.
- Mono only for data, code, and calendar contexts.

## Layout

### Spacing System
- Base unit: 4px.
- Tokens: `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.xxl}` 48px · `{spacing.section}` 96px.
- Card interior padding: `{spacing.lg}` 24px.
- Dashboard grid gap: `{spacing.lg}` 24px.

### Grid & Container
- Max content width: 1280px (standard), 1440px (data-dense dashboards).
- Dashboard: responsive grid — 3-col at 1440px, 2-col at 1024px, 1-col below 768px.
- Card grids: 3-up at desktop, 2-up at tablet, 1-up at mobile.
- Sidebar: 240px fixed width, collapsible to 64px (icon-only).

### Whitespace Philosophy
The dark canvas IS the whitespace. Sections separate by lift onto surface panels, not by gaps in white. Within a panel, generous `{spacing.lg}` 24px gaps between content blocks; `{spacing.section}` 96px between page sections.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 (flat) | No shadow, no border | Body text, hero text, footer |
| 1 (charcoal lift) | `{colors.surface-1}` background, 1px `{colors.hairline}` border | Cards, panels, tables |
| 2 (surface-2 lift) | `{colors.surface-2}` background, 1px `{colors.hairline-strong}` border | Featured cards, hovered cards, selected nav |
| 3 (surface-3 lift) | `{colors.surface-3}` background | Dropdowns, popovers, sub-nav |
| 4 (focus ring) | 2px `{colors.primary-focus}` outline at 50% opacity | Focused inputs, focused buttons |

Depth is carried by surface ladder + hairline borders. Avoid drop shadows on dark surfaces.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 4px | Small chips, status badges |
| `{rounded.sm}` | 6px | Inline tags |
| `{rounded.md}` | 8px | Buttons, form inputs, menu items |
| `{rounded.lg}` | 12px | Cards, tables, chart containers |
| `{rounded.xl}` | 16px | Modal dialogs, large panels |
| `{rounded.xxl}` | 24px | Oversized banners (rare) |
| `{rounded.pill}` | 9999px | Status pills, filter chips |
| `{rounded.full}` | 9999px | Avatar circles |

## Components

### Buttons
- **button-primary**: Background `{colors.primary}`, text `{colors.on-primary}`, rounded `{rounded.md}`, padding 8px 14px.
- **button-primary-hover**: Background shifts to `{colors.primary-hover}`.
- **button-secondary**: Background `{colors.surface-1}`, text `{colors.ink}`, 1px `{colors.hairline}` border.
- **button-tertiary**: Transparent on canvas, text `{colors.ink}`.

### Cards
- **card-default**: Background `{colors.surface-1}`, 1px `{colors.hairline}` border, rounded `{rounded.lg}`, padding 24px.
- **card-featured**: Background `{colors.surface-2}`, 1px `{colors.hairline-strong}` border.

### Navigation
- **Top Nav**: Height 56px, background `{colors.canvas}`, sticky. Logo + primary links + user menu.
- **Sidebar**: Width 240px, background `{colors.canvas}`, 1px `{colors.hairline}` right border. Collapsible.

### Data Display
- **Table**: Background `{colors.surface-1}`, header `{colors.surface-2}`, row hover `{colors.surface-2}`, border `{colors.hairline}`.
- **Chart Container**: Background `{colors.surface-1}`, rounded `{rounded.lg}`, padding 24px.
- **Status Badge**: Background `{colors.surface-2}`, text `{colors.ink-muted}`, rounded `{rounded.pill}`, padding 2px 8px.

### Forms
- **Text Input**: Background `{colors.surface-1}`, text `{colors.ink}`, 1px `{colors.hairline}` border, rounded `{rounded.md}`, padding 8px 12px.
- **Text Input Focused**: Same surface, 2px `{colors.primary-focus}` outline at 50% opacity.

### Calendar (FullCalendar)
- Dark background matching `{colors.surface-1}`.
- Current day highlight: `{colors.primary}` at 15% opacity.
- Event blocks: `{colors.primary}` at 85% opacity with `{colors.on-primary}` text.
- Time grid lines: `{colors.hairline}`.

## Responsive Behavior

| Name | Width | Key Changes |
|---|---|---|
| Desktop-XL | 1440px | Full dashboard with 3-col grid |
| Desktop | 1280px | Standard layout |
| Tablet | 1024px | Card grid 3→2, sidebar collapsed |
| Mobile-Lg | 768px | Sidebar hidden, hamburger nav |
| Mobile | 480px | Single column, full-width cards |

## Do's and Don'ts

### Do
- Reserve `{colors.canvas}` (#010102) as the system's anchor surface.
- Use `{colors.primary}` lavender ONLY for: brand, primary CTA, focus ring, link emphasis, chart accent.
- Use the four-step surface ladder for hierarchy. Avoid skipping levels.
- Pair display weight 600 with body weight 400.
- Use Geist Sans consistently — it's the single voice of the UI.
- Keep typography compact through size, weight, and spacing; do not use negative letter-spacing.
- Use `{rounded.md}` (8px) for interactive elements, `{rounded.lg}` (12px) for containers.

### Don't
- Don't ship a light-mode page — this is a dark-only system.
- Don't use lavender as a section background or card fill.
- Don't introduce a second chromatic accent beyond the semantic palette.
- Don't add atmospheric gradients or spotlight cards.
- Don't pill-round buttons — use `{rounded.md}` 8px.
- Don't use `#000000` true black as the canvas.
- Don't mix light and dark surface colors in the same view.

## Agent Prompt Guide

## Project Implementation

This repository implements the design system in three places:

- `DESIGN.md`: source of truth for agents and design decisions.
- `src/app/globals.css`: Tailwind CSS v4 `@theme` tokens plus global utility classes.
- `src/app/providers.tsx`: Ant Design v5 `ConfigProvider` dark theme tokens.

Implementation rules:

- Prefer Ant Design components for forms, tables, cards, menus, layout, and feedback.
- Use Tailwind tokens from `globals.css` for custom layout and spacing.
- Reuse the semantic chart palette exactly: `#5e6ad2`, `#27a644`, `#f5a623`, `#e03e2d`, `#828fff`, `#7a7fad`.
- Avoid gradients as page or card backgrounds. A gradient is acceptable only inside a tiny brand mark or data visualization when it does not become a second accent system.
- Do not introduce hard-coded colors outside this file unless they are direct token values from this system.

### Quick Color Reference
- Canvas (page bg): `#010102`
- Surface 1 (cards): `#0f1011`
- Primary (CTAs, links, focus): `#5e6ad2`
- Primary Hover: `#828fff`
- Text (headlines, body): `#f7f8f8`
- Text Muted (secondary): `#d0d6e0`
- Border (hairline): `#23252a`
- Success: `#27a644`
- Warning: `#f5a623`
- Error: `#e03e2d`

### Ready-to-Use Prompts
- "Build a dashboard page with metrics cards, charts, and a data table using the DESIGN.md dark-canvas system."
- "Create a student list page with a searchable data table, following DESIGN.md table and card styling."
- "Style the schedule calendar following DESIGN.md's dark theme and lavender accent."
- "Build a settings form with DESIGN.md's dark input fields and lavender primary buttons."
