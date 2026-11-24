/**
 * Apple's WebKit (Safari on macOS, and every browser on iOS) draws CSS filters on an element that
 * is not its own compositing layer in software, and that path costs the island two ways (round
 * q1, iOS 27 Safari against the same build in Chrome):
 *
 * - `blur()` under about one CSS px renders as a blur of about one px: blur(0.05px) and
 *   blur(0.8px) look the same. Content easing out of its blur held there for the last 300 ms of
 *   the expand, its glyphs smeared, then snapped sharp the frame the filter came off. The same
 *   element as a layer (`will-change: filter`) draws every radius as asked.
 * - The shadow's SVG filter (two Gaussian blurs over the whole stage at device scale) re-renders
 *   on the CPU every frame its path moves: the expand ran at about 5 fps.
 *
 * Chrome and Firefox draw both on the GPU, as asked, so they keep the original path and their
 * frames do not change.
 */
let cached: boolean | null = null;

/** True in Apple's WebKit engine; false on the server and in Blink, Gecko and Android. */
export const isAppleWebKit = (): boolean => {
  if (cached !== null) return cached;
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // Blink keeps "AppleWebKit" in its user agent for compatibility, so rule its tokens out.
  // Chrome, Edge and Firefox on iOS say CriOS, EdgiOS and FxiOS: they run Apple's WebKit.
  cached = /AppleWebKit\//.test(ua) && !/(Chrome|Chromium|Edg|OPR|SamsungBrowser)\/|Android/.test(ua);
  return cached;
};

/**
 * Writes a CSS blur in px (none at or under 0.01). In Apple's WebKit the element is made its own
 * layer while it is blurred and released once sharp, so small radii draw as asked (see above).
 * `holdLayer` keeps the layer while the blur is 0, for an element that blurs again and again (a
 * turning digit): building a filter layer costs Safari two to three frames, so building them per
 * turn stalled every digit roll (round q2: 27 to 63 ms on the turn's second frame, every second
 * on a running timer). Elsewhere it writes the filter alone, as before.
 */
export const writeBlur = (element: HTMLElement, px: number, holdLayer = false) => {
  const on = px > 0.01;
  element.style.filter = on ? `blur(${px.toFixed(2)}px)` : "none";
  if (isAppleWebKit()) element.style.willChange = on || holdLayer ? "filter" : "auto";
};
