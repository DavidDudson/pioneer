/**
 * Every Tailwind class in frontier comes from a semantic token. Shared by the
 * oxlint `class-tokens` rule, which checks the class strings in `cva()` /
 * `cx()` calls and component `host.class`.
 *
 * Banned, because each bypasses the token tiers in src/styles:
 * - arbitrary values and variants: `h-[2.75rem]`, `p-(--x)`, `data-[x=y]:`;
 * - pixel values: `h-px`, `border-2px`;
 * - raw scale numbers: `opacity-50`, `z-10`, `duration-150`, `w-1/2`, `bg-x/50`;
 * - `!important` modifiers;
 * - rounded corners and shadows (`rounded-*`, `shadow-*`, `ring-*`, …):
 *   frontier is sharp and flat, so no theme can bring them back;
 * plus the layout-variant rules in ./layout-variants.ts.
 *
 * Numbers that are counts, not sizes, are allowed (`grid-cols-3`, `flex-1`).
 * Token names that end in a step (`gap-2xs`, `p-3xl`) are not numbers.
 */
import { LAYOUT_VARIANT_MESSAGES, layoutVariantProblem } from './layout-variants.ts';

export const CLASS_TOKEN_MESSAGES = {
  ...LAYOUT_VARIANT_MESSAGES,
  arbitrary:
    '`{{variant}}` uses an arbitrary value or variant. Add a semantic token to src/styles (or a @custom-variant) and use its utility.',
  px: '`{{variant}}` is a pixel value. Use a spacing or size token.',
  numeric:
    '`{{variant}}` uses a raw scale number. Use a semantic token (e.g. `opacity-disabled`, `z-sticky`, `duration-fast`).',
  important: '`{{variant}}` forces `!important`. Fix the conflicting classes in the cva instead.',
  sharp:
    '`{{variant}}` rounds corners or casts a shadow. Frontier is sharp and flat: separate with borders and surface colours.',
} as const;

export interface ClassTokenProblem {
  readonly messageId: keyof typeof CLASS_TOKEN_MESSAGES;
  readonly variant: string;
}

const ARBITRARY = /[[\]()]/u;
const PIXEL = /(?:^|-)px$|\dpx\b/u;
/** Corner radius and every shadow-like utility (box, inset, ring, drop, text). */
const SHARP = /^(?:rounded|shadow|inset-shadow|ring|inset-ring|drop-shadow|text-shadow)(?:-|$)/u;
/** Token steps like `2xs` / `3xl`: digits that are part of a name, not a value. */
const TOKEN_STEP = /(?<=-)\d?x[sl](?=$|-)/gu;
const DIGIT = /\d/u;
/** Utilities whose number is a count or a flex factor, not a length. */
const COUNTS =
  /^(?:grid-cols-\d+|grid-rows-\d+|col-span-\d+|row-span-\d+|line-clamp-\d+|order-\d+|flex-1|grow-0|shrink-0)$/u;

/** Problems in the utility itself, without variants, `!` or a leading `-`. */
function baseProblem(base: string, token: string): ClassTokenProblem | undefined {
  if (SHARP.test(base)) {
    return { messageId: 'sharp', variant: token };
  }
  if (PIXEL.test(base)) {
    return { messageId: 'px', variant: token };
  }
  if (base.includes('/') || (!COUNTS.test(base) && DIGIT.test(base.replaceAll(TOKEN_STEP, '')))) {
    return { messageId: 'numeric', variant: token };
  }
  return undefined;
}

function tokenProblem(token: string): ClassTokenProblem | undefined {
  if (ARBITRARY.test(token)) {
    return { messageId: 'arbitrary', variant: token };
  }
  const utility = token.split(':').at(-1) ?? token;
  if (utility.startsWith('!') || utility.endsWith('!')) {
    return { messageId: 'important', variant: token };
  }
  return baseProblem(utility.replace(/^-/u, ''), token);
}

/** The first token problem in a class string, if any. */
export function classTokenProblem(classes: string, inPrimitive: boolean): ClassTokenProblem | undefined {
  const layout = layoutVariantProblem(classes, inPrimitive);
  if (layout !== undefined) {
    return layout;
  }
  for (const token of classes.split(/\s+/u)) {
    const problem = token === '' ? undefined : tokenProblem(token);
    if (problem !== undefined) {
      return problem;
    }
  }
  return undefined;
}
