"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

import { useIslandReducedMotion } from "@/lib/island";

import { ProgressRing } from "./progress-ring";
import { islandAccent } from "./theme";

interface CountdownRingProps {
  /** When the period began, epoch ms (`Date.now()`). Required. */
  start: number;
  /** When it ends, epoch ms. Required. */
  end: number;
  /** Ring colour. Defaults to blue. */
  color?: string;
  /** Outer size in pt. Defaults to 20, which fits the split capsule's room after its glyph. */
  size?: number;
  /** Stroke width in pt. Defaults to 2.5 up to 24 pt, 3 above. */
  thickness?: number;
  /** "drain": full at `start`, empty at `end` (time left). "fill": the other way (time gone). Defaults to "drain". */
  mode?: "drain" | "fill";
  /** Drawn in the middle, such as a glyph. Defaults to nothing. */
  children?: ReactNode;
  /** Called once when `end` passes, once per start and end pair. Defaults to none. */
  onEnd?: () => void;
  /** Accessible name. When set, the ring is a progressbar. Defaults to none (decoration). */
  label?: string;
  /** Where "now" comes from, for tests and captures. Defaults to `Date.now`. */
  now?: () => number;
}

/** How often the ring moves: often enough to read as a sweep, or once a second with reduced motion. */
const step = { smooth: 250, reduced: 1000 } as const satisfies Record<string, number>;

const shareAt = (start: number, end: number, now: number) => Math.min(1, Math.max(0, (now - start) / Math.max(1, end - start)));

/**
 * A ring that runs down to a moment on its own: a code that expires, a focus session, a hold that
 * times out. Only the ring re-renders as it moves, never the island content around it, so build the
 * activity once with `start` and `end`. Pair it with `TickingTime` when the seconds should read too.
 */
export const CountdownRing = ({ start, end, color = islandAccent.blue, size = 20, thickness, mode = "drain", children, onEnd, label, now = Date.now }: CountdownRingProps) => {
  const reduced = useIslandReducedMotion();
  const [gone, setGone] = useState(() => shareAt(start, end, now()));
  const latest = useRef({ onEnd, now });
  latest.current = { onEnd, now };
  // The period `onEnd` last fired for. Kept across effect runs, so a StrictMode replay or a change of
  // reduced motion doesn't call it again for the same deadline; a new start or end can.
  const endedFor = useRef<string | null>(null);

  useEffect(() => {
    const period = `${start}:${end}`;
    const tick = () => {
      const share = shareAt(start, end, latest.current.now());
      setGone(share);
      if (share >= 1 && endedFor.current !== period) {
        endedFor.current = period;
        latest.current.onEnd?.();
      }
      return share < 1;
    };
    if (!tick()) return;
    const timer = window.setInterval(() => {
      if (!tick()) window.clearInterval(timer);
    }, reduced ? step.reduced : step.smooth);
    return () => window.clearInterval(timer);
  }, [start, end, reduced]);

  return (
    <ProgressRing value={mode === "drain" ? 1 - gone : gone} color={color} size={size} thickness={thickness ?? (size > 24 ? 3 : 2.5)} label={label}>
      {children}
    </ProgressRing>
  );
};
