<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# DESIGN.md — UI Design System

Before building or modifying any UI, read `DESIGN.md` at the project root. It defines the complete visual design system: colors, typography, spacing, components, and guardrails. All UI must follow the design tokens and patterns defined there.

## Design System Summary

- **Style**: Warm light education platform (牧哲学堂)
- **Canvas**: `#faf8f5` (warm cream)
- **Primary accent**: `#E8784A` (warm orange) — use for CTAs, focus rings, selected states
- **Text**: `#1a1201` (warm near-black)
- **Font**: Geist Sans (--font-geist-sans) + Geist Mono (--font-geist-mono)
- **Border radius**: 10px interactive, 14px containers
- **Component library**: Ant Design v5 with custom warm-light tokens
- **CSS framework**: Tailwind CSS v4 with @theme tokens matching DESIGN.md

## Quick Rules

1. Always use the warm light theme (#faf8f5 canvas).
2. Cards use `#ffffff` background with `1px solid rgba(0,0,0,.06)` border and 14px border-radius.
3. Primary buttons use `#E8784A` background with white text.
4. Use design tokens from globals.css or Ant Design ConfigProvider; do not hardcode colors.
5. Login page is the exception: dark-themed left panel with photo grid, warm-light right form.

## Project Safety Rules

- Before frontend changes, read docs/frontend-rules.md and DESIGN.md.
- Before production/deployment changes, read docs/production-safety.md.

## Local Browser and Docker Operations

- Before opening a localhost page in Codex, follow `docs/local-dev-and-docker-runbook.md`: check the listener and database, start the dev server as a detached process if needed, verify HTTP readiness, then open and screenshot the page.
- For Docker disk compaction, follow the runbook's trim → stop → compact → restart → verify sequence. Never factory-reset Docker or prune active database volumes.
