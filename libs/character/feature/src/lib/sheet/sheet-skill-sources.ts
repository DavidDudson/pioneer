import { SkillSlotKind, SkillTrainingSourceKind, skillReads, skillSlots } from '@pioneer/character/domain';
import type { Character, SkillSlot, SkillTrainingSource } from '@pioneer/character/domain';
import { Proficiency } from '@pioneer/rules/sdk';
import type { ContentId, ContentRegistry, SlotKey } from '@pioneer/rules/sdk';
import type { RankSource } from '@pioneer/rules/ui';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { sheetEntryNames } from './sheet-entry-names';
import type { Translate } from './sheet-skill-repeats';
import { sheetSlotContent } from './sheet-slot-content';

/** What each skill slot is called, by whether it trains a skill or raises one. */
export const SKILL_SLOT_LABEL_KEYS: Readonly<Record<SkillSlotKind, string>> = {
  [SkillSlotKind.Training]: 'rules.choices.slot.skillTraining',
  [SkillSlotKind.Increase]: 'rules.choices.slot.skillIncrease',
};

/** A thing that trains a skill, named as it is: an entry's name, which needs no translation. */
const TRAINED_SOURCE_KEY = 'character.sheet.trainedSource';

/**
 * A skill slot's label: "Level 3 skill increase", "Level 1 trained skill", numbered when its level has several trained
 * skills ("Level 1 trained skill 2"), so each picker has a name of its own.
 */
export function skillSlotLabel(slot: SkillSlot, slots: readonly SkillSlot[]): MessageDescriptor {
  const level = { level: slot.level };
  const alike = slots.filter((each) => each.kind === slot.kind && each.level === slot.level);
  if (slot.kind === SkillSlotKind.Increase || alike.length === 1) {
    return message(SKILL_SLOT_LABEL_KEYS[slot.kind], level);
  }
  return message('rules.choices.slot.skillTrainingNumbered', { ...level, number: alike.indexOf(slot) + 1 });
}

/** What a skill's trainings are named by: an entry by its name, a slot by its label. */
export interface SourceNames {
  readonly entries: ReadonlyMap<ContentId, string>;
  readonly slots: ReadonlyMap<SlotKey, MessageDescriptor>;
}

export function sourceName(source: SkillTrainingSource, { entries, slots }: SourceNames): MessageDescriptor {
  if (source.kind === SkillTrainingSourceKind.Slot) {
    return slots.get(source.slot) ?? message(TRAINED_SOURCE_KEY, { name: source.slot });
  }
  return message(TRAINED_SOURCE_KEY, { name: entries.get(source.entry) ?? source.entry });
}

/** What the skill slots and entries are named by, over the slots read. */
export function sourceNamesOf(registry: ContentRegistry, slots: readonly SkillSlot[]): SourceNames {
  return {
    entries: sheetEntryNames(registry),
    slots: new Map(slots.map((slot) => [slot.key, skillSlotLabel(slot, slots)])),
  };
}

/** A skill's selector and one rank source for it. */
type SelectedSource = readonly [string, RankSource];

/** The rank the entries that train a skill give: trained, by each class or background named. */
function entrySources(slots: readonly SkillSlot[], names: SourceNames, translate: Translate): SelectedSource[] {
  const trained = new Map(slots.flatMap((slot) => slot.trained).map(({ skill, sources }) => [skill.selector, sources]));
  return [...trained].flatMap(([selector, sources]) =>
    sources
      .filter((source) => source.kind === SkillTrainingSourceKind.Entry)
      .map((source): SelectedSource => {
        const { key, params } = sourceName(source, names);
        return [selector, { rank: Proficiency.Trained, source: translate(key, params ?? {}), future: false }];
      }),
  );
}

/** The rank each skill slot's pick reaches, marked with its level when it is above the character's. */
function slotSources(slots: readonly SkillSlot[], translate: Translate, level: number): SelectedSource[] {
  return slots.flatMap((slot): SelectedSource[] => {
    if (slot.pick === undefined || slot.rank === undefined) {
      return [];
    }
    const { key, params } = skillSlotLabel(slot, slots);
    const future = slot.level > level;
    const source: RankSource = {
      rank: slot.rank,
      source: translate(key, params ?? {}),
      level: future ? slot.level : undefined,
      future,
    };
    return [[slot.pick.selector, source]];
  });
}

/**
 * What gave each skill its rank, by the skill's selector: the entries that train it (a class, a background), then each
 * skill slot that picked it, with the rank the pick reaches. A pick above the character's level is a rank still to
 * come, marked as such with its level.
 */
export function rankSourcesOf(
  registry: ContentRegistry,
  character: Character,
  translate: Translate,
): ReadonlyMap<string, readonly RankSource[]> {
  const slots = skillSlots(character.document, skillReads(character.document, sheetSlotContent(registry)));
  const names = sourceNamesOf(registry, slots);
  const sources = new Map<string, RankSource[]>();
  for (const [selector, source] of [
    ...entrySources(slots, names, translate),
    ...slotSources(slots, translate, character.level),
  ]) {
    sources.set(selector, [...(sources.get(selector) ?? []), source]);
  }
  return sources;
}
