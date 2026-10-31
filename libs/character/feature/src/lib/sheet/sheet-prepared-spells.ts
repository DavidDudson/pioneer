import {
  availableSpellsToYou,
  characterGrants,
  characterSpellcasting,
  needsAccess,
  preparedReads,
  preparedSlots,
  signatureSlots,
  slotCountKey,
  SlotStatus,
} from '@pioneer/character/domain';
import type {
  Character,
  CharacterSlot,
  PickedPreparation,
  PreparedSlot,
  SignatureSlot,
  SlotContent,
  SlotCountKey,
  SpellOption,
} from '@pioneer/character/domain';
import type { SelectOption } from '@pioneer/frontier';
import { ContentKind, SlotRank, SpellPreparation } from '@pioneer/rules/sdk';
import type {
  ContentId,
  ContentRegistry,
  FilterState,
  MagicTradition,
  SlotKey,
  Slug,
  SpellRank,
} from '@pioneer/rules/sdk';
import { SpellListMessage } from '@pioneer/rules/ui';
import type { SpellAccessLine } from '@pioneer/rules/ui';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { CHARACTER_CONTENT_KINDS } from '../data/content-registry-query';
import { runs } from './sheet-runs';
import { sheetSlotContent } from './sheet-slot-content';
import type { SpellOnSheet } from './sheet-spell-details';
import { slotKeyOf } from './sheet-spell-use';

/** The kinds the spell pickers read: the character's, so its entries resolve, and the spells. */
export const SPELL_CONTENT_KINDS: readonly ContentKind[] = [...CHARACTER_CONTENT_KINDS, ContentKind.Spell];

/** One prepared slot on the sheet: its label, the spells it offers by name, and why its pick counts for nothing. */
export interface SheetPreparedSlot {
  readonly key: SlotKey;
  readonly label: MessageDescriptor;
  readonly options: readonly SelectOption<string>[];
  /** The same spells with the facts a picker table shows. */
  readonly spells: readonly SpellOption[];
  /** The rank a spell cast from the slot has; undefined for a signature slot, whose spell is cast at a range of ranks. */
  readonly castRank: SpellRank | undefined;
  /** Whether it picks a signature spell from the entry's repertoire: never one the repertoire already holds twice. */
  readonly signature: boolean;
  /** Whether a `RepertoireSpells` element fills the slot, a bloodline's gift: it holds that spell and takes no pick. */
  readonly granted: boolean;
  /** The stored pick's name, so a pick the slot no longer offers still reads by name. */
  readonly storedName: string | undefined;
  /** The spell the slot holds, at the rank it is cast; undefined while the slot is empty or holds something it no longer offers. */
  readonly spell: SpellOnSheet | undefined;
  /** The server's reason when the slot's pick is invalid. */
  readonly reason: MessageDescriptor | undefined;
  /** The slots a cast from it expends, counted under this key; undefined for a cantrip, which expends none. */
  readonly slotKey: SlotCountKey | undefined;
  /** The filters the slot's picker opens on (**Available to you**); undefined for a slot that is not filtered. */
  readonly preset: FilterState | undefined;
}

/**
 * The slots of one rank on an entry, or of one rank of one of its pools, under a heading that says the rank its spells
 * are cast at.
 */
interface SheetPreparedRank {
  /** Unique within the entry: `cantrip` or the rank, after the pool's slug for a pool's (`divine-font:4`). */
  readonly key: string;
  readonly heading: MessageDescriptor;
  /** Why a pool's slots offer nothing: the choice that names its spells isn't made yet. */
  readonly note: MessageDescriptor | undefined;
  readonly slots: readonly SheetPreparedSlot[];
}

/** A prepared entry's slots, rank by rank, then its pools', rank by rank; or a spontaneous entry's repertoire. */
export interface SheetPreparedEntry {
  readonly key: Slug;
  readonly preparation: PickedPreparation;
  readonly tradition: MagicTradition;
  readonly ranks: readonly SheetPreparedRank[];
}

/** A prepared slot with the name of the pool it is one of, if any. */
interface NamedSlot {
  readonly slot: PreparedSlot;
  /** The name of the entry that gave the pool ("Divine Font"); undefined for one of the entry's own slots. */
  readonly pool: string | undefined;
}

