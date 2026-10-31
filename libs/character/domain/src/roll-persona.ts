import { BlockKind, InlineKind, RichTextString } from '@pioneer/rules/sdk';
import type { RichText } from '@pioneer/rules/sdk';

import { CharacterName } from './character-fields';
import { CHARACTER_FLAWS, CHARACTER_NAMES, CHARACTER_TRAITS } from './character-roll-tables';
import { PickBound, seededPicks } from './pick-source';
import type { Seed } from './pick-source';
import { rollOn } from './roll-table';

/**
 * Draws thrown away first. The generator's first draw from a small seed is near zero, so every small seed would
 * roll the first line; two steps spread them. Generation is unaffected, so its seeds keep their characters.
 */
const WARM_UP = [PickBound.parse(2), PickBound.parse(2)] as const;

/** Who a generated character is: a name, and a trait and a flaw as the personality. */
export interface Persona {
  readonly name: CharacterName;
  readonly personality: RichText;
}

/** The persona `seed` rolls on the character roll tables: the same seed always gives the same one. */
export function rollPersona(seed: Seed): Persona {
  const source = seededPicks(seed);
  for (const bound of WARM_UP) {
    source.below(bound);
  }
  const name = rollOn(source, CHARACTER_NAMES);
  const trait = rollOn(source, CHARACTER_TRAITS);
  const flaw = rollOn(source, CHARACTER_FLAWS);
  return {
    name: CharacterName.parse(name),
    personality: [trait, flaw].map((line) => ({
      type: BlockKind.Paragraph,
      content: [{ type: InlineKind.Text, text: RichTextString.parse(line) }],
    })),
  };
}
