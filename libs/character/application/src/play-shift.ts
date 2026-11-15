import { isShiftCommand, itemContent, runeContent, ShiftProblem, shiftProblem } from '@pioneer/character/domain';
import type { Character, PlayEdit } from '@pioneer/character/domain';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import { message, ValidationError } from '@pioneer/shared/kernel';

/** The message each refused shape edit answers with. */
const SHIFT_MESSAGES = {
  [ShiftProblem.NotShifting]: 'character.validation.shapeNotShifting',
  [ShiftProblem.NoSuchShift]: 'character.validation.shapeUnavailable',
} as const satisfies Record<ShiftProblem, string>;

/** Refuses shifting an item that has no shifting rune, or into a weapon it cannot take the shape of. */
export async function checkShift(
  character: Character,
  command: PlayEdit,
  registry: () => Promise<ContentRegistry>,
): Promise<void> {
  if (!isShiftCommand(command)) {
    return;
  }

  const content = await registry();
  const reads = { items: itemContent(content), runes: runeContent(content) };
  const problem = shiftProblem(character.document.inventory, reads, command);

  if (problem !== undefined) {
    throw new ValidationError([{ path: ['command'], message: message(SHIFT_MESSAGES[problem]) }]);
  }
}
