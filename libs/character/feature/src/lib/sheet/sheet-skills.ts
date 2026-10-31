import {
  buildRanks,
  characterStatisticContent,
  formTraits,
  itemContent,
  skillReads,
  skillSlots,
  skillsTrainedTwice,
  SkillTrainingSourceKind,
} from '@pioneer/character/domain';
import type { Character, SkillOption, SkillTrainingSource, TrainedSkill } from '@pioneer/character/domain';
import type { SelectOption } from '@pioneer/frontier';
import { CHECK_PENALTY, LineStatusKind } from '@pioneer/rules/engine';
import { Proficiency } from '@pioneer/rules/sdk';
import type { ContentRegistry, Level, SlotKey } from '@pioneer/rules/sdk';
import type { NamedStatistic, SkillPickerRow } from '@pioneer/rules/ui';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import type { Translate } from './sheet-skill-repeats';
import { rankSourcesOf, skillSlotLabel, sourceName, sourceNamesOf } from './sheet-skill-sources';
import type { SourceNames } from './sheet-skill-sources';
import { sheetSlotContent } from './sheet-slot-content';
import { sheetDerivation } from './sheet-statistics';

const SKILL_PREFIX = 'skill:';

/** The skills a form's traits bear on: the ones that deal with other creatures, and the ones that Recall Knowledge (#532). */
const FORM_NOTED_SKILLS: ReadonlySet<string> = new Set(
  [
    'deception',
    'diplomacy',
    'intimidation',
    'performance',
    'arcana',
    'crafting',
    'medicine',
    'nature',
    'occultism',
    'religion',
    'society',
  ].map((skill) => `${SKILL_PREFIX}${skill}`),
);

const FORM_TRAITS_KEY = 'character.sheet.skills.formTraits';

/**
 * Every skill and Lore the loaded statistics define, by name, each with what the engine derives for it: its rank
 * comes from the class, the background and the skill picks. A skill no pack defines is left out.
 */
export function sheetSkills(
  registry: ContentRegistry,
  character: Character,
  translate: Translate,
): readonly NamedStatistic[] {
  const content = characterStatisticContent(registry, character.document);
  if (content === undefined) {
    return [];
  }
  const results = sheetDerivation(registry, character);
  const skills = content.definitions.filter((definition) => definition.selector.startsWith(SKILL_PREFIX));
  const twice = trainedTwiceNotes(registry, character, translate);
  const ranks = buildRanks(character.document, sheetSlotContent(registry));
  const rankSources = rankSourcesOf(registry, character, translate);
  const traits = formTraits(character.document, itemContent(registry), sheetSlotContent(registry));
  const formNote = traits.length === 0 ? undefined : translate(FORM_TRAITS_KEY, { traits: traits.join(', ') });
  return skills
    .flatMap((definition): NamedStatistic[] => {
      const { selector } = definition;
      const result = results.get(selector);
      const notes = [twice.get(selector), FORM_NOTED_SKILLS.has(selector) ? formNote : undefined].filter(
        (each) => each !== undefined,
      );
      const note = notes.length === 0 ? undefined : notes.join(' ');
      const rank = ranks.get(selector) ?? Proficiency.Untrained;
      return result === undefined
        ? []
        : [
            {
              name: definition.name,
              kind: definition.kind,
              result,
              note,
              rank,
              rankSources: rankSources.get(selector) ?? [],
            },
          ];
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
 * its total now and the armor penalty in it. A skill the engine derives nothing for has no modifier.
 */
function skillRowsOf(registry: ContentRegistry, character: Character): SkillRows {
  const results = sheetDerivation(registry, character);
  const ranks = buildRanks(character.document, sheetSlotContent(registry));
  const definitions = characterStatisticContent(registry, character.document)?.definitions ?? [];
  const attributes = new Map(definitions.map(({ selector, keyAttribute }) => [selector, keyAttribute]));
  return (options) =>
    options.map(({ id, selector, name }): SkillPickerRow => {
      const result = results.get(selector);
      return {
        id,
        name,
        attribute: attributes.get(selector),
        rank: ranks.get(selector) ?? Proficiency.Untrained,
        modifier: result?.ok === true ? result.total : undefined,
        armorPenalty:
          result?.ok === true
            ? result.lines.find(
                ({ modifier, status }) => modifier.slug === CHECK_PENALTY && status.kind === LineStatusKind.Applied,
              )?.value
            : undefined,
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
