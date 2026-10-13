import { computed, signal, untracked } from '@angular/core';
import type { Signal } from '@angular/core';
import type { Character, CharacterSlot, PickedPreparation } from '@pioneer/character/domain';
import type { InlineEdit, SelectOption } from '@pioneer/frontier';
import { ChoiceValue } from '@pioneer/rules/sdk';
import type { ContentRegistry, MagicTradition, SlotKey, Slug } from '@pioneer/rules/sdk';
import type { SpellDetailLine, Translate } from '@pioneer/rules/ui';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { NOT_CHOSEN, RootPick } from './sheet-build';
import { sheetField } from './sheet-field';
import { sheetPreparedSlots, spellMatches } from './sheet-prepared-spells';
import type { SheetPreparedEntry, SheetPreparedSlot } from './sheet-prepared-spells';
import { sheetSpellDetail } from './sheet-spell-details';

/** What the spell pickers read and write through. */
export interface SpellPickSources {
  /** A registry with the spells; undefined while it loads or the character prepares none. */
  readonly registry: Signal<ContentRegistry | undefined>;
  readonly character: Signal<Character | undefined>;
  /** The slots as the server read them. */
  readonly slots: Signal<readonly CharacterSlot[] | undefined>;
  readonly select: (slot: SlotKey, selection: ChoiceValue) => Promise<void>;
  readonly clear: (slot: SlotKey) => Promise<void>;
  readonly translate: Translate;
}

/** A prepared slot as an inline pick: the spells matching what was typed, and why its pick counts for nothing. */
interface PreparedField {
  readonly key: SlotKey;
  readonly label: MessageDescriptor;
  readonly matches: Signal<readonly SelectOption<string>[]>;
  readonly search: (query: string) => void;
  readonly reason: Signal<MessageDescriptor | undefined>;
  /** The spell the slot holds, with what casting it takes and does at the rank it is cast; undefined while the slot is empty. */
  readonly detail: Signal<SpellDetailLine | undefined>;
  readonly field: InlineEdit<string | undefined>;
}

/** The pickers of one rank on an entry, or of one rank of one of its pools. */
interface PreparedRankFields {
  readonly key: string;
  /** Reads anew as the level changes: cantrips are cast at half the level. */
  readonly heading: Signal<MessageDescriptor>;
  /** Reads anew as the character's choices change: a font's slots wait on the font. */
  readonly note: Signal<MessageDescriptor | undefined>;
  readonly fields: readonly PreparedField[];
}

/** A prepared entry's pickers, rank by rank; or a spontaneous entry's repertoire and signature spells (#479). */
export interface PreparedEntryFields {
  readonly key: Slug;
  readonly preparation: PickedPreparation;
  readonly tradition: MagicTradition;
  readonly ranks: readonly PreparedRankFields[];
}

function slotKeys(entries: readonly SheetPreparedEntry[]): string {
  return entries.flatMap((entry) => entry.ranks.flatMap((rank) => rank.slots.map((slot) => slot.key))).join(',');
}

function slotIn(entries: readonly SheetPreparedEntry[] | undefined, key: SlotKey): SheetPreparedSlot | undefined {
  return entries?.flatMap((entry) => entry.ranks.flatMap((rank) => rank.slots)).find((slot) => slot.key === key);
}

/** One prepared slot as an inline pick, saved by `selectSlot`, cleared by `clearSlot`. */
function preparedField(
  sources: SpellPickSources,
  entries: Signal<readonly SheetPreparedEntry[] | undefined>,
  read: SheetPreparedSlot,
): PreparedField {
  const { key, label } = read;
  const slot = computed(() => slotIn(entries(), key));
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
      return named ?? sources.translate('character.sheet.prepared.unknownSpell');
    },
  });
  return {
    key,
    label,
    matches: computed(() => spellMatches(options(), query())),
    search: (typed) => {
      query.set(typed);
    },
    reason: computed(() => slot()?.reason),
    detail: computed(() => {
      const registry = sources.registry();
      const spell = slot()?.spell;
      return registry === undefined || spell === undefined
        ? undefined
        : sheetSpellDetail(registry, spell, sources.translate);
    }),
    field,
  };
}

/**
 * One inline pick per prepared slot at the character's level (#478), grouped by entry and rank, made anew only when
 * the slots change (a level up, another class), so an edit in progress keeps its session while the character changes
 * around it. None while the spells load.
 */
export function preparedFieldsOf(sources: SpellPickSources): Signal<readonly PreparedEntryFields[]> {
  const entries = computed(() => {
    const registry = sources.registry();
    const character = sources.character();
    const slots = sources.slots();
    return registry === undefined || character === undefined || slots === undefined
      ? undefined
      : sheetPreparedSlots(registry, character, slots);
  });
  const keys = computed(() => slotKeys(entries() ?? []));
  return computed(() => {
    keys();
    return untracked(() =>
      (entries() ?? []).map((entry) => ({
        key: entry.key,
        preparation: entry.preparation,
        tradition: entry.tradition,
        ranks: entry.ranks.map((rank) => {
          const current = computed(() =>
            entries()
              ?.find((each) => each.key === entry.key)
              ?.ranks.find((each) => each.key === rank.key),
          );
          return {
            key: rank.key,
            heading: computed(() => current()?.heading ?? rank.heading),
            note: computed(() => current()?.note),
            fields: rank.slots.map((slot) => preparedField(sources, entries, slot)),
          };
        }),
      })),
    );
  });
}
