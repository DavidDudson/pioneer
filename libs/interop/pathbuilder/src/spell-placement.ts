import { preparedReads, preparedSlots } from '@pioneer/character/domain';
import type { CharacterDocument, PreparedSlot } from '@pioneer/character/domain';
import { ChoiceValue } from '@pioneer/rules/sdk';
import type { SlotKey } from '@pioneer/rules/sdk';

import { pairCasters } from './caster-pairing';
import type { ContentLookup } from './content-lookup';
import { placeInnate } from './innate-placement';
import type { ImportedCaster } from './read-spells';
import { listed, SpellGapReason } from './spell-listing';
import type { Listed, SpellGap, SpellPlacement, SpellPlacementContent } from './spell-listing';

export { SpellGap, SpellGapReason } from './spell-listing';
export type { SpellPicks, SpellPlacement, SpellPlacementContent } from './spell-listing';

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
  const prepared = casters.filter(({ innate }) => !innate);
  const paired = pairCasters(prepared, entries);
  const placements = prepared.map((caster) => placeCaster(caster, paired.get(caster), lookup));
  const innate = placeInnate(document, { slots, lookup }, casters);
  return {
    choices: Object.fromEntries(
      [...placements.map(({ choices }) => choices), innate.choices].flatMap((picks) => Object.entries(picks)),
    ),
    gaps: [...placements.flatMap(({ gaps }) => gaps), ...innate.gaps],
  };
}
