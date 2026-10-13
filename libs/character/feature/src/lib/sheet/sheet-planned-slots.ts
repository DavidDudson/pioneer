import type { Character } from '@pioneer/character/domain';
import type { SelectOption } from '@pioneer/frontier';
import type { ContentRegistry, SlotKey } from '@pioneer/rules/sdk';
import { ATTRIBUTE_MESSAGES } from '@pioneer/rules/ui';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { sheetPlannedBoosts } from './sheet-attributes';
import { sheetPlannedSkillSlots } from './sheet-skills';

/** A skill or boost slot above the character's level, with what it offers once the character is there. */
export interface SheetPlannedSlot {
  readonly key: SlotKey;
  readonly label: MessageDescriptor;
  readonly options: readonly SelectOption<string>[];
}

/**
 * The skill and boost slots above the character's level (#492), lowest first within each kind, as picks for the
 * timeline: a skill slot offers skills by name, a boost slot attributes by their translated name.
 */
export function sheetPlannedSlots(
  registry: ContentRegistry,
  character: Character,
  translate: (key: string) => string,
): readonly SheetPlannedSlot[] {
  return [
    ...sheetPlannedSkillSlots(registry, character),
    ...sheetPlannedBoosts(registry, character).map(({ key, label, options }) => ({
      key,
      label,
      options: options.map((attribute) => ({ value: attribute, label: translate(ATTRIBUTE_MESSAGES[attribute]) })),
    })),
  ];
}
