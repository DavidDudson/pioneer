import {
  buildRanks,
  skillReads,
  SkillSlotKind,
  skillSlots,
  skillsTrainedTwice,
  SkillTrainingSourceKind,
} from '@pioneer/character/domain';
import type { Character, SkillOption, SkillSlot, SkillTrainingSource, TrainedSkill } from '@pioneer/character/domain';
import type { SelectOption } from '@pioneer/frontier';
import { statisticContent } from '@pioneer/rules/engine';
import { Proficiency } from '@pioneer/rules/sdk';
import type { ContentId, ContentRegistry, Level, SlotKey } from '@pioneer/rules/sdk';
import type { NamedStatistic, SkillPickerRow } from '@pioneer/rules/ui';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { sheetEntryNames } from './sheet-entry-names';
import type { Translate } from './sheet-skill-repeats';
import { sheetSlotContent } from './sheet-slot-content';
import { sheetDerivation } from './sheet-statistics';

/** What each skill slot is called, by whether it trains a skill or raises one. */
export const SKILL_SLOT_LABEL_KEYS: Readonly<Record<SkillSlotKind, string>> = {
  [SkillSlotKind.Training]: 'rules.choices.slot.skillTraining',
  [SkillSlotKind.Increase]: 'rules.choices.slot.skillIncrease',
};

const SKILL_PREFIX = 'skill:';

/** A thing that trains a skill, named as it is: an entry's name, which needs no translation. */
const TRAINED_SOURCE_KEY = 'character.sheet.trainedSource';

/**
 * Every skill and Lore the loaded statistics define, by name, each with what the engine derives for it: its rank
 * comes from the class, the background and the skill picks. A skill no pack defines is left out.
 */
export function sheetSkills(
  registry: ContentRegistry,
  character: Character,
  translate: Translate,
): readonly NamedStatistic[] {
  const content = statisticContent(registry);
  if (content === undefined) {
    return [];
  }
  const results = sheetDerivation(registry, character);
  const skills = registry.statistics().filter((entry) => entry.definition.selector.startsWith(SKILL_PREFIX));
  const twice = trainedTwiceNotes(registry, character, translate);
  return skills
    .flatMap((entry): NamedStatistic[] => {
      const result = results.get(entry.definition.selector);
      const note = twice.get(entry.definition.selector);
      return result === undefined ? [] : [{ name: entry.definition.name, kind: entry.definition.kind, result, note }];
    })
    .toSorted((left, right) => left.name.localeCompare(right.name));
}

/** A skill a trained skill slot can't offer, and one thing that trains it: "Religion", "Cleric". */
export interface TrainedNote {
  readonly id: string;
  readonly skill: string;
  readonly source: MessageDescriptor;
}

