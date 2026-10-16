import {
  characterGrants,
  characterSpellcasting,
  isSpendCommand,
  isStaffCommand,
  itemContent,
  ResourceCount,
  spentStaffOf,
  StaffCommandField,
  StaffCastProblem,
  staffCastCost,
  staffCastProblem,
  staffSources,
} from '@pioneer/character/domain';
import type {
  Character,
  CountedMaxima,
  PlayCommand,
  PlayState,
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

/** The charges taking back a cast refunds when the staff or its spell is gone, so there is nothing to refund them to. */
const NO_CHARGES = ResourceCount.parse(0);

/** What a staff cast is checked against: the character and its play, and the content and slots they are read over. */
export interface StaffCastContext {
  readonly character: Character;
  readonly play: PlayState;
  readonly registry: ContentRegistry;
  readonly slots: SlotContent;
  readonly counted: CountedMaxima;
  /** Whether the cast is being taken back from the spend log, which refunds what was spent however the build has changed since. */
  readonly undoing?: boolean | undefined;
}

/**
 * The charges a staff cast, or taking one back, spends or refunds, once the staff, the spell and the way it is paid for
 * pass the checks; refuses the edit otherwise, so it is never partly applied. The staff's content gives the cost, not
 * the client.
 */
export function checkStaffCast(command: StaffCommand, context: StaffCastContext): ResourceCount {
  const { character, play, registry, slots, counted, undoing } = context;
  const sources = staffSources({
    inventory: character.document.inventory.items,
    items: itemContent(registry),
    spells: slots.spells,
    entries: characterSpellcasting(characterGrants(character.document, slots)),
    charges: play.resources.staff,
  });
  const source = sources.find(({ item }) => item.id === command.item);
  const spell = source?.spells.find(({ id }) => id === command.spell);
  if (undoing === true) {
    return spell === undefined ? NO_CHARGES : staffCastCost(command, spell);
  }
  const problem = staffCastProblem(command, source, { spent: play.resources.slots, maxima: counted.slots });
  if (problem !== undefined || spell === undefined) {
    throw new ValidationError([
      { path: ['command'], message: message(STAFF_CAST_MESSAGES[problem ?? StaffCastProblem.NotHeld]) },
    ]);
  }
  return staffCastCost(command, spell);
}

/**
 * The staff cast `command` makes or takes back, to check and cost: a staff edit itself, or a spend that records a cast
 * (casting a spell from a staff on the spend log) or takes such a spend back. Undefined for any other edit.
 */
export function staffCastOf(play: PlayState, command: PlayCommand): StaffCommand | undefined {
  if (isStaffCommand(command)) {
    return command;
  }
  return isSpendCommand(command) ? spentStaffOf(play, command) : undefined;
}

/** Whether `command` takes a staff cast back from the spend log, rather than being a staff edit that takes one back. */
export function takesBackCast(command: PlayCommand, cast: StaffCommand): boolean {
  return isSpendCommand(command) && cast.field === StaffCommandField.UncastStaff;
}
