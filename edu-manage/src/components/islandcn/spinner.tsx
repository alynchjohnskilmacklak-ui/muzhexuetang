"use client";

import { useIslandReducedMotion } from "@/lib/island";

import { IslandStyle } from "./island-style";
import { islandInk } from "./theme";

interface SpinnerProps {
  /** Size in pt. Defaults to 18. */
  size?: number;
  /** Arc colour. Defaults to white. */
  color?: string;
  /** Stroke width in pt. Defaults to 2.25. */
  thickness?: number;
  /** Accessible name. When set, the spinner is announced as a status. Defaults to none. */
  label?: string;
}

const css = `
@keyframes icn-spin { to { transform: rotate(360deg); } }
.icn-spinner { animation: icn-spin 0.8s linear infinite; }
@media (prefers-reduced-motion: reduce) { .icn-spinner { animation: none; } }
`;

/**
 * A small open arc that spins, for "working" states. With reduced motion (the system's, or the
 * island's `reducedMotion="always"`) it holds still: pair it with a label that says what is
 * happening, since a still arc alone reads as stuck.
 */
export const Spinner = ({ size = 18, color = islandInk.primary, thickness = 2.25, label }: SpinnerProps) => {
  const reduced = useIslandReducedMotion();
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span role={label ? "status" : undefined} aria-label={label} aria-hidden={label ? undefined : true} style={{ display: "grid", placeItems: "center", width: size, height: size, flex: "none" }}>
      <IslandStyle id="spinner" css={css} />
      <svg className={reduced ? undefined : "icn-spinner"} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeOpacity={0.22} strokeWidth={thickness} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${c * 0.28} ${c}`}
        />
      </svg>
    </span>
  );
};
