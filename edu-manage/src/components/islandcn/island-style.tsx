/**
 * Puts a block of CSS in the document head once, however many components render it. React 19
 * hoists a `<style>` with `href` and `precedence` and drops duplicates with the same `href`.
 *
 * Content primitives keep their keyframes and pseudo-class rules here (hover, press, focus),
 * which inline styles can't express. Class names start with `icn-`.
 */
export const IslandStyle = ({ id, css }: { id: string; css: string }) => (
  <style href={`islandcn-${id}`} precedence="islandcn">
    {css}
  </style>
);
