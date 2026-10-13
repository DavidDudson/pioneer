import { computed, untracked } from '@angular/core';
import type { Signal } from '@angular/core';
import type { Character, CharacterSlot } from '@pioneer/character/domain';
import type { InlineEdit } from '@pioneer/frontier';
import { ChoiceValue, DisplayCategory } from '@pioneer/rules/sdk';
import type { ContentRegistry, SlotKey } from '@pioneer/rules/sdk';
import type { FeatPickerRow } from '@pioneer/rules/ui';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { NOT_CHOSEN, RootPick } from './sheet-build';
import { visibleFeatGroups } from './sheet-feat-groups';
import type { SheetFeatGroup } from './sheet-feat-groups';
import { featRows, sheetFeats } from './sheet-feats';
import type { SheetFeats, SheetFeatSlot } from './sheet-feats';
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
  /** Whether the user shows the feats that only grant something else; they are folded away until they do. */
  readonly showGrantOnly: Signal<boolean>;
  /** Changes when the language changes or the messages load, so translated text is read again. */
  readonly messages: Signal<unknown>;
}

/** A feat slot as an inline pick: the feats it offers as table rows, and why its pick counts for nothing. */
export interface FeatField {
  readonly key: SlotKey;
  readonly label: MessageDescriptor;
  readonly rows: Signal<readonly FeatPickerRow[]>;
  readonly reason: Signal<MessageDescriptor | undefined>;
  readonly field: InlineEdit<string | undefined>;
}

/** The feat pickers and the feats the character has by slot type; undefined while the feats load. */
export interface FeatFields {
  readonly fields: readonly FeatField[];
  readonly groups: readonly SheetFeatGroup[];
  /** Whether the character has a feat that only grants something else, so there is a filter to offer. */
  readonly hasGrantOnly: boolean;
}

/** One feat slot as an inline pick, saved by `selectSlot`, cleared by `clearSlot`. */
function featField(sources: FeatPickSources, feats: Signal<SheetFeats | undefined>, read: SheetFeatSlot): FeatField {
  const { key, label } = read;
  const slot = computed(() => feats()?.slots.find((each) => each.key === key));
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
  return {
    key,
    label,
    rows: computed(() => {
      sources.messages();
      return featRows(options(), {
        translate: sources.translate,
        trainedAgain: slot()?.trainedAgain ?? (() => new Map()),
      });
    }),
    reason: computed(() => slot()?.reason),
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
 * One inline pick per feat slot up to the character's level (#466), and the feats the character's features grant.
 * Undefined while the feats load.
 */
export function featFieldsOf(sources: FeatPickSources): Signal<FeatFields | undefined> {
  const feats = featsOf(sources);
  const fields = fieldsOf(sources, feats, (read) => read.slots);
  return computed(() => {
    const read = feats();
    if (read === undefined) {
      return undefined;
    }
    const hasGrantOnly = read.groups.some((group) =>
      group.feats.some((feat) => feat.category === DisplayCategory.GrantOnly),
    );
    return { fields: fields(), groups: visibleFeatGroups(read.groups, sources.showGrantOnly()), hasGrantOnly };
  });
}

/**
 * One inline pick per feat slot above the character's level (#492), offering the feats it will have at the slot's
 * level. The timeline's alone, so the feats section builds none. Empty while the feats load.
 */
export function plannedFeatFieldsOf(sources: FeatPickSources): Signal<readonly FeatField[]> {
  return fieldsOf(sources, featsOf(sources), (read) => read.planned);
}