/** A skill slot the character has at its level, its label, the skills it offers by name, and the ones it can't. */
export interface SheetSkillSlot {
  readonly key: SlotKey;
  readonly label: MessageDescriptor;
  readonly options: readonly SelectOption<string>[];
  /** What the skill table shows of each skill on offer. */
  readonly rows: readonly SkillPickerRow[];
  readonly trained: readonly TrainedNote[];
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

/** What a skill's trainings are named by: an entry by its name, a slot by its label. */
interface SourceNames {
  readonly entries: ReadonlyMap<ContentId, string>;
  readonly slots: ReadonlyMap<SlotKey, MessageDescriptor>;
}

function sourceName(source: SkillTrainingSource, { entries, slots }: SourceNames): MessageDescriptor {
  if (source.kind === SkillTrainingSourceKind.Slot) {
    return slots.get(source.slot) ?? message(TRAINED_SOURCE_KEY, { name: source.slot });
  }
  return message(TRAINED_SOURCE_KEY, { name: entries.get(source.entry) ?? source.entry });
}

/** One note for each thing that trains each skill a slot can't offer. */
function trainedNotes(trained: readonly TrainedSkill[], names: SourceNames): readonly TrainedNote[] {
  return trained.flatMap(({ skill, sources }) =>
    sources.map((source): TrainedNote => {
      const named = sourceName(source, names);
      return {
        id: `${skill.id}:${source.kind === SkillTrainingSourceKind.Slot ? source.slot : source.entry}`,
        skill: skill.name,
        source: named,
      };
    }),
  );
}

/** What the skill slots and entries are named by, over the slots read. */
function sourceNamesOf(registry: ContentRegistry, slots: readonly SkillSlot[]): SourceNames {
  return {
    entries: sheetEntryNames(registry),
    slots: new Map(slots.map((slot) => [slot.key, skillSlotLabel(slot, slots)])),
  };
}

/**
 * The notice for each skill two sources train (#673), by the skill's selector: "Trained by Cleric and Acolyte; the
 * second training is lost".
 */
function trainedTwiceNotes(
  registry: ContentRegistry,
  character: Character,
  translate: Translate,
): ReadonlyMap<string, string> {
  const content = sheetSlotContent(registry);
  const names = sourceNamesOf(registry, skillSlots(character.document, skillReads(character.document, content)));
  const named = (source: SkillTrainingSource): string => {
    const { key, params } = sourceName(source, names);
    return translate(key, params ?? {});
  };
  return new Map(
    skillsTrainedTwice(character.document, content).flatMap(({ skill, sources }): [string, string][] => {
      const [first, second] = sources;
      return first === undefined || second === undefined
        ? []
        : [
            [
              skill.selector,
              translate('character.sheet.skillTrainedTwice', { first: named(first), second: named(second) }),
            ],
          ];
    }),
  );
}

/** The rows of the skills a slot offers. */
type SkillRows = (options: readonly SkillOption[]) => readonly SkillPickerRow[];

/**
 * The skill table's row for each skill a slot offers: the attribute that governs it, the rank the character has in it
 * and its total now. A skill the engine derives nothing for has no modifier.
 */
function skillRowsOf(registry: ContentRegistry, character: Character): SkillRows {
  const results = sheetDerivation(registry, character);
  const ranks = buildRanks(character.document, sheetSlotContent(registry));
  const attributes = new Map(
    registry.statistics().map((entry) => [entry.definition.selector, entry.definition.keyAttribute]),
  );
  return (options) =>
    options.map(({ id, selector, name }): SkillPickerRow => {
      const result = results.get(selector);
      return {
        id,
        name,
        attribute: attributes.get(selector),
        rank: ranks.get(selector) ?? Proficiency.Untrained,
        modifier: result?.ok === true ? result.total : undefined,
        disabledReason: undefined,
      };
    });
}

/** The skill slots whose level `wanted` accepts, in the order they are read, each with what it offers. */
function skillSlotsWhere(
  registry: ContentRegistry,
  character: Character,
  wanted: (level: Level) => boolean,
): readonly SheetSkillSlot[] {
  const content = sheetSlotContent(registry);
  const slots = skillSlots(character.document, skillReads(character.document, content));
  const names = sourceNamesOf(registry, slots);
  const rowsOf = skillRowsOf(registry, character);
  return slots
    .filter((slot) => wanted(slot.level))
    .map((slot) => ({
      key: slot.key,
      label: skillSlotLabel(slot, slots),
      options: slot.options.map((skill) => ({ value: skill.id, label: skill.name })),
      rows: rowsOf(slot.options),
      trained: trainedNotes(slot.trained, names),
    }));
}

/**
 * The trained skill and skill increase slots up to the character's level, in the order they are read, each with what
 * it offers after the grants and the slots before it. Slots above its level are the plan, picked in the timeline.
 */
export function sheetSkillSlots(registry: ContentRegistry, character: Character): readonly SheetSkillSlot[] {
  return skillSlotsWhere(registry, character, (level) => level <= character.level);
}

/** The skill slots above the character's level (#492), each offering what it will once the character is there. */
export function sheetPlannedSkillSlots(registry: ContentRegistry, character: Character): readonly SheetSkillSlot[] {
  return skillSlotsWhere(registry, character, (level) => level > character.level);
}
