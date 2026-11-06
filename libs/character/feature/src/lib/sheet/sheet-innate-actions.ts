import { characterGrants, characterInnate, characterSpellcasting, spellCost } from '@pioneer/character/domain';
import type { Character, TurnState } from '@pioneer/character/domain';
import { ActionOriginKind, ActionStatus } from '@pioneer/rules/engine';
import { ActionMode } from '@pioneer/rules/sdk';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import { ActionCategory } from '@pioneer/rules/ui';
import type { ActionLine } from '@pioneer/rules/ui';

import { turnFit } from './sheet-actions';
import { sheetSlotContent } from './sheet-slot-content';

/** Casting is for a fight and for the time between; downtime casts are rituals and the like, not the turn's. */
const CAST_MODES: readonly ActionMode[] = [ActionMode.Encounter, ActionMode.Exploration];

/**
 * The character's innate spells as lines of the action list (#1778), each cast for what the spell takes, at the rank
 * its innate element names. A spell cast over minutes or longer has no cost a turn pays, so its line has none.
 */
export function sheetInnateActions(
  registry: ContentRegistry,
  character: Character,
  turn: TurnState | undefined,
): readonly ActionLine[] {
  const content = sheetSlotContent(registry);
  const entries = characterSpellcasting(characterGrants(character.document, content));
  return characterInnate(entries, content.spells, character.document.level).flatMap(({ entry, spells }) =>
    spells.map(({ spell }): ActionLine => {
      const range = spellCost(spell);
      const fit = turnFit(turn, range?.cost, range);
      return {
        id: spell.id,
        name: spell.name,
        traits: [],
        cost: range?.cost,
        modes: CAST_MODES,
        origin: { kind: ActionOriginKind.Granted, source: entry.origin },
        category: ActionCategory.Innate,
        source: undefined,
        status: fit.affordable === false ? ActionStatus.Unavailable : ActionStatus.Available,
        reasons: fit.reasons,
        roll: undefined,
        priority: undefined,
        dormant: false,
        upTo: range?.upTo,
        affordable: fit.affordable,
        affordableUpTo: fit.affordableUpTo,
      };
    }),
  );
}
