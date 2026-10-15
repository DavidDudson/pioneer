import type { ContentId } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import { SPELL_ACCESS_MAX } from './character-document';
import { needsAccess } from './spell-content';
import type { SpellContent } from './spell-content';

/** Why a spell can't be added to the build's access: no loaded spell for a slot has the id, it is common, or the list is full. */
export const SpellAccessProblem = {
  UnknownSpell: 'unknownSpell',
  Common: 'common',
  /** The build lists the most spells it can, and not this one. */
  Full: 'full',
} as const;
export type SpellAccessProblem = ValueOf<typeof SpellAccessProblem>;

/**
 * Why `spell` can't be granted access to, or undefined when it can: an uncommon, rare or unique spell that goes in a
 * slot, while the build lists fewer than the most it can (or lists it already).
 */
export function spellAccessProblem(
  spells: SpellContent,
  granted: readonly ContentId[],
  spell: ContentId,
): SpellAccessProblem | undefined {
  const named = spells.spell(spell);
  if (named === undefined) {
    return SpellAccessProblem.UnknownSpell;
  }
  if (!needsAccess(named.rarity)) {
    return SpellAccessProblem.Common;
  }
  const full = granted.length >= SPELL_ACCESS_MAX && !granted.includes(spell);
  return full ? SpellAccessProblem.Full : undefined;
}
