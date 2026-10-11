import { computed, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import type { Character, CharacterSlot } from '@pioneer/character/domain';
import type { InlineEdit, SelectOption } from '@pioneer/frontier';
import { ChoiceValue } from '@pioneer/rules/sdk';
import type { ContentRegistry, SlotKey } from '@pioneer/rules/sdk';
import { ATTRIBUTE_MESSAGES } from '@pioneer/rules/ui';
import type { BuildLine, ChoiceLine, ClassFeatureLine } from '@pioneer/rules/ui';

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
import { sheetField } from './sheet-field';

/** What the build picks read and write through. */
export interface BuildPickSources {
  readonly registry: Signal<ContentRegistry | undefined>;
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
export interface BuildPicks {
  /** The picker options of one of the character's own slots; none while it or the content loads. */
  readonly rootOptions: (slot: SlotKey) => Signal<readonly SelectOption<string>[]>;
  /** One of the character's own slots as an inline pick, named by `options`. */
  readonly rootField: (
    slot: SlotKey,
    options: Signal<readonly SelectOption<string>[]>,
  ) => InlineEdit<string | undefined>;
  /** Undefined before a class is picked, or for a class without a subclass (fighter). */
  readonly subclass: Signal<SheetSubclass | undefined>;
  readonly subclassField: InlineEdit<string | undefined>;
  /** Undefined when the class allows a single key attribute. */
  readonly keyAttribute: Signal<SheetKeyAttribute | undefined>;
  readonly keyAttributeOptions: Signal<readonly SelectOption<string>[]>;
  readonly keyAttributeField: InlineEdit<string | undefined>;
  /** Undefined while the character or the content loads. */
  readonly features: Signal<readonly ClassFeatureLine[] | undefined>;
  /** What the character is, part by part; undefined while it, its slots or the content load. */
  readonly buildLines: Signal<readonly BuildLine[] | undefined>;
  /** Every choice with its status, as the server read the slots; undefined while the character loads. */
  readonly choices: Signal<readonly ChoiceLine[] | undefined>;
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

export function sheetBuildPicks(sources: BuildPickSources): BuildPicks {
  const subclass = loaded(sources, sheetSubclass);
  const keyAttribute = loaded(sources, sheetKeyAttribute);
  const keyAttributeOptions = computed((): readonly SelectOption<string>[] =>
    (keyAttribute()?.options ?? []).map((attribute) => ({
      value: attribute,
      label: sources.translate(ATTRIBUTE_MESSAGES[attribute]),
    })),
  );
  return {
    rootOptions: (slot) =>
      computed(() => {
        const registry = sources.registry();
        const character = sources.character();
        return registry === undefined || character === undefined ? [] : sheetRootOptions(registry, character, slot);
      }),
    rootField: (slot, options) => slotField(sources, signal(slot), options),
    subclass,
    subclassField: slotField(
      sources,
      computed(() => subclass()?.key),
      computed(() => subclass()?.options ?? []),
    ),
    keyAttribute,
    keyAttributeOptions,
    keyAttributeField: slotField(
      sources,
      computed(() => keyAttribute()?.key),
      keyAttributeOptions,
    ),
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
  };
}
