import { computed, signal, untracked } from '@angular/core';
import type { Signal } from '@angular/core';
import type { Character, CharacterSlot } from '@pioneer/character/domain';
import type { InlineEdit, SelectOption } from '@pioneer/frontier';
import type { Defences } from '@pioneer/rules/engine';
import { ChoiceValue } from '@pioneer/rules/sdk';
import type { ContentRegistry, SlotKey } from '@pioneer/rules/sdk';
import { ATTRIBUTE_MESSAGES } from '@pioneer/rules/ui';
import type { BuildLine, ChoiceLine, ClassFeatureLine, NamedStatistic, SpellcastingEntryLine } from '@pioneer/rules/ui';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { sheetAttributes } from './sheet-attributes';
import type { SheetAttributes } from './sheet-attributes';
import {
  NOT_CHOSEN,
  RootPick,
  sheetBuildSummary,
  sheetClassFeatures,
  sheetKeyAttribute,
  sheetRootOptions,
  sheetSubclass,
} from './sheet-build';
import type { SheetKeyAttribute, SheetSubclass } from './sheet-build';
import { sheetChoices } from './sheet-choices';
import { sheetDefences } from './sheet-defences';
import { sheetField } from './sheet-field';
import { sheetSkills, sheetSkillSlots } from './sheet-skills';
import { sheetSpellcasting } from './sheet-spellcasting';
import { sheetStatistics } from './sheet-statistics';

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
  readonly translate: (key: string) => string;
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
  /** Each spellcasting entry with its spell attack and DC; undefined while the character or the content loads. */
  readonly spellcasting: Signal<readonly SpellcastingEntryLine[] | undefined>;
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
  /** AC, the saves and Perception from the character's registry; undefined while the character or the content loads. */
  readonly defences: Signal<Defences | undefined>;
  /** The attribute modifiers and the boosts still to pick; undefined while the character or the content loads. */
  readonly attributes: Signal<SheetAttributes | undefined>;
  /** Undefined while the character or the content loads. */
  readonly features: Signal<readonly ClassFeatureLine[] | undefined>;
  /** What the character is, part by part; undefined while it, its slots or the content load. */
  readonly buildLines: Signal<readonly BuildLine[] | undefined>;
  /** Every choice with its status, as the server read the slots; undefined while the character loads. */
  readonly choices: Signal<readonly ChoiceLine[] | undefined>;
  /** One pick per trained skill and skill increase up to the character's level, in the order they are read. */
  readonly skillFields: Signal<readonly SkillField[]>;
}

/** A trained skill or skill increase slot as an inline pick, with its label and the skills it offers. */
export interface SkillField {
  readonly key: SlotKey;
  readonly label: MessageDescriptor;
  readonly options: Signal<readonly SelectOption<string>[]>;
  readonly field: InlineEdit<string | undefined>;
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

/** The name the server read for the pick stored in `slot`, shown when its slot no longer offers it. */
function storedName({ slots }: BuildPickSources, slot: SlotKey): string | undefined {
  const read = slots()?.find((each) => each.key === slot);
  return read !== undefined && 'selectionName' in read ? read.selectionName : undefined;
}

/**
 * A slot as an inline pick, named by its options, or by the name the server read when its slot no longer offers the
 * pick. An empty slot, or one the character hasn't (its key undefined), reads as `NOT_CHOSEN`, never undefined, which
 * the edit takes for still loading.
 */
function slotField(
  sources: BuildPickSources,
  slot: Signal<SlotKey | undefined>,
  options: Signal<readonly SelectOption<string>[]>,
): InlineEdit<string | undefined> {
  return sheetField<string | undefined>(sources.character, {
    read: (character) => {
      const key = slot();
      return key === undefined ? NOT_CHOSEN : (character.document.build.choices[key] ?? NOT_CHOSEN);
    },
    empty: NOT_CHOSEN,
    schema: RootPick,
    save: async (value) => {
      const key = slot();
      if (key === undefined) {
        return;
      }
      await (value === undefined || value === NOT_CHOSEN
        ? sources.clear(key)
        : sources.select(key, ChoiceValue.parse(value)));
    },
    format: (value) => {
      if (value === undefined || value === NOT_CHOSEN) {
        return sources.translate('character.sheet.notChosen');
      }
      const key = slot();
      const stored = key === undefined ? undefined : storedName(sources, key);
      return options().find((option) => option.value === value)?.label ?? stored ?? value;
    },
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
  return {
    statistics: loaded(engine, sheetStatistics),
    skills: loaded(engine, sheetSkills),
    spellcasting: loaded(engine, sheetSpellcasting),
  };
}

/** The picker options of one of the character's own slots; none while it or the content loads. */
function rootOptionsOf(sources: BuildPickSources, slot: SlotKey): Signal<readonly SelectOption<string>[]> {
  return computed(() => {
    const registry = sources.registry();
    const character = sources.character();
    return registry === undefined || character === undefined ? [] : sheetRootOptions(registry, character, slot);
  });
}

/** The sheet's build pickers over `sources`, each reading the registry, the character and its slots as they load. */
export function sheetBuildPicks(sources: BuildPickSources): BuildPicks {
  const subclass = loaded(sources, sheetSubclass);
  const subclassOptions = computed(() => subclass()?.options ?? []);
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
    ...engineReads(sources),
    skillFields: skillFieldsOf(sources),
  };
}

function sameKeys(left: readonly SlotKey[], right: readonly SlotKey[]): boolean {
  return left.length === right.length && left.every((key, index) => key === right[index]);
}

/**
 * One inline pick per skill slot up to the character's level, made anew only when the slots change (a class change, an
 * Intelligence boost, a level up), so an edit in progress keeps its session while the character changes around it.
 */
function skillFieldsOf(sources: BuildPickSources): Signal<readonly SkillField[]> {
  const slots = loaded(sources, sheetSkillSlots);
  const keys = computed(() => (slots() ?? []).map((slot) => slot.key), { equal: sameKeys });
  return computed(() =>
    keys().flatMap((key): SkillField[] => {
      const label = untracked(() => slots()?.find((slot) => slot.key === key)?.label);
      if (label === undefined) {
        return [];
      }
      const options = computed(() => slots()?.find((slot) => slot.key === key)?.options ?? []);
      return [{ key, label, options, field: slotField(sources, signal(key), options) }];
    }),
  );
}
