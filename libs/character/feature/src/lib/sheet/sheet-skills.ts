import { skillReads, SkillSlotKind, skillSlots, slotContent } from '@pioneer/character/domain';
import type { Character, SkillSlot } from '@pioneer/character/domain';
import type { SelectOption } from '@pioneer/frontier';
import { deriveStatistics, statisticContent } from '@pioneer/rules/engine';
import type { ContentRegistry, SlotKey } from '@pioneer/rules/sdk';
import type { NamedStatistic } from '@pioneer/rules/ui';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { statisticInputsOf } from './sheet-inputs';

/** What each skill slot is called, by whether it trains a skill or raises one. */
export const SKILL_SLOT_LABEL_KEYS: Readonly<Record<SkillSlotKind, string>> = {
  [SkillSlotKind.Training]: 'rules.choices.slot.skillTraining',
  [SkillSlotKind.Increase]: 'rules.choices.slot.skillIncrease',
};

const SKILL_PREFIX = 'skill:';

/**
 * Every skill and Lore the loaded statistics define, by name, each with what the engine derives for it: its rank
 * comes from the class, the background and the skill picks. A skill no pack defines is left out.
 */
export function sheetSkills(registry: ContentRegistry, character: Character): readonly NamedStatistic[] {
  const content = statisticContent(registry);
  if (content === undefined) {
    return [];
  }
  const results = deriveStatistics(content, statisticInputsOf(registry, character));
  const skills = registry.statistics().filter((entry) => entry.definition.selector.startsWith(SKILL_PREFIX));
  return skills
    .flatMap((entry): NamedStatistic[] => {
      const result = results.get(entry.definition.selector);
      return result === undefined ? [] : [{ name: entry.definition.name, kind: entry.definition.kind, result }];
    })
    .toSorted((left, right) => left.name.localeCompare(right.name));
}

/** A skill slot the character has at its level, its label, and the skills it offers by name. */
export interface SheetSkillSlot {
  readonly key: SlotKey;
  readonly label: MessageDescriptor;
  readonly options: readonly SelectOption<string>[];
}

/**
 * A skill slot's label: "Level 3 skill increase", "Level 1 trained skill", numbered when its level has several trained
 * skills ("Level 1 trained skill 2"), so each picker has a name of its own.
 */
function skillSlotLabel(slot: SkillSlot, slots: readonly SkillSlot[]): MessageDescriptor {
  const level = { level: slot.level };
  const alike = slots.filter((each) => each.kind === slot.kind && each.level === slot.level);
  if (slot.kind === SkillSlotKind.Increase || alike.length === 1) {
    return message(SKILL_SLOT_LABEL_KEYS[slot.kind], level);
  }
  return message('rules.choices.slot.skillTrainingNumbered', { ...level, number: alike.indexOf(slot) + 1 });
}

/**
 * The trained skill and skill increase slots up to the character's level, in the order they are read, each with what
 * it offers after the grants and the slots before it. Slots above its level are the plan, picked in the planner.
 */
export function sheetSkillSlots(registry: ContentRegistry, character: Character): readonly SheetSkillSlot[] {
  const content = slotContent(registry);
  const slots = skillSlots(character.document, skillReads(character.document, content));
  return slots
    .filter((slot) => slot.level <= character.level)
    .map((slot) => ({
      key: slot.key,
      label: skillSlotLabel(slot, slots),
      options: slot.options.map((skill) => ({ value: skill.id, label: skill.name })),
    }));
}
