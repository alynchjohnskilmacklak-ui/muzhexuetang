"use client";

import type { ReactNode } from "react";

import { islandFont, islandInk, islandLine, islandSize, trackingFor } from "./theme";

interface MetricProps {
  /** What the value is, such as "Heart rate" or "Gate". */
  label: ReactNode;
  /** The value: text, or `NumberText` / `TickingTime` when it changes. */
  value: ReactNode;
  /** A unit after the value in grey, such as "BPM" or "km". Defaults to none. */
  unit?: ReactNode;
  /** Value colour, usually white or the activity's accent. Defaults to white. */
  color?: string;
  /** Alignment of the label and value. Defaults to "start". */
  align?: "start" | "center" | "end";
}

/** The value's size: between the 17 pt title and the 34 pt hero value, so three fit across the row. */
const valueSize = 20;
const valueLine = 24;

const textAlign = { start: "left", center: "center", end: "right" } as const satisfies Record<NonNullable<MetricProps["align"]>, string>;

/**
 * One labelled reading: a grey caption over a 20 pt value with an optional unit. For islands that
 * report several numbers at once (a workout's heart rate, pace and distance; a flight's gate, seat
 * and boarding time). Lay two to four side by side with `MetricRow`.
 */
export const Metric = ({ label, value, unit, color = islandInk.primary, align = "start" }: MetricProps) => (
  <span style={{ display: "grid", gap: 1, minWidth: 0, textAlign: textAlign[align], fontFamily: islandFont, WebkitFontSmoothing: "antialiased" }}>
    <span style={{ fontSize: islandSize.caption, fontWeight: 500, lineHeight: `${islandLine.caption}px`, color: islandInk.secondary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
      {label}
    </span>
    <span
      style={{
        fontSize: valueSize,
        fontWeight: 600,
        lineHeight: `${valueLine}px`,
        letterSpacing: trackingFor(valueSize),
        fontVariantNumeric: "tabular-nums",
        color,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {value}
      {unit === undefined ? null : (
        <span style={{ fontSize: islandSize.caption, fontWeight: 600, letterSpacing: 0, color: islandInk.secondary, marginLeft: 3 }}>{unit}</span>
      )}
    </span>
  </span>
);

interface MetricRowProps {
  /** The readings, left to right. Their `align` is set by position. Required. */
  metrics: readonly Omit<MetricProps, "align">[];
}

/**
 * Two to four `Metric`s across the expanded view, in equal columns: the first keeps to the leading
 * edge, the last to the trailing edge and any between are centred, so the row reads as one band.
 * Put it in `<ExpandedBottom reach="inset">` when it is the last row, so its outer values clear
 * the corner arcs.
 */
export const MetricRow = ({ metrics }: MetricRowProps) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(1, metrics.length)}, minmax(0, 1fr))`, gap: 8, minWidth: 0 }}>
    {metrics.map((metric, index) => (
      <Metric key={index} {...metric} align={index === 0 ? "start" : index === metrics.length - 1 ? "end" : "center"} />
    ))}
  </div>
);
