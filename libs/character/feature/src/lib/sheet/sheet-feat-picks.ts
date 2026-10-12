import { computed, signal, untracked } from '@angular/core';
import type { Signal } from '@angular/core';
import type { Character, CharacterSlot } from '@pioneer/character/domain';
import type { InlineEdit } from '@pioneer/frontier';
import type { ComboboxOption } from '@pioneer/frontier/data';
import { ChoiceValue } from '@pioneer/rules/sdk';
import type { ContentRegistry, SlotKey } from '@pioneer/rules/sdk';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { NOT_CHOSEN, RootPick } from './sheet-build';
import { featMatches, sheetFeats } from './sheet-feats';
import type { SheetFeats, SheetFeatSlot, SheetGrantedFeat } from './sheet-feats';
import { sheetField } from './sheet-field';

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
}

/** A feat slot as an inline pick: the feats matching what was typed, and why its pick counts for nothing. */
export interface FeatField {
  readonly key: SlotKey;
  readonly label: MessageDescriptor;
  readonly matches: Signal<readonly ComboboxOption<string>[]>;
  readonly search: (query: string) => void;
  readonly reason: Signal<MessageDescriptor | undefined>;
  readonly field: InlineEdit<string | undefined>;
}

/** The feat pickers and the feats features grant; undefined while the feats load. */
export interface FeatFields {
  readonly fields: readonly FeatField[];
  readonly granted: readonly SheetGrantedFeat[];
}

/** One feat slot as an inline pick, saved by `selectSlot`, cleared by `clearSlot`. */
function featField(sources: FeatPickSources, feats: Signal<SheetFeats | undefined>, read: SheetFeatSlot): FeatField {
  const { key, label } = read;
  const slot = computed(() => feats()?.slots.find((each) => each.key === key));
  const options = computed(() => slot()?.options ?? []);
  const query = signal('');
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
  return {
    key,
    label,
    matches: computed(() => featMatches(options(), query(), sources.translate)),
    search: (typed) => {
      query.set(typed);
    },
    reason: computed(() => slot()?.reason),
    field,
  };
}

/**
 * One inline pick per feat slot up to the character's level (#466), made anew only when the slots change (a level up,
 * another class), so an edit in progress keeps its session while the character changes around it; and the feats the
 * character's features grant. Undefined while the feats load.
 */
export function featFieldsOf(sources: FeatPickSources): Signal<FeatFields | undefined> {
  const feats = computed(() => {
    const registry = sources.registry();
    const character = sources.character();
    const slots = sources.slots();
    return registry === undefined || character === undefined || slots === undefined
      ? undefined
      : sheetFeats(registry, character, slots);
  });
  const keys = computed(() =>
    feats()
      ?.slots.map((slot) => slot.key)
      .join(','),
  );
  const fields = computed(() => {
    keys();
    return untracked(() => (feats()?.slots ?? []).map((slot) => featField(sources, feats, slot)));
  });
  return computed(() => {
    const read = feats();
    return read === undefined ? undefined : { fields: fields(), granted: read.granted };
  });
}
