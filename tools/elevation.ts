/** Class-name check for the `elevation-levels` rule: a panel's surface comes from an elevation level. */
export const ELEVATION_MESSAGES = {
  surface:
    '`{{variant}}` sets a surface by hand. Take it from an elevation level, `elevationVariants.flat|raised|overlay|modal` in tokens.ts, which pairs it with its line.',
} as const;

export interface ElevationProblem {
  readonly messageId: keyof typeof ELEVATION_MESSAGES;
  readonly variant: string;
}

const WHITESPACE = /\s+/u;
const LEVELLED_SURFACE = /^!?bg-surface-(?:base|raised|overlay)$/u;
const BACKDROP = 'backdrop';

/** Whether a class is a levelled surface, and not one painted behind a dialog (`backdrop:`, under any other variant). */
function paintsLevelledSurface(candidate: string): boolean {
  const variants = candidate.split(':');
  const [utility = ''] = (variants.pop() ?? '').split('/');

  return LEVELLED_SURFACE.test(utility) && !variants.includes(BACKDROP);
}

/** The first class in a class string that paints a levelled surface without a level, if any. */
export function elevationProblem(classes: string): ElevationProblem | undefined {
  const variant = classes.split(WHITESPACE).find((candidate) => paintsLevelledSurface(candidate));

  return variant === undefined ? undefined : { messageId: 'surface', variant };
}
