import type { PreparedPick } from '@pioneer/character/domain';
import { ChoiceValue, SpellPreparation } from '@pioneer/rules/sdk';
import type { ContentId, MagicTradition, SlotKey, Slug } from '@pioneer/rules/sdk';
import type { SpellPickerRow } from '@pioneer/rules/ui';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import type { SheetPreparedEntry } from './sheet-prepared-spells';
import type { RestLine } from './sheet-rest';
import { spellRows } from './sheet-spell-rows';

/** One prepared slot daily preparations can change: the spells it offers and the one it holds now. */
interface RestPreparedSlot {
  readonly key: SlotKey;
  readonly label: MessageDescriptor;
  /** The spells it offers, as the picker's rows. */
  readonly rows: readonly SpellPickerRow[];
  /** The spell the build prepares in the slot; undefined while it is empty. */
  readonly current: ContentId | undefined;
}

/** One rank of a prepared entry (or of one of its pools): the unit daily preparations offers Change for. */
interface RestPreparedRank {
  /** Unique across the character: the entry and the rank's key within it. */
  readonly key: string;
  readonly heading: MessageDescriptor;
  readonly slots: readonly RestPreparedSlot[];
}

/** A prepared entry's ranks. */
export interface RestPreparedEntry {
  readonly key: Slug;
  readonly tradition: MagicTradition;
  readonly ranks: readonly RestPreparedRank[];
}

/**
 * The prepared entries' ranks with a slot the player picks, which are the ones daily preparations can change: a
 * spontaneous entry's repertoire, a signature slot and a slot a bloodline fills are left out, and so is a rank left
 * with no slot.
 */
export function restPreparedEntries(
  entries: readonly SheetPreparedEntry[],
  translate: (key: string) => string,
): readonly RestPreparedEntry[] {
  return entries
    .filter(({ preparation }) => preparation === SpellPreparation.Prepared)
    .map(({ key, tradition, ranks }) => ({
      key,
      tradition,
      ranks: ranks
        .map(({ key: rankKey, heading, slots }) => ({
          key: `${key}:${rankKey}`,
          heading,
          slots: slots
            .filter(({ signature, granted }) => !signature && !granted)
            .map(({ key: slotKey, label, spells, castRank, spell }) => ({
              key: slotKey,
              label,
              rows: spellRows(spells, { translate, castRank, taken: new Set() }),
              current: spell?.id,
            })),
        }))
        .filter(({ slots }) => slots.length > 0),
    }))
    .filter(({ ranks }) => ranks.length > 0);
}

/** The slots of `entries`, in order. */
function slotsOf(entries: readonly RestPreparedEntry[]): readonly RestPreparedSlot[] {
  return entries.flatMap(({ ranks }) => ranks.flatMap(({ slots }) => slots));
}

/** The spells staged in other slots than the ones that already hold them, as the command carries them. */
export function preparedPicks(
  entries: readonly RestPreparedEntry[],
  staged: Readonly<Record<string, string>>,
): PreparedPick[] {
  return slotsOf(entries).flatMap(({ key, current }) => {
    const spell = staged[key];
    const selection = spell === undefined ? undefined : ChoiceValue.safeParse(spell);
    return selection?.success === true && spell !== current ? [{ slot: key, selection: selection.data }] : [];
  });
}

/** What each pick would do, worded: the spell prepared in the slot. */
export function preparedLines(
  entries: readonly RestPreparedEntry[],
  picks: readonly PreparedPick[],
  names: PreparedNames,
): readonly RestLine[] {
  const slots = slotsOf(entries);
  return picks.flatMap(({ slot, selection }) => {
    const label = slots.find(({ key }) => key === slot)?.label;
    return label === undefined
      ? []
      : [
          {
            key: 'character.sheet.rest.preparedSpell',
            params: { slot: names.translate(label.key, label.params), spell: names.spell(selection) },
          },
        ];
  });
}

/** What names the slots and spells a pick mentions. */
export interface PreparedNames {
  readonly translate: (key: string, params?: Record<string, unknown>) => string;
  readonly spell: (id: ChoiceValue) => string | undefined;
}
