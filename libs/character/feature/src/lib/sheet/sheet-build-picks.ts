import { computed, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { BACKGROUND_SLOT, CLASS_SLOT } from '@pioneer/character/domain';
import type { Character, CharacterSlot } from '@pioneer/character/domain';
import type { InlineEdit, SelectOption } from '@pioneer/frontier';
import type { Defences } from '@pioneer/rules/engine';
import type { ChoiceValue, ContentId, ContentRegistry, SlotKey } from '@pioneer/rules/sdk';
import { ATTRIBUTE_MESSAGES } from '@pioneer/rules/ui';
import type {
  BuildLine,
  ChoiceLine,
  ClassFeatureLine,
  LevelTimelineRow,
  NamedStatistic,
  NamedStrike,
  StrikesShield,
  SpellcastingEntryLine,
} from '@pioneer/rules/ui';

import { sheetAttributes } from './sheet-attributes';
import type { SheetAttributes } from './sheet-attributes';
import {
  sheetBuildSummary,
  sheetClassFeatures,
  sheetKeyAttribute,
  sheetRootOptions,
  sheetSubclass,
} from './sheet-build';
import type { SheetKeyAttribute, SheetSubclass } from './sheet-build';
import { sheetChoices, sheetChoiceSlots } from './sheet-choices';
import { sheetDefences } from './sheet-defences';
import { sheetEntryNames } from './sheet-entry-names';
import { sheetPlannedSlots } from './sheet-planned-slots';
import { withSituations } from './sheet-situations';
import type { SituationClaims } from './sheet-situations';
import { markTrainedAgain, sheetTrainedAgain } from './sheet-skill-repeats';
import { sheetSkills, sheetSkillSlots } from './sheet-skills';
import { slotField, slotFieldsOf } from './sheet-slot-picks';
import type { SlotPickField } from './sheet-slot-picks';
import { sheetSpellcasting } from './sheet-spellcasting';
import { sheetStatistics } from './sheet-statistics';
import { sheetShields, sheetStrikes } from './sheet-strikes';
import { sheetTimeline } from './sheet-timeline';

/** What the build picks read and write through. */
export interface BuildPickSources {
  readonly registry: Signal<ContentRegistry | undefined>;
  /** The registry the engine derives from: with the item kinds once the character carries equipment. */
  readonly engineRegistry: Signal<ContentRegistry | undefined>;
  readonly character: Signal<Character | undefined>;
  /** The slots as the server read them. */
  readonly slots: Signal<readonly CharacterSlot[] | undefined>;
  readonly select: (slot: SlotKey, selection: ChoiceValue) => Promise<void>;
  readonly clear: (slot: SlotKey) => Promise<void>;
  readonly translate: (key: string, params?: object) => string;
  /** The situations claimed for the next roll of each statistic; the statistics are derived with them counted. */
  readonly claims: Signal<SituationClaims>;
}

/**
 * The sheet's build pickers: one per root slot (ancestry aside, which has its own options), the subclass and key
 * attribute the class asks for, each shown only when the class has it, and what the build summary and class features
 * list show, and the Choices section's lines.
 */
/** What the sheet reads from the engine, over the registry with the item kinds once anything is carried. */
interface EngineReads {
  /** AC, the saves and Perception from the engine; undefined while the character or the content loads. */
  readonly statistics: Signal<readonly NamedStatistic[] | undefined>;
  /** Every skill and Lore with what the engine derives for it; undefined while the character or the content loads. */
  readonly skills: Signal<readonly NamedStatistic[] | undefined>;
  /** Each Strike, held weapons' then a feature's fist; undefined while the character or the content loads. */
  readonly strikes: Signal<readonly NamedStrike[] | undefined>;
  /** The shields held, shown beside the Strikes; none while the character or the content loads. */
  readonly shields: Signal<readonly StrikesShield[]>;
  /** Each spellcasting entry with its spell attack and DC; undefined while the character or the content loads. */
  readonly spellcasting: Signal<readonly SpellcastingEntryLine[] | undefined>;
  /** Names for the entries the defences, statistics and spellcasting lines come from; none while the content loads. */
  readonly entryNames: Signal<ReadonlyMap<ContentId, string>>;
}

export interface BuildPicks extends EngineReads {
  /** The picker options of one of the character's own slots; none while it or the content loads. */
  readonly rootOptions: (slot: SlotKey) => Signal<readonly SelectOption<string>[]>;
  /** One of the character's own slots as an inline pick, named by `options`. */
  readonly rootField: (
    slot: SlotKey,
    options: Signal<readonly SelectOption<string>[]>,
  ) => InlineEdit<string | undefined>;
  /** Undefined before a class is picked, or for a class without a subclass (fighter). */
  readonly subclass: Signal<SheetSubclass | undefined>;
  readonly subclassOptions: Signal<readonly SelectOption<string>[]>;
  /** One edit per subclass slot, so a class change starts a new edit session; undefined while there is none. */
  readonly subclassField: Signal<InlineEdit<string | undefined> | undefined>;
  /** Undefined when the class allows a single key attribute. */
  readonly keyAttribute: Signal<SheetKeyAttribute | undefined>;
  readonly keyAttributeOptions: Signal<readonly SelectOption<string>[]>;
  /** One edit per key attribute slot; undefined while there is none. */
  readonly keyAttributeField: Signal<InlineEdit<string | undefined> | undefined>;
  /** Immunities, weaknesses and resistances from the engine; undefined while the character or the content loads. */
  readonly defences: Signal<Defences | undefined>;
  /** The attribute modifiers and the boosts still to pick; undefined while the character or the content loads. */
  readonly attributes: Signal<SheetAttributes | undefined>;
  /** Undefined while the character or the content loads. */
  readonly features: Signal<readonly ClassFeatureLine[] | undefined>;
  /** What the character is, part by part; undefined while it, its slots or the content load. */
  readonly buildLines: Signal<readonly BuildLine[] | undefined>;
  /** Every choice with its status, as the server read the slots; undefined while the character loads. */
  readonly choices: Signal<readonly ChoiceLine[] | undefined>;
  /** One row per level from 1 to 20 with the slots it opens; undefined while the character or the content loads. */
  readonly timeline: Signal<readonly LevelTimelineRow[] | undefined>;
  /** One pick per trained skill and skill increase up to the character's level, in the order they are read. */
  readonly skillFields: Signal<readonly SlotPickField[]>;
  /**
   * One pick per `ChoiceSet` that lists its options (a divine font, a domain, a warden spell), by the entry asking
   * (#596).
   */
  readonly choiceFields: Signal<readonly SlotPickField[]>;
  /** One pick per skill and boost slot above the character's level, for the timeline to offer ahead of time (#492). */
  readonly plannedFields: Signal<readonly SlotPickField[]>;
}

/** `read` over the loaded registry and character; undefined while either loads. */
function loaded<TValue>(
  { registry, character }: BuildPickSources,
  read: (registry: ContentRegistry, character: Character) => TValue,
): Signal<TValue | undefined> {
  return computed(() => {
    const content = registry();
    const current = character();
    return content === undefined || current === undefined ? undefined : read(content, current);
  });
}

/**
 * An inline pick for whichever slot `slot` names, made anew when the key changes: an edit session (and its Revert)
 * belongs to one slot, so a class change never saves a doctrine into a school. `slot` reads only the key, so the edit
 * stays the same while the character changes around it.
 */
function fieldPerSlot(
  sources: BuildPickSources,
  slot: Signal<SlotKey | undefined>,
  options: Signal<readonly SelectOption<string>[]>,
): Signal<InlineEdit<string | undefined> | undefined> {
  return computed(() => {
    const key = slot();
    return key === undefined ? undefined : slotField(sources, signal(key), options);
  });
}

function engineReads(sources: BuildPickSources): EngineReads {
  const engine = { ...sources, registry: sources.engineRegistry };
  const shields = loaded(engine, sheetShields);
  return {
    statistics: loaded(engine, (registry, character) =>
      withSituations(registry, character, {
        statistics: sheetStatistics(registry, character),
        claims: sources.claims(),
      }),
    ),
    skills: loaded(engine, (registry, character) =>
      withSituations(registry, character, {
        statistics: sheetSkills(registry, character, sources.translate),
        claims: sources.claims(),
      }),
    ),
    strikes: loaded(engine, sheetStrikes),
    shields: computed(() => shields() ?? []),
    spellcasting: loaded(engine, sheetSpellcasting),
    entryNames: computed(() => {
      const registry = sources.engineRegistry() ?? sources.registry();
      return registry === undefined ? new Map<ContentId, string>() : sheetEntryNames(registry);
    }),
  };
}

/** The root slots whose options say what they would train again (#674): the others don't train skills. */
const MARKED_ROOT_SLOTS: ReadonlySet<SlotKey> = new Set([BACKGROUND_SLOT, CLASS_SLOT]);

/** The picker options of one of the character's own slots; none while it or the content loads. */
function rootOptionsOf(sources: BuildPickSources, slot: SlotKey): Signal<readonly SelectOption<string>[]> {
  return computed(() => {
    const registry = sources.registry();
    const character = sources.character();
    if (registry === undefined || character === undefined) {
      return [];
    }
    const options = sheetRootOptions(registry, character, slot);
    return MARKED_ROOT_SLOTS.has(slot)
      ? markTrainedAgain(sheetTrainedAgain(registry, character, slot), options, sources.translate)
      : options;
  });
}

/** The subclass picker's options, each marked when it would train a skill again (#674); none while it or the content loads. */
function subclassOptionsOf(
  sources: BuildPickSources,
  subclass: Signal<SheetSubclass | undefined>,
): Signal<readonly SelectOption<string>[]> {
  return computed(() => {
    const registry = sources.registry();
    const character = sources.character();
    const read = subclass();
    if (read === undefined || registry === undefined || character === undefined) {
      return [];
    }
    return markTrainedAgain(sheetTrainedAgain(registry, character, read.key), read.options, sources.translate);
  });
}

/** The sheet's build pickers over `sources`, each reading the registry, the character and its slots as they load. */
export function sheetBuildPicks(sources: BuildPickSources): BuildPicks {
  const subclass = loaded(sources, sheetSubclass);
  const subclassOptions = subclassOptionsOf(sources, subclass);
  const keyAttribute = loaded(sources, sheetKeyAttribute);
  const keyAttributeOptions = computed((): readonly SelectOption<string>[] =>
    (keyAttribute()?.options ?? []).map((attribute) => ({
      value: attribute,
      label: sources.translate(ATTRIBUTE_MESSAGES[attribute]),
    })),
  );
  return {
    rootOptions: (slot) => rootOptionsOf(sources, slot),
    rootField: (slot, options) => slotField(sources, signal(slot), options),
    subclass,
    subclassOptions,
    subclassField: fieldPerSlot(
      sources,
      computed(() => subclass()?.key),
      subclassOptions,
    ),
    keyAttribute,
    keyAttributeOptions,
    keyAttributeField: fieldPerSlot(
      sources,
      computed(() => keyAttribute()?.key),
      keyAttributeOptions,
    ),
    defences: loaded(sources, sheetDefences),
    attributes: loaded(sources, sheetAttributes),
    features: loaded(sources, sheetClassFeatures),
    buildLines: computed(() => {
      const registry = sources.registry();
      const character = sources.character();
      const slots = sources.slots();
      return registry === undefined || character === undefined || slots === undefined
        ? undefined
        : sheetBuildSummary(registry, character, slots);
    }),
    choices: computed(() => {
      const slots = sources.slots();
      return slots === undefined ? undefined : sheetChoices(slots);
    }),
    timeline: loaded(sources, sheetTimeline),
    ...engineReads(sources),
    ...pickFields(sources),
  };
}

/** The skill, choice and planned slot pickers, each reading its slots as they load. */
function pickFields(sources: BuildPickSources): Pick<BuildPicks, 'skillFields' | 'choiceFields' | 'plannedFields'> {
  return {
    skillFields: slotFieldsOf(
      sources,
      loaded(sources, (registry, character) =>
        sheetSkillSlots(registry, character).map(({ key, label, options, trained, rows }) => ({
          key,
          label,
          options,
          trained,
          rows: { kind: 'skills', rows },
        })),
      ),
    ),
    choiceFields: slotFieldsOf(
      sources,
      loaded(sources, (registry, character) =>
        sheetChoiceSlots(registry, character).map(({ key, label, options, rows }) => ({
          key,
          label,
          options,
          rows: { kind: 'choices', rows },
        })),
      ),
    ),
    plannedFields: slotFieldsOf(
      sources,
      loaded(sources, (registry, character) => sheetPlannedSlots(registry, character, sources.translate)),
    ),
  };
}
