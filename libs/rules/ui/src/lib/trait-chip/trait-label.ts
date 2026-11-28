import type { Trait } from '@pioneer/rules/sdk';
import { capitalise } from '@pioneer/shared/utils';

const WORD_SEPARATOR = /-/gu;

/** A trait slug read as words, for a chip whose name nobody gave: `deadly-d8` is "Deadly d8". */
export function humaniseTrait(trait: Trait): string {
  const words = trait.replaceAll(WORD_SEPARATOR, ' ');

  return capitalise(words);
}