/**
 * "Cantrip 2", "3rd rank slot 1", "Divine Font 4th rank slot 1", a repertoire's "3rd rank spell 1": each picker named
 * on its own.
 */
function slotLabel({ slot, pool }: NamedSlot, place: number): MessageDescriptor {
  if (pool !== undefined) {
    return slot.rank === SlotRank.Cantrip
      ? message('character.sheet.prepared.poolCantripSlot', { pool, number: place })
      : message('character.sheet.prepared.poolRankSlot', { pool, rank: slot.rank, number: place });
  }
  if (slot.rank === SlotRank.Cantrip) {
    return message('character.sheet.prepared.cantripSlot', { number: place });
  }
  return slot.preparation === SpellPreparation.Spontaneous
    ? message('character.sheet.repertoire.rankSpell', { rank: slot.rank, number: place })
    : message('character.sheet.prepared.rankSlot', { rank: slot.rank, number: place });
}

/** A slot's pick as the sheet details it, cast at `rank`. */
function spellOf(pick: SpellOption | undefined, rank: SpellRank, tags: readonly string[]): SpellOnSheet | undefined {
  return pick === undefined ? undefined : { id: pick.id, name: pick.name, rank, tags };
}

/** "3rd rank signature spell". */
function signatureLabel(slot: SignatureSlot): MessageDescriptor {
  return message('character.sheet.repertoire.signature', { rank: slot.rank });
}

/**
 * Where a rank's signature spell is cast: "Soothe, the signature spell, is cast at any rank from 1st to 4th.", or "… is
 * cast at 4th rank." when only one; or, while the rank's repertoire knows no spell, that its spells come first.
 */
function signatureNote(slot: SignatureSlot | undefined): MessageDescriptor | undefined {
  if (slot?.options.length === 0) {
    return message('character.sheet.repertoire.signatureEmpty');
  }
  const [low, high] = [slot?.castRanks.at(0), slot?.castRanks.at(-1)];
  if (slot?.pick === undefined || low === undefined || high === undefined) {
    return undefined;
  }
  return low === high
    ? message('character.sheet.repertoire.signatureCastAt', { spell: slot.pick.name, rank: low })
    : message('character.sheet.repertoire.signatureCastFrom', { spell: slot.pick.name, low, high });
}

/** "Cantrips, cast at 3rd rank", "3rd rank", "Divine Font, 4th rank". */
function rankHeading({ slot, pool }: NamedSlot): MessageDescriptor {
  if (pool !== undefined) {
    return slot.rank === SlotRank.Cantrip
      ? message('character.sheet.prepared.poolCantrips', { pool, rank: slot.castRank })
      : message('character.sheet.prepared.poolRank', { pool, rank: slot.rank });
  }
  return slot.rank === SlotRank.Cantrip
    ? message('character.sheet.prepared.cantrips', { rank: slot.castRank })
    : message('rules.spellcasting.rank', { rank: slot.rank });
}

/** A pool that takes no spell waits on a choice: a divine font, until the font is picked. */
function rankNote({ slot, pool }: NamedSlot): MessageDescriptor | undefined {
  const waiting = pool !== undefined && slot.pool?.spells.length === 0;
  return waiting ? message('character.sheet.prepared.poolEmpty', { pool }) : undefined;
}

/** A rank's key within its entry: `cantrip` or the rank, after the pool's slug for a pool's (`divine-font:4`). */
function rankKey({ slot }: NamedSlot): string {
  return slot.pool === undefined ? String(slot.rank) : `${slot.pool.slug}:${slot.rank}`;
}

function optionOf(spell: SpellOption): SelectOption<string> {
  return { value: spell.id, label: spell.name };
}

/** The invalid reason the server read for `key`, if its pick is invalid. */
function reasonOf(slots: readonly CharacterSlot[], key: SlotKey): MessageDescriptor | undefined {
  const read = slots.find((each) => each.key === key);
  return read?.status === SlotStatus.Invalid ? read.reason : undefined;
}

/** The signature slot of the rank `named` is in, if its entry has one there: never a cantrip's or a pool's. */
function signatureIn(signatures: readonly SignatureSlot[], { slot }: NamedSlot): SignatureSlot | undefined {
  return slot.pool === undefined
    ? signatures.find((each) => each.entry === slot.entry && each.rank === slot.rank)
    : undefined;
}

