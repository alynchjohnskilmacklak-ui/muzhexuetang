"use client";

import { islandAccent, islandInk, tint } from "./theme";

/** Where one step of a staged task stands. */
export type StepState = "done" | "active" | "failed" | "pending";

interface StepProgressProps {
  /** One entry per step, in order. `stepsAt` builds the usual run of them. */
  steps: readonly StepState[];
  /** Colour of finished steps; the active one is a lighter wash of it. Defaults to blue. */
  color?: string;
  /**
   * "bar": one segment per step across the row, for stages with names (an order, a build).
   * "dots": a small dot per step and a short capsule for the active one, for counted rounds (focus
   * sessions, sets). Defaults to "bar".
   */
  shape?: "bar" | "dots";
  /** Segment height in pt for "bar". Defaults to 5, the label-led views' bar. */
  height?: number;
  /** Accessible name, such as "Step 3 of 5, running tests". Without it the row is decoration. Defaults to none. */
  label?: string;
}

/** `total` steps with the ones before `current` done, `current` active (or failed), the rest pending. A `current` of `total` or more marks every step done. */
export const stepsAt = ({ total, current, failed = false }: {
  /** How many steps there are. */
  total: number;
  /** Index of the step under way, from 0. */
  current: number;
  /** The step under way failed. Defaults to false. */
  failed?: boolean;
}): StepState[] =>
  Array.from({ length: Math.max(0, total) }, (_, index): StepState =>
    index < current ? "done" : index === current ? (failed ? "failed" : "active") : "pending",
  );

const fillFor = (state: StepState, color: string) => {
  switch (state) {
    case "done":
      return color;
    case "active":
      return tint(color, 0.5);
    case "failed":
      return islandAccent.red;
    case "pending":
      return islandInk.track;
    default: {
      const exhaustive: never = state;
      return exhaustive;
    }
  }
};

/** The dots shape's sizes in pt: a dot, the active capsule's length, and the space between. */
const dot = { size: 7, active: 16, gap: 5 } as const satisfies Record<string, number>;

/**
 * Progress through named stages or counted rounds: a food order (received, preparing, on the way,
 * delivered), a build's steps, focus sessions. The bar fills the row it sits in; put it in
 * `BottomBar` so its ends clear the corner arcs.
 */
export const StepProgress = ({ steps, color = islandAccent.blue, shape = "bar", height = 5, label }: StepProgressProps) => {
  const done = steps.filter((step) => step === "done").length;
  const a11y = label
    ? { role: "progressbar" as const, "aria-label": label, "aria-valuemin": 0, "aria-valuemax": steps.length, "aria-valuenow": done }
    : { "aria-hidden": true };
  if (shape === "dots") {
    return (
      <span {...a11y} style={{ display: "flex", alignItems: "center", gap: dot.gap, flex: "none" }}>
        {steps.map((step, index) => (
          <span
            key={index}
            style={{ width: step === "active" ? dot.active : dot.size, height: dot.size, borderRadius: dot.size / 2, background: step === "active" ? color : fillFor(step, color), flex: "none" }}
          />
        ))}
      </span>
    );
  }
  return (
    <span {...a11y} style={{ display: "flex", gap: 4, width: "100%" }}>
      {steps.map((step, index) => (
        <span key={index} style={{ flex: "1 1 0", minWidth: 0, height, borderRadius: height / 2, background: fillFor(step, color) }} />
      ))}
    </span>
  );
};
