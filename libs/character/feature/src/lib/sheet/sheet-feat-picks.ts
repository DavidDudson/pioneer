import { computed, untracked } from '@angular/core';
import type { Signal } from '@angular/core';
import type { Character, CharacterSlot } from '@pioneer/character/domain';
import type { InlineEdit } from '@pioneer/frontier';
import { ChoiceValue } from '@pioneer/rules/sdk';
import type { ContentRegistry, SlotKey } from '@pioneer/rules/sdk';
import type { FeatPickerRow } from '@pioneer/rules/ui';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { NOT_CHOSEN, RootPick } from './sheet-build';
import { featSlotFilter } from './sheet-feat-slot-filter';
import { featRows, sheetFeats } from './sheet-feats';
import type { SheetFeats, SheetFeatSlot } from './sheet-feats';
import { sheetField } from './sheet-field';
import type { FilterSources, SlotFilter } from './sheet-slot-filter';

/** What the feat pickers read and write through. */
export interface FeatPickSources {
  /** A registry with the feats; undefined while it loads. */
  readonly registry: Signal<ContentRegistry | undefined>;
  readonly character: Signal<Character | undefined>;
  /** The slots as the server read them. */
  readonly slots: Signal<readonly CharacterSlot[] | undefined>;
  readonly select: (slot: SlotKey, selection: ChoiceValue) => Promise<void>;
  readonly clear: (slot: SlotKey) => Promise<void>;
  readonly translate: (key: string, params?: object) => string;
  /** Changes when the language changes or the messages load, so translated text is read again. */
  readonly messages: Signal<unknown>;
  /** Where the pickers keep their filters; without it they list everything their slot offers, unfiltered. */
  readonly filters?: FilterSources;
}

/** A feat slot as an inline pick: the feats it offers as table rows, and why its pick counts for nothing. */
export interface FeatField {
  readonly key: SlotKey;
  readonly label: MessageDescriptor;
  readonly rows: Signal<readonly FeatPickerRow[]>;
  readonly reason: Signal<MessageDescriptor | undefined>;
  /** The filter panel's state, when the pickers filter. */
  readonly filter: SlotFilter | undefined;
  readonly field: InlineEdit<string | undefined>;
}

/** One feat slot as an inline pick, saved by `selectSlot`, cleared by `clearSlot`. */
function featField(sources: FeatPickSources, feats: Signal<SheetFeats | undefined>, read: SheetFeatSlot): FeatField {
  const { key, label } = read;
  const slot = computed(() => feats()?.planned.find((each) => each.key === key));
  const options = computed(() => slot()?.options ?? []);
  const field = sheetField<string | undefined>(sources.character, {
    read: (character) => character.document.build.choices[key] ?? NOT_CHOSEN,
    empty: NOT_CHOSEN,
    schema: RootPick,
    save: async (value) => {
      await (value === undefined || value === NOT_CHOSEN
        ? sources.clear(key)
        : sources.select(key, ChoiceValue.parse(value)));
    },
    format: (value) => {
      if (value === undefined || value === NOT_CHOSEN) {
        return sources.translate('character.sheet.notChosen');
      }
      const named = options().find((option) => option.value === value)?.label ?? slot()?.storedName;
      return named ?? sources.translate('character.sheet.feats.unknownFeat');
    },
  });
  const filter =
    sources.filters === undefined ? undefined : featSlotFilter({ ...sources, filters: sources.filters, key, options });
  return {
    key,
    label,
    rows: computed(() => {
      sources.messages();
      return featRows(
        options(),
        { translate: sources.translate, trainedAgain: slot()?.trainedAgain ?? (() => new Map()) },
        filter?.hidden(),
      );
    }),
    reason: computed(() => slot()?.reason),
    filter,
    field,
  };
}

/** The feats as read; undefined while the registry, the character or the slots load. */
function featsOf(sources: FeatPickSources): Signal<SheetFeats | undefined> {
  return computed(() => {
    const registry = sources.registry();
    const character = sources.character();
    const slots = sources.slots();
    return registry === undefined || character === undefined || slots === undefined
      ? undefined
      : sheetFeats(registry, character, slots);
  });
}

/**
 * An inline pick for each slot `pick` chooses from the feats, made anew only when those slots' keys change (a level up,
 * another class), so an edit in progress keeps its session while the character changes around it.
 */
function fieldsOf(
  sources: FeatPickSources,
  feats: Signal<SheetFeats | undefined>,
  pick: (read: SheetFeats) => readonly SheetFeatSlot[],
): Signal<readonly FeatField[]> {
  const slots = (): readonly SheetFeatSlot[] => {
    const read = feats();
    return read === undefined ? [] : pick(read);
  };
  const keys = computed(() =>
    slots()
      .map((slot) => slot.key)
      .join(','),
  );
  return computed(() => {
    keys();
    return untracked(() => slots().map((slot) => featField(sources, feats, slot)));
  });
}

/**
 * One inline pick per feat slot, at any level (#492), offering the feats it will have at the slot's level. The
 * level tabs' alone. Empty while the feats load.
 */
export function plannedFeatFieldsOf(sources: FeatPickSources): Signal<readonly FeatField[]> {
  return fieldsOf(sources, featsOf(sources), (read) => read.planned);
}
