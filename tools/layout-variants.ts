/**
 * Used by the oxlint `layout-variants` rule (every string in libs/frontier) and
 * by `class-tokens` (tools/class-tokens.ts). Frontier templates hold no class
 * strings: they bind `[class]` to a cva, so all classes are in TypeScript.
 *
 * Frontier has no viewport breakpoints. Layout responds to the space it is
 * given, through container queries, and only the layout primitives (fr-box,
 * fr-grid, fr-stack) may use them; every other component composes those.
 * Container variants are `@sm:` / `@md:` / `@lg:` only: unprefixed is the
 * narrow (phone) layout and variants only expand it, so `@max-*`, arbitrary
 * `@[…]` sizes and viewport variants (`sm:`, `max-*:`, …) are all banned.
 */
export const LAYOUT_PRIMITIVE = /(?:^|\/)libs\/frontier\/src\/lib\/layout\/(?:box|grid|stack)\//u;

const VIEWPORT_VARIANT = /(?:^|[\s:])(?<variant>(?:sm|md|lg|xl|2xl|tablet|desktop|max-[\w[\]().-]+|min-\[[^\]]*\]):)/u;
const CONTAINER_VARIANT = /(?:^|[\s:])(?<variant>@[^\s:]+:)/gu;
const CONTAINER_SIZES = new Set(['@sm:', '@md:', '@lg:']);

export const LAYOUT_VARIANT_MESSAGES = {
  viewport:
    '`{{variant}}` is a viewport breakpoint and frontier has none. Compose fr-grid / fr-stack / fr-box, which respond to their own width.',
  outsidePrimitive:
    '`{{variant}}` outside a layout primitive. Compose fr-grid / fr-stack / fr-box instead of adding responsive CSS.',
  unknownSize:
    '`{{variant}}` is not a container size. Use `@sm:` / `@md:` / `@lg:`, which only expand the narrow layout.',
} as const;

export interface LayoutVariantProblem {
  readonly messageId: keyof typeof LAYOUT_VARIANT_MESSAGES;
  readonly variant: string;
}

/** The first layout-variant problem in a class string, if any. */
export function layoutVariantProblem(classes: string, inPrimitive: boolean): LayoutVariantProblem | undefined {
  const viewport = VIEWPORT_VARIANT.exec(classes)?.groups?.['variant'];
  if (viewport !== undefined) {
    return { messageId: 'viewport', variant: viewport };
  }
  const variants = [...classes.matchAll(CONTAINER_VARIANT)].flatMap((match) => match.groups?.['variant'] ?? []);
  const unknown = variants.find((variant) => !CONTAINER_SIZES.has(variant));
  if (unknown !== undefined) {
    return { messageId: 'unknownSize', variant: unknown };
  }
  const [first] = variants;
  return first === undefined || inPrimitive ? undefined : { messageId: 'outsidePrimitive', variant: first };
}
