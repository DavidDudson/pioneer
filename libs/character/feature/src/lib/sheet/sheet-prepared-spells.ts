import {
  characterGrants,
  characterSpellcasting,
  needsAccess,
  preparedReads,
  preparedSlots,
  SlotStatus,
} from '@pioneer/character/domain';
import type { Character, CharacterSlot, PreparedSlot, SpellOption } from '@pioneer/character/domain';
import type { SelectOption } from '@pioneer/frontier';
import { ContentKind, SlotRank } from '@pioneer/rules/sdk';
import type { ContentId, ContentRegistry, MagicTradition, SlotKey, Slug } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { CHARACTER_CONTENT_KINDS } from '../data/content-registry-query';
import { sheetSlotContent } from './sheet-slot-content';

/** The kinds the spell pickers read: the character's, so its entries resolve, and the spells. */
export const SPELL_CONTENT_KINDS: readonly ContentKind[] = [...CHARACTER_CONTENT_KINDS, ContentKind.Spell];

/** The most spells a spell picker lists for one query; typing narrows it. */
const SPELL_MATCHES_MAX = 50;

/** One prepared slot on the sheet: its label, the spells it offers by name, and why its pick counts for nothing. */
export interface SheetPreparedSlot {
  readonly key: SlotKey;
  readonly label: MessageDescriptor;
  readonly options: readonly SelectOption<string>[];
  /** The stored pick's name, so a pick the slot no longer offers still reads by name. */
  readonly storedName: string | undefined;
  /** The server's reason when the slot's pick is invalid. */
  readonly reason: MessageDescriptor | undefined;
}

/** The slots of one rank on an entry, under a heading that says the rank its spells are cast at. */
interface SheetPreparedRank {
  /** Unique within the entry: `cantrip`, or the rank. */
  readonly key: string;
  readonly heading: MessageDescriptor;
  readonly slots: readonly SheetPreparedSlot[];
}

/** A prepared entry's slots, rank by rank. */
export interface SheetPreparedEntry {
  readonly key: Slug;
  readonly tradition: MagicTradition;
  readonly ranks: readonly SheetPreparedRank[];
}

/** "Cantrip 2", "3rd rank slot 1": each picker named on its own. */
function slotLabel(slot: PreparedSlot, place: number): MessageDescriptor {
  return slot.rank === SlotRank.Cantrip
    ? message('character.sheet.prepared.cantripSlot', { number: place })
    : message('character.sheet.prepared.rankSlot', { rank: slot.rank, number: place });
}

/** "Cantrips, cast at 3rd rank", "3rd rank". */
function rankHeading(slot: PreparedSlot): MessageDescriptor {
  return slot.rank === SlotRank.Cantrip
    ? message('character.sheet.prepared.cantrips', { rank: slot.castRank })
    : message('rules.spellcasting.rank', { rank: slot.rank });
}

function optionOf(spell: SpellOption): SelectOption<string> {
  return { value: spell.id, label: spell.name };
}

/** The invalid reason the server read for `key`, if its pick is invalid. */
function reasonOf(slots: readonly CharacterSlot[], key: SlotKey): MessageDescriptor | undefined {
  const read = slots.find((each) => each.key === key);
  return read?.status === SlotStatus.Invalid ? read.reason : undefined;
}

/**
 * Each prepared entry's slots at the character's level (#478), rank by rank, cantrips first: every slot with the
 * spells it offers and, when its pick is invalid, the reason the server read. A registry without spells offers none.
 */
export function sheetPreparedSlots(
  registry: ContentRegistry,
  character: Character,
  slots: readonly CharacterSlot[],
): readonly SheetPreparedEntry[] {
  const content = sheetSlotContent(registry);
  const sheetSlot = (slot: PreparedSlot, index: number): SheetPreparedSlot => ({
    key: slot.key,
    label: slotLabel(slot, index + 1),
    options: slot.options.map((spell) => optionOf(spell)),
    storedName: slot.stored === undefined ? undefined : content.spells.spell(slot.stored)?.name,
    reason: reasonOf(slots, slot.key),
  });
  const all = preparedSlots(character.document, preparedReads(character.document, content));
  return runs(all, (slot) => slot.entry).map(([first, entrySlots]) => ({
    key: first.entry,
    tradition: first.tradition,
    ranks: runs(entrySlots, (slot) => String(slot.rank)).map(([rankFirst, rankSlots]) => ({
      key: String(rankFirst.rank),
      heading: rankHeading(rankFirst),
      slots: rankSlots.map((slot, index) => sheetSlot(slot, index)),
    })),
  }));
}

/** A run of items sharing a key, with its first item. */
type Run<Item> = readonly [Item, readonly Item[]];

/** `items` split into runs of the same key, in order: prepared slots come entry by entry, rank by rank. */
function runs<Item>(items: readonly Item[], keyOf: (item: Item) => string): Run<Item>[] {
  const grouped: [Item, Item[]][] = [];
  for (const item of items) {
    const last = grouped.at(-1);
    if (last !== undefined && keyOf(last[0]) === keyOf(item)) {
      last[1].push(item);
    } else {
      grouped.push([item, [item]]);
    }
  }
  return grouped;
}

/** `options` whose label holds `query`, ignoring case, up to the most a picker lists. */
export function spellMatches(options: readonly SelectOption<string>[], query: string): readonly SelectOption<string>[] {
  const needle = query.trim().toLocaleLowerCase();
  return options.filter((option) => option.label.toLocaleLowerCase().includes(needle)).slice(0, SPELL_MATCHES_MAX);
}

/** A spell the build lists access to, by name; an id no loaded spell has reads as the id. */
interface SpellAccessLine {
  readonly spell: ContentId;
  readonly name: string;
}

/** The uncommon and rare spells the build has access to, and those it may add. */
export interface SheetSpellAccess {
  readonly granted: readonly SpellAccessLine[];
  /** Uncommon and rare spells of the traditions of the character's entries it has no access to yet, by name. */
  readonly offered: readonly SelectOption<string>[];
}

/**
 * The build's spell access (#478): each spell it lists, and the uncommon and rare spells of its entries' traditions it
 * may add. A character with no spellcasting entry is offered none.
 */
export function sheetSpellAccess(registry: ContentRegistry, character: Character): SheetSpellAccess {
  const content = sheetSlotContent(registry);
  const { spellAccess } = character.document.build;
  const granted = new Set<ContentId>(spellAccess);
  const traditions = new Set(
    characterSpellcasting(characterGrants(character.document, content)).map((entry) => entry.tradition),
  );
  const offered = content.spells.spells
    .filter((spell) => needsAccess(spell.rarity) && !granted.has(spell.id))
    .filter((spell) => spell.traditions.some((tradition) => traditions.has(tradition)))
    .map((spell) => optionOf(spell));
  return {
    granted: spellAccess.map((spell) => ({ spell, name: content.spells.spell(spell)?.name ?? spell })),
    offered,
  };
}
