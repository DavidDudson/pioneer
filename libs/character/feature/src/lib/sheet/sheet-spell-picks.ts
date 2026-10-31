import { computed, signal, untracked } from '@angular/core';
import type { Signal } from '@angular/core';
import type { Character, CharacterSlot, PickedPreparation } from '@pioneer/character/domain';
import type { InlineEdit } from '@pioneer/frontier';
import { ChoiceValue, ContentId, ContentKind, facetsFor, SpellPreparation } from '@pioneer/rules/sdk';
import type { ContentRegistry, MagicTradition, SlotKey, Slug } from '@pioneer/rules/sdk';
import type { SpellDetailLine, SpellPickerRow, Translate, UsableLine } from '@pioneer/rules/ui';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { NOT_CHOSEN, RootPick } from './sheet-build';
import { sheetField } from './sheet-field';
import { sheetPreparedSlots } from './sheet-prepared-spells';
import type { SheetPreparedEntry, SheetPreparedSlot } from './sheet-prepared-spells';
import { sheetSlotContent } from './sheet-slot-content';
import { slotFilter } from './sheet-slot-filter';
import type { FilterSources, SlotFilter } from './sheet-slot-filter';
import { sheetSpellDetail } from './sheet-spell-details';
import { spellRows } from './sheet-spell-rows';
import type { SpellSpend } from './sheet-spell-use';
import { spellUse } from './sheet-spell-use';

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
  /** Changes when the language changes or the messages load, so translated text is read again. */
  readonly messages: Signal<unknown>;
  /** What casting is checked against; undefined while the turn and the play state load, when no spell can be cast. */
  readonly spend?: Signal<SpellSpend | undefined>;
  /** Where the pickers keep their filters; without it they list everything their slot offers, unfiltered. */
  readonly filters?: FilterSources;
}

/** A prepared slot as an inline pick: the spells it offers as table rows, and why its pick counts for nothing. */
export interface PreparedField {
  readonly key: SlotKey;
  readonly label: MessageDescriptor;
  readonly rows: Signal<readonly SpellPickerRow[]>;
  readonly reason: Signal<MessageDescriptor | undefined>;
  /** The spell the slot holds, with what casting it takes and does at the rank it is cast; undefined while the slot is empty. */
  readonly detail: Signal<SpellDetailLine | undefined>;
  /** The filter panel's state, for a slot whose pickers filter. */
  readonly filter: SlotFilter | undefined;
  /** The spell a gift fills the slot with, which can't be changed; undefined for a slot the player picks. */
  readonly grantedSpell: Signal<string | undefined>;
  /** What casting the spell it holds spends, and whether it can be cast now; undefined while the slot is empty or no spend is known. */
  readonly use: Signal<UsableLine | undefined>;
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

const SPELL_FACETS = facetsFor([ContentKind.Spell]);

/** `rows` less the spells the filters leave out; all of them where there are no filters. */
function without(rows: readonly SpellPickerRow[], hidden: ReadonlySet<string> | undefined): readonly SpellPickerRow[] {
  return hidden === undefined ? rows : rows.filter((row) => !hidden.has(row.id));
}

const NONE_TAKEN: ReadonlySet<ContentId> = new Set();

/**
 * The spells a spontaneous entry's repertoire holds in slots other than `key`: it knows a spell once, so another slot
 * of the entry can't take them. A prepared entry may prepare a spell in several slots, and a signature slot picks
 * from the repertoire, so neither has any.
 */
function takenElsewhere(
  entries: readonly SheetPreparedEntry[] | undefined,
  character: Character | undefined,
  key: SlotKey,
): ReadonlySet<ContentId> {
  const entry = entries?.find((each) => each.ranks.some((rank) => rank.slots.some((slot) => slot.key === key)));
  const own = slotIn(entries, key);
  if (entry === undefined || character === undefined || own?.signature === true) {
    return NONE_TAKEN;
  }
  if (entry.preparation !== SpellPreparation.Spontaneous) {
    return NONE_TAKEN;
  }
  const picks = entry.ranks
    .flatMap((rank) => rank.slots)
    .filter((slot) => !slot.signature && slot.key !== key)
    .map((slot) => ContentId.safeParse(slot.granted ? slot.spell?.id : character.document.build.choices[slot.key]));
  return new Set(picks.flatMap((pick) => (pick.success ? [pick.data] : [])));
}

/** What casting the spell a slot holds spends, and whether it can be cast now; undefined while the slot holds none. */
function castLine(sources: SpellPickSources, held: SheetPreparedSlot | undefined): UsableLine | undefined {
  const registry = sources.registry();
  const spend = sources.spend?.();
  const id = held?.spell?.id;
  const option =
    id === undefined || registry === undefined ? undefined : sheetSlotContent(registry).spells.anySpell(id);
  return spend === undefined || option === undefined ? undefined : spellUse(option, { slot: held?.slotKey }, spend);
}

/** The filter of a slot's picker: it opens on the slot's **Available to you** preset; none where the pickers do not filter. */
function spellSlotFilter(
  sources: SpellPickSources,
  read: SheetPreparedSlot,
  slot: Signal<SheetPreparedSlot | undefined>,
): SlotFilter | undefined {
  const { filters } = sources;
  return filters === undefined || read.preset === undefined
    ? undefined
    : slotFilter({
        registry: sources.registry,
        filters,
        key: read.key,
        offered: computed(() => (slot()?.spells ?? []).map((spell) => spell.id)),
        facets: signal(SPELL_FACETS),
        available: computed(() => slot()?.preset),
      });
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
  const filter = spellSlotFilter(sources, read, slot);
  return {
    key,
    label,
    rows: computed(() => {
      sources.messages();
      const taken = takenElsewhere(entries(), sources.character(), key);
      const rows = spellRows(slot()?.spells ?? [], { translate: sources.translate, castRank: slot()?.castRank, taken });
      return without(rows, filter?.hidden());
    }),
    reason: computed(() => slot()?.reason),
    filter,
    grantedSpell: computed(() => (slot()?.granted === true ? slot()?.spell?.name : undefined)),
    use: computed(() => castLine(sources, slot())),
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
