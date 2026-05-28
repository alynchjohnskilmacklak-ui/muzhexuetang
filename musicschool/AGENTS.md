<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# DESIGN.md — UI Design System

Before building or modifying any UI, read `DESIGN.md` at the project root. It defines the complete visual design system: colors, typography, spacing, components, and guardrails. All UI must follow the design tokens and patterns defined there.

## Design System Summary

- **Style**: Linear dark-canvas (adapted for 牧哲学堂)
- **Canvas**: `#010102` (near-black)
- **Primary accent**: `#5e6ad2` (lavender-blue) — use sparingly
- **Text**: `#f7f8f8` (light gray)
- **Font**: Geist Sans (--font-geist-sans) + Geist Mono (--font-geist-mono)
- **Border radius**: 8px interactive, 12px containers
- **Component library**: Ant Design v5 with dark algorithm + custom tokens
- **CSS framework**: Tailwind CSS v4 with @theme tokens matching DESIGN.md

## Quick Rules

1. Always use the dark theme — no light mode variants.
2. Cards use `#0f1011` background with `1px solid #23252a` border and 12px border-radius.
3. Primary buttons use `#5e6ad2` background with white text.
4. Don't introduce new accent colors beyond the semantic palette.
