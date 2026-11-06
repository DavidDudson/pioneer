import type { Character, TurnState } from '@pioneer/character/domain';
import { ActionOriginKind, ActionStatus } from '@pioneer/rules/engine';
import { ActionCost, ActionMode } from '@pioneer/rules/sdk';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import { ActionCategory } from '@pioneer/rules/ui';
import type { ActionLine } from '@pioneer/rules/ui';

import { turnFit } from './sheet-actions';
import { sheetSlotContent } from './sheet-slot-content';
import { sheetStrikes } from './sheet-strikes';

/** The sheet modes a Strike is made in: a fight, and exploring when something turns up. */
const STRIKE_MODES: readonly ActionMode[] = [ActionMode.Encounter, ActionMode.Exploration];

/**
 * The character's Strikes as lines of the action list (#1778): each one action, rolling its attack, and made with its
 * weapon. A Strike is not a content action, so it carries the weapon's own origin and the weapon's name as its source.
 */
export function sheetStrikeActions(
  registry: ContentRegistry,
  character: Character,
  turn: TurnState | undefined,
): readonly ActionLine[] {
  const slots = sheetSlotContent(registry);
  return sheetStrikes(registry, character).map(({ name, traits, strike }): ActionLine => {
    const fit = turnFit(turn, ActionCost.One, undefined);
    return {
      id: strike.weapon.origin.entry,
      name,
      traits,
      cost: ActionCost.One,
      modes: STRIKE_MODES,
      origin: { kind: ActionOriginKind.Granted, source: strike.weapon.origin },
      category: ActionCategory.Strikes,
      source: slots.lookup.entry(strike.weapon.origin.entry)?.name,
      status: fit.affordable === false ? ActionStatus.Unavailable : ActionStatus.Available,
      reasons: fit.reasons,
      attack: true,
      roll: strike.attack?.ok === true ? strike.attack : undefined,
      priority: undefined,
      dormant: false,
      affordable: fit.affordable,
      affordableUpTo: fit.affordableUpTo,
    };
  });
}
