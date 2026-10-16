import { preparedReads, preparedSlots } from '@pioneer/character/domain';
import type { CharacterDocument, PreparedSlot, SlotContent } from '@pioneer/character/domain';
import { ChoiceValue, ContentId, SlotRank } from '@pioneer/rules/sdk';
import type { SlotKey } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { pairCasters } from './caster-pairing';
import type { ContentLookup } from './content-lookup';
import { ImportKind, PathbuilderName } from './import-kind';
import type { ImportedCaster, ImportedSpellRank } from './read-spells';

export type SpellPicks = Readonly<Record<SlotKey, ChoiceValue>>;

/** Why a spell that matched content went in no slot. */
export const SpellGapReason = {
  /** The character has no prepared or spontaneous spellcasting of that tradition for the caster: a class or archetype not carried over, or innate casting. */
  NoEntry: 'no-entry',
  /** Every slot of its rank is taken, or the entry has none. */
  NoSlot: 'no-slot',
  /** Slots of its rank are open, but none offers it: another tradition, or an uncommon or rare spell the build has no access to. */
  NotOffered: 'not-offered',
} as const;
export type SpellGapReason = (typeof SpellGapReason)[keyof typeof SpellGapReason];

/** A matched spell no slot took: the caster it was listed under, the rank it was listed at and why. */
export const SpellGap = z.object({
  caster: PathbuilderName,
  rank: z.union([z.literal(SlotRank.Cantrip), z.int().min(1)]),
  name: PathbuilderName,
  reason: z.enum(SpellGapReason),
});
export type SpellGap = z.infer<typeof SpellGap>;

/** The picks for the character's prepared and repertoire slots, and the matched spells no slot took. */
export interface SpellPlacement {
  readonly choices: SpellPicks;
  readonly gaps: readonly SpellGap[];
}

/** What placing needs beside the document: the slots' content and the spells' names. */
export interface SpellPlacementContent {
  readonly slots: SlotContent;
  readonly lookup: ContentLookup;
}

/** An entry of the character's own spellcasting that picks its spells: its slots, in key order. */
interface Entry {
  readonly slug: string;
  readonly preparation: PreparedSlot['preparation'];
  readonly tradition: PreparedSlot['tradition'];
  readonly slots: readonly PreparedSlot[];
}

/** The slots a pick can go in: an entry's own, not a pool's, not one an element fills. */
function pickable(slot: PreparedSlot): boolean {
  return slot.pool === undefined && !slot.granted && !slot.deitySpell && slot.stored === undefined;
}

function entriesOf(slots: readonly PreparedSlot[]): Entry[] {
  const bySlug = Map.groupBy(
    slots.filter((slot) => pickable(slot)),
    (slot) => slot.entry,
  );
  return [...bySlug].flatMap(([slug, own]): Entry[] => {
    const [first] = own;
    return first === undefined
      ? []
      : [{ slug, preparation: first.preparation, tradition: first.tradition, slots: own }];
  });
}

/** A spell the export lists, matched to content, at the rank it lists it. */
interface Listed {
  readonly name: PathbuilderName;
  readonly rank: ImportedSpellRank['rank'];
  readonly id: ContentId;
}

/** Where one listed spell goes: the first open slot of its rank that offers it, else why none did. */
function placeOne(
  slots: readonly PreparedSlot[],
  { rank, id }: Listed,
  used: ReadonlySet<SlotKey>,
): PreparedSlot | SpellGapReason {
  const open = slots.filter((slot) => slot.rank === rank && !used.has(slot.key));
  const fitting = open.find((slot) => slot.options.some((option) => option.id === id));
  return fitting ?? (open.length === 0 ? SpellGapReason.NoSlot : SpellGapReason.NotOffered);
}

/** The spells `caster` lists that matched content, in the order it lists them. */
function listed(caster: ImportedCaster, lookup: ContentLookup): Listed[] {
  return caster.ranks.flatMap(({ rank, spells }) =>
    spells.flatMap((name): Listed[] => {
      const match = lookup.resolve(ImportKind.Spell, name);
      return match === undefined ? [] : [{ name, rank, id: ContentId.parse(match.id) }];
    }),
  );
}

/** One caster's spells in its entry's slots: the picks they make and the gaps they leave. */
function placeCaster(caster: ImportedCaster, entry: Entry | undefined, lookup: ContentLookup): SpellPlacement {
  const used = new Set<SlotKey>();
  const picks: Record<SlotKey, ChoiceValue> = {};
  const gaps: SpellGap[] = [];
  for (const spell of listed(caster, lookup)) {
    const placed = entry === undefined ? SpellGapReason.NoEntry : placeOne(entry.slots, spell, used);
    if (typeof placed === 'string') {
      gaps.push({ caster: caster.name, rank: spell.rank, name: spell.name, reason: placed });
    } else {
      picks[placed.key] = ChoiceValue.parse(spell.id);
      used.add(placed.key);
    }
  }
  return { choices: picks, gaps };
}

/**
 * Pathbuilder's spells in `document`'s prepared and repertoire slots (#311). Each caster pairs with the entry of the
 * same tradition and preparation (by name when several share them); each spell it lists, at the rank it lists it,
 * takes the first open slot of that rank that offers it. A spell that matched content but fits no slot is a gap.
 * Names that match no content are in the import report's unmatched list already. Focus spells come from the
 * features that grant them, and `perDay` is compared, never imported.
 */
export function placeSpells(
  document: CharacterDocument,
  { slots, lookup }: SpellPlacementContent,
  casters: readonly ImportedCaster[],
): SpellPlacement {
  const entries = entriesOf(preparedSlots(document, preparedReads(document, slots)));
  const paired = pairCasters(casters, entries);
  const placements = casters.map((caster) => placeCaster(caster, paired.get(caster), lookup));
  return {
    choices: Object.fromEntries(placements.flatMap(({ choices }) => Object.entries(choices))),
    gaps: placements.flatMap(({ gaps }) => gaps),
  };
}
