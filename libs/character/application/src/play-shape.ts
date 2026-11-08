import { isShapeCommand, itemContent, runeContent, ShapeProblem, shapeProblem } from '@pioneer/character/domain';
import type { Character, PlayEdit } from '@pioneer/character/domain';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import { message, ValidationError } from '@pioneer/shared/kernel';

/** The message each refused shape edit answers with. */
const SHAPE_MESSAGES = {
  [ShapeProblem.NotShifting]: 'character.validation.shapeNotShifting',
  [ShapeProblem.NoSuchShape]: 'character.validation.shapeUnavailable',
} as const satisfies Record<ShapeProblem, string>;

/** Refuses shifting an item that has no shifting rune, or into a weapon it cannot take the shape of. */
export async function checkShape(
  character: Character,
  command: PlayEdit,
  registry: () => Promise<ContentRegistry>,
): Promise<void> {
  if (!isShapeCommand(command)) {
    return;
  }
  const content = await registry();
  const reads = { items: itemContent(content), runes: runeContent(content) };
  const problem = shapeProblem(character.document.inventory, reads, command);
  if (problem !== undefined) {
    throw new ValidationError([{ path: ['command'], message: message(SHAPE_MESSAGES[problem]) }]);
  }
}
