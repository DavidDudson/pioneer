import {
  characterGrants,
  characterSpellcasting,
  itemContent,
  StaffCastProblem,
  staffCastCost,
  staffCastProblem,
  staffSources,
} from '@pioneer/character/domain';
import type {
  Character,
  CountedMaxima,
  PlayState,
  ResourceCount,
  SlotContent,
  StaffCommand,
} from '@pioneer/character/domain';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import { message, ValidationError } from '@pioneer/shared/kernel';

/** The message each refused staff cast answers with. */
const STAFF_CAST_MESSAGES = {
  [StaffCastProblem.NotHeld]: 'character.validation.staffCastNotHeld',
  [StaffCastProblem.NotOnStaff]: 'character.validation.staffCastNotOnStaff',
  [StaffCastProblem.NotOnList]: 'character.validation.staffCastNotOnList',
  [StaffCastProblem.RankTooHigh]: 'character.validation.staffCastRankTooHigh',
  [StaffCastProblem.NotPrepared]: 'character.validation.staffCastNotPrepared',
  [StaffCastProblem.TooFewCharges]: 'character.validation.staffCastTooFewCharges',
  [StaffCastProblem.SlotNotAllowed]: 'character.validation.staffCastSlotNotAllowed',
  [StaffCastProblem.NoSlotLeft]: 'character.validation.staffCastNoSlotLeft',
  [StaffCastProblem.NothingToRefund]: 'character.validation.staffCastNothingToRefund',
} as const satisfies Record<StaffCastProblem, string>;

/** What a staff cast is checked against: the character and its play, and the content and slots they are read over. */
export interface StaffCastContext {
  readonly character: Character;
  readonly play: PlayState;
  readonly registry: ContentRegistry;
  readonly slots: SlotContent;
  readonly counted: CountedMaxima;
}

/**
 * The charges a staff cast, or taking one back, spends or refunds, once the staff, the spell and the way it is paid for
 * pass the checks; refuses the edit otherwise, so it is never partly applied. The staff's content gives the cost, not
 * the client.
 */
export function checkStaffCast(command: StaffCommand, context: StaffCastContext): ResourceCount {
  const { character, play, registry, slots, counted } = context;
  const sources = staffSources({
    inventory: character.document.inventory.items,
    items: itemContent(registry),
    spells: slots.spells,
    entries: characterSpellcasting(characterGrants(character.document, slots)),
    charges: play.resources.staff,
  });
  const source = sources.find(({ item }) => item.id === command.item);
  const problem = staffCastProblem(command, source, { spent: play.resources.slots, maxima: counted.slots });
  const spell = source?.spells.find(({ id }) => id === command.spell);
  if (problem !== undefined || spell === undefined) {
    throw new ValidationError([
      { path: ['command'], message: message(STAFF_CAST_MESSAGES[problem ?? StaffCastProblem.NotHeld]) },
    ]);
  }
  return staffCastCost(command, spell);
}
