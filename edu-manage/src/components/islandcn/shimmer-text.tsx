"use client";

import type { CSSProperties, ReactNode } from "react";

import { useIslandReducedMotion } from "@/lib/island";

import { IslandStyle } from "./island-style";
import { islandFont, islandInk, islandSize, trackingFor } from "./theme";

interface ShimmerTextProps {
  children: ReactNode;
  /** Resting text colour. Defaults to secondary grey. */
  color?: string;
  /** The colour that sweeps across. Defaults to white. */
  highlight?: string;
  /** Font size in pt. Defaults to 15, the compact text size. */
  size?: number;
  /** Seconds for one sweep. Defaults to 1.8. */
  duration?: number;
  /** Extra styles. Defaults to none. */
  style?: CSSProperties;
}

// The gradient lives in a custom property rather than an inline background, so the
// reduced-motion rule below can turn it off: an inline style would win over any stylesheet.
const css = `
@keyframes icn-shimmer { from { background-position: 100% 0; } to { background-position: 0% 0; } }
.icn-shimmer {
  color: transparent; -webkit-background-clip: text; background-clip: text;
  background-image: var(--icn-shimmer); background-size: 300% 100%;
  animation: icn-shimmer var(--icn-dur) linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  .icn-shimmer { animation: none; color: var(--icn-fg); background-image: none; }
}
`;

/**
 * A label with a light sweeping across it, left to right, for "Thinking" and other open-ended
 * waits. With reduced motion (the system's, or the island's `reducedMotion="always"`) it is
 * plain text in the resting colour.
 */
export const ShimmerText = ({
  children,
  color = islandInk.secondary,
  highlight = islandInk.primary,
  size = islandSize.compactText,
  duration = 1.8,
  style,
}: ShimmerTextProps) => {
  const reduced = useIslandReducedMotion();
  const vars = {
    "--icn-dur": `${duration}s`,
    "--icn-fg": color,
    // A soft band of `highlight` in the middle third of a 3x wide gradient.
    "--icn-shimmer": `linear-gradient(90deg, ${color} 0%, ${color} 38%, ${highlight} 50%, ${color} 62%, ${color} 100%)`,
    color,
    fontFamily: islandFont,
    fontSize: size,
    fontWeight: 600,
    letterSpacing: trackingFor(size),
    lineHeight: "20px",
    whiteSpace: "nowrap",
    display: "inline-block",
    WebkitFontSmoothing: "antialiased",
    ...style,
  } as const satisfies CSSProperties & Record<`--icn-${string}`, string>;
  return (
    <span className={reduced ? undefined : "icn-shimmer"} style={vars}>
      <IslandStyle id="shimmer" css={css} />
      {children}
    </span>
  );
};
