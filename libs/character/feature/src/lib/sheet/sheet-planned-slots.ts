import type { Character } from '@pioneer/character/domain';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import { ATTRIBUTE_MESSAGES } from '@pioneer/rules/ui';

import { sheetPlannedBoosts } from './sheet-attributes';
import { sheetPlannedSkillSlots } from './sheet-skills';
import type { PickSlot } from './sheet-slot-picks';

/**
 * The skill and boost slots above the character's level (#492), lowest first within each kind, as picks for the
 * timeline: a skill slot offers skills with the character's standing in each, a boost slot attributes with their
 * modifier now and once boosted.
 */
export function sheetPlannedSlots(
  registry: ContentRegistry,
  character: Character,
  translate: (key: string) => string,
): readonly PickSlot[] {
  return [
    ...sheetPlannedSkillSlots(registry, character).map(({ key, label, options, rows }): PickSlot => ({
      key,
      label,
      options,
      rows: { kind: 'skills', rows },
    })),
    ...sheetPlannedBoosts(registry, character, translate).map(({ key, label, options, rows }): PickSlot => ({
      key,
      label,
      options: options.map((attribute) => ({ value: attribute, label: translate(ATTRIBUTE_MESSAGES[attribute]) })),
      rows: { kind: 'attributes', rows },
    })),
  ];
}