/** The prepared slots, each with the name of the entry that gave its pool. */
function namedSlots(slots: readonly PreparedSlot[], content: SlotContent): NamedSlot[] {
  return slots.map((slot): NamedSlot => ({
    slot,
    pool: slot.pool === undefined ? undefined : (content.lookup.entry(slot.pool.origin.entry)?.name ?? slot.pool.slug),
  }));
}

/** The badge a slot of `rank` puts on its spell: a cantrip says so. */
function cantripTags(rank: PreparedSlot['rank']): readonly string[] {
  return rank === SlotRank.Cantrip ? [SpellListMessage.TagCantrip] : [];
}

/** A signature slot as the sheet lists it: the repertoire spells of its rank it offers, and where its pick is cast. */
function signatureField(
  signature: SignatureSlot,
  slots: readonly CharacterSlot[],
  content: SlotContent,
): SheetPreparedSlot {
  return {
    key: signature.key,
    label: signatureLabel(signature),
    options: signature.options.map((spell) => optionOf(spell)),
    spells: signature.options,
    castRank: undefined,
    signature: true,
    granted: false,
    storedName: signature.stored === undefined ? undefined : content.spells.spell(signature.stored)?.name,
    reason: reasonOf(slots, signature.key),
    slotKey: slotCountKey(signature.entry, undefined, signature.rank),
    preset: undefined,
    spell: spellOf(signature.pick, signature.castRanks.at(-1) ?? signature.rank, [SpellListMessage.TagSignature]),
  };
}

/**
 * Each prepared entry's slots at the character's level (#478), rank by rank, cantrips first, then each of its pools'
 * (#581) the same way, under the name of the entry that gave the pool; and each spontaneous entry's repertoire the same
 * way, each rank's signature spell after its spells (#479), with the ranks it is cast at as the rank's note. Every slot
 * comes with the spells it offers and, when its pick is invalid, the reason the server read. A registry without spells
 * offers none.
 */
export function sheetPreparedSlots(
  registry: ContentRegistry,
  character: Character,
  slots: readonly CharacterSlot[],
): readonly SheetPreparedEntry[] {
  const content = sheetSlotContent(registry);
  const sheetSlot = (named: NamedSlot, index: number): SheetPreparedSlot => ({
    key: named.slot.key,
    label: slotLabel(named, index + 1),
    options: named.slot.options.map((spell) => optionOf(spell)),
    spells: named.slot.options,
    castRank: named.slot.castRank,
    signature: false,
    granted: named.slot.granted,
    storedName: named.slot.stored === undefined ? undefined : content.spells.spell(named.slot.stored)?.name,
    reason: reasonOf(slots, named.slot.key),
    slotKey: slotKeyOf(named.slot),
    preset: availableSpellsToYou(named.slot),
    spell: spellOf(named.slot.pick, named.slot.castRank, cantripTags(named.slot.rank)),
  });
  const reads = preparedReads(character.document, content);
  const signatures = signatureSlots(character.document, reads);
  const all = namedSlots(preparedSlots(character.document, reads), content);
  return runs(all, ({ slot }) => slot.entry).map(([first, entrySlots]) => ({
    key: first.slot.entry,
    preparation: first.slot.preparation,
    tradition: first.slot.tradition,
    ranks: runs(entrySlots, rankKey).map(([rankFirst, rankSlots]) => {
      const signature = signatureIn(signatures, rankFirst);
      return {
        key: rankKey(rankFirst),
        heading: rankHeading(rankFirst),
        note: rankNote(rankFirst) ?? signatureNote(signature),
        slots: [
          ...rankSlots.map((slot, index) => sheetSlot(slot, index)),
          ...(signature === undefined ? [] : [signatureField(signature, slots, content)]),
        ],
      };
    }),
  }));
}

/** The uncommon and rare spells the build has access to, and those it may add. */
export interface SheetSpellAccess {
  readonly granted: readonly SpellAccessLine[];
  /** Uncommon and rare spells of the traditions of the character's entries it has no access to yet, by name. */
  readonly offered: readonly SpellOption[];
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
    .filter((spell) => spell.traditions.some((tradition) => traditions.has(tradition)));
  return {
    granted: spellAccess.map((spell) => ({ spell, name: content.spells.spell(spell)?.name })),
    offered,
  };
}
