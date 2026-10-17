import { CharacterPatchField, isPreparedSlotKey, PlayCommandField, slotRefusal } from '@pioneer/character/domain';
import type { Character, PlayEdit, PreparedPick, SlotContent } from '@pioneer/character/domain';
import { message, ValidationError } from '@pioneer/shared/kernel';
import type { Temporal } from '@pioneer/shared/kernel';

/** Why daily preparations refuses a prepared spell it was asked to change. */
const NOT_PREPARED_SLOT = message('character.validation.preparedSlotNotPrepared');
const SLOT_REPEATED = message('character.validation.preparedSlotRepeated');

/** What the prepared spells of a daily preparations are checked and written against. */
export interface PreparedEdit {
  readonly character: Character;
  readonly slots: SlotContent;
  readonly now: Temporal.Instant;
}

/** The spells a daily preparations prepares in place of the build's; none for any other edit. */
export function preparedPicksOf(command: PlayEdit): readonly PreparedPick[] {
  return command.field === PlayCommandField.DailyPreparations ? (command.prepared ?? []) : [];
}

/** Refuses `pick` unless it names a prepared slot of the character's that offers the spell, read over the build so far. */
function checkPick({ character, slots }: PreparedEdit, pick: PreparedPick, index: number): void {
  const path = ['command', 'prepared', index];
  if (!isPreparedSlotKey(pick.slot)) {
    throw new ValidationError([{ path, message: NOT_PREPARED_SLOT }]);
  }
  const refusal = slotRefusal(character.document, slots, pick);
  if (refusal !== undefined) {
    throw new ValidationError([{ path: [...path, refusal.field], message: refusal.message }]);
  }
}

/**
 * The character with the spells of a daily preparations prepared in its slots, each checked as `selectSlot` checks it
 * and replacing the slot's pick on the build. Undefined when the edit prepares none. Refuses the whole edit when any
 * is refused, so it is never partly applied.
 */
export function preparedAfter({ character, slots, now }: PreparedEdit, command: PlayEdit): Character | undefined {
  const picks = preparedPicksOf(command);
  if (picks.length === 0) {
    return undefined;
  }
  const seen = new Set<string>();
  let next = character;
  for (const [index, pick] of picks.entries()) {
    if (seen.has(pick.slot)) {
      throw new ValidationError([{ path: ['command', 'prepared', index, 'slot'], message: SLOT_REPEATED }]);
    }
    seen.add(pick.slot);
    checkPick({ character: next, slots, now }, pick, index);
    next = next.apply({ field: CharacterPatchField.SelectSlot, slot: pick.slot, selection: pick.selection }, now);
  }
  return next;
}
