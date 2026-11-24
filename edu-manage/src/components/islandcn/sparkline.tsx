"use client";

import { useId } from "react";

import { islandInk, tint } from "./theme";

interface SparklineProps {
  /** The values, oldest first. Two or more draw a line; fewer draw it flat. */
  values: readonly number[];
  /** Line colour: green for up, red for down, or the activity's accent. Defaults to white. */
  color?: string;
  /**
   * Width in pt. Defaults to none: the line fills the row it sits in, as an expanded chart does.
   * Give a width in compact, where a slot sizes itself to its content (30 fits beside a value).
   */
  width?: number;
  /** Height in pt. Defaults to 16, which sits inside the compact pill's 22 pt glyph line. */
  height?: number;
  /** Line width in pt. Defaults to 2; 1.75 reads finer at compact size. */
  strokeWidth?: number;
  /** A soft wash of the colour under the line, for an expanded chart. Defaults to false. */
  area?: boolean;
  /** A dashed reference line at this value, such as the day's open. Defaults to none. */
  baseline?: number;
  /** A dot on the newest value. Defaults to true. */
  dot?: boolean;
  /** Accessible name, such as "Up 2.4% today". Without it the chart is decoration. Defaults to none. */
  label?: string;
}

/** Room kept above and below the line so its round caps and the dot are never cut. */
const edge = (strokeWidth: number) => strokeWidth * 1.4;

/**
 * A line of recent values: a price, a heart rate, a queue length. The chart is drawn in a 100-wide
 * box stretched to the width, with a stroke that keeps its weight, so the same component fits a
 * 30 pt compact slot and the full width of the expanded view. The dot is HTML so it stays round.
 */
export const Sparkline = ({
  values,
  color = islandInk.primary,
  width,
  height = 16,
  strokeWidth = 2,
  area = false,
  baseline,
  dot = true,
  label,
}: SparklineProps) => {
  const id = `icn-spark${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const range = baseline === undefined ? values : [...values, baseline];
  const min = range.length > 0 ? Math.min(...range) : 0;
  const max = range.length > 0 ? Math.max(...range) : 0;
  const span = max - min || 1;
  const pad = edge(strokeWidth);
  const yOf = (value: number) => pad + (1 - (value - min) / span) * (height - 2 * pad);
  const points = (values.length > 1 ? values : [values[0] ?? 0, values[0] ?? 0]).map((value, index, all) => ({
    x: (index / (all.length - 1)) * 100,
    y: yOf(value),
  }));
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  const last = points[points.length - 1] ?? { x: 100, y: height / 2 };
  const a11y = label ? { role: "img" as const, "aria-label": label } : { "aria-hidden": true };
  return (
    <span {...a11y} style={{ position: "relative", display: "block", width: width ?? "100%", height, flex: "none" }}>
      <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
        {area ? (
          <>
            <defs>
              <linearGradient id={`${id}-wash`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={tint(color, 0.28)} />
                <stop offset="1" stopColor={tint(color, 0)} />
              </linearGradient>
            </defs>
            <path d={`${line} L100 ${height} L0 ${height} Z`} fill={`url(#${id}-wash)`} />
          </>
        ) : null}
        {baseline === undefined ? null : (
          <line x1={0} x2={100} y1={yOf(baseline)} y2={yOf(baseline)} stroke={islandInk.tertiary} strokeWidth={1} strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
        )}
        <path d={line} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      {dot ? (
        <span
          style={{
            position: "absolute",
            left: `${last.x}%`,
            top: last.y,
            width: strokeWidth * 2.6,
            height: strokeWidth * 2.6,
            borderRadius: "50%",
            background: color,
            transform: "translate(-50%, -50%)",
          }}
        />
      ) : null}
    </span>
  );
};
