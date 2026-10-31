import { SPELL_ACCESS_MAX, SpellAccessProblem, spellAccessProblem, spellContent } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import type { ContentId, ContentRegistry } from '@pioneer/rules/sdk';
import { message, ValidationError } from '@pioneer/shared/kernel';

/** Why access to a spell is refused, by the problem. */
const SPELL_ACCESS_REFUSALS: Readonly<Record<SpellAccessProblem, string>> = {
  [SpellAccessProblem.UnknownSpell]: 'character.validation.unknownSpell',
  [SpellAccessProblem.Common]: 'character.validation.spellAccessCommon',
  [SpellAccessProblem.Full]: 'character.validation.spellAccessFull',
};

/** Refuses access to a spell no loaded pack has for a slot (a focus spell among them), a common one, or past the most. */
export function assertSpellNeedsAccess(registry: ContentRegistry, character: Character, spell: ContentId): void {
  const problem = spellAccessProblem(spellContent(registry), character.document.build.spellAccess, spell);
  if (problem !== undefined) {
    const refusal =
      problem === SpellAccessProblem.Full
        ? message(SPELL_ACCESS_REFUSALS[problem], { maximum: SPELL_ACCESS_MAX })
        : message(SPELL_ACCESS_REFUSALS[problem]);
    throw new ValidationError([{ path: ['patch', 'spell'], message: refusal }]);
  }
}
