import { needsAccess, preparedReads, preparedSlots, SPELL_ACCESS_MAX } from '@pioneer/character/domain';
import type { CharacterDocument, PreparedSlot } from '@pioneer/character/domain';
import { ChoiceValue } from '@pioneer/rules/sdk';
import type { ContentId, SlotKey } from '@pioneer/rules/sdk';

import { pairCasters } from './caster-pairing';
import type { ContentLookup } from './content-lookup';
import { placeInnate } from './innate-placement';
import type { ImportedCaster } from './read-spells';
import { listed, SpellGapReason } from './spell-listing';
import type { Listed, SpellGap, SpellPicks, SpellPlacement, SpellPlacementContent } from './spell-listing';

export { SpellGap, SpellGapReason } from './spell-listing';

export type { SpellPicks, SpellPlacement, SpellPlacementContent } from './spell-listing';

/** An entry of the character's own spellcasting that picks its spells: its slots, in key order. */
interface Entry {
  readonly slug: string;
  readonly preparation: PreparedSlot['preparation'];
  readonly tradition: PreparedSlot['tradition'];
  readonly slots: ReadonlyArray<PreparedSlot>;
}

/** The slots a pick can go in: an entry's own, not a pool's, not one an element fills. */
function pickable(slot: PreparedSlot): boolean {
  return slot.pool === undefined && !slot.granted && !slot.deitySpell && slot.stored === undefined;
}

function entriesOf(slots: ReadonlyArray<PreparedSlot>): Array<Entry> {
  const bySlug = Map.groupBy(
    slots.filter((slot) => pickable(slot)),
    (slot) => slot.entry,
  );

  return [...bySlug].flatMap(([slug, own]): Array<Entry> => {
    const [first] = own;

    return first === undefined
      ? []
      : [{ slug, preparation: first.preparation, tradition: first.tradition, slots: own }];
  });
}

/** Where one listed spell went: a slot, or the reason it found none. */
type Placed = { readonly slot: PreparedSlot } | { readonly reason: SpellGapReason };

/** Where one listed spell goes: the first open slot of its rank that offers it, else why none did. */
function placeOne(slots: ReadonlyArray<PreparedSlot>, { rank, id }: Listed, used: ReadonlySet<SlotKey>): Placed {
  const open = slots.filter((slot) => slot.rank === rank && !used.has(slot.key));
  const fitting = open.find((slot) => slot.options.some((option) => option.id === id));

  if (fitting !== undefined) {
    return { slot: fitting };
  }

  return { reason: open.length === 0 ? SpellGapReason.NoSlot : SpellGapReason.NotOffered };
}

/** The picks one caster's spells make and the gaps they leave. */
interface CasterPlacement {
  readonly choices: SpellPicks;
  readonly gaps: ReadonlyArray<SpellGap>;
}

/** One caster's spells in its entry's slots: the picks they make and the gaps they leave. */
function placeCaster(caster: ImportedCaster, entry: Entry | undefined, lookup: ContentLookup): CasterPlacement {
  const used = new Set<SlotKey>();
  const picks: Record<SlotKey, ChoiceValue> = {};
  const gaps: Array<SpellGap> = [];

  for (const spell of listed(caster, lookup)) {
    const placed: Placed =
      entry === undefined ? { reason: SpellGapReason.NoEntry } : placeOne(entry.slots, spell, used);

    if ('slot' in placed) {
      picks[placed.slot.key] = ChoiceValue.parse(spell.id);
      used.add(placed.slot.key);
    } else {
      gaps.push({ caster: caster.name, rank: spell.rank, name: spell.name, reason: placed.reason });
    }
  }

  return { choices: picks, gaps };
}

/** The uncommon and rare spells the export lists, each once, up to the most a build can list access to. */
function accessNeeded(
  casters: ReadonlyArray<ImportedCaster>,
  { slots, lookup }: SpellPlacementContent,
): ReadonlyArray<ContentId> {
  const ids = casters.flatMap((caster) =>
    listed(caster, lookup).flatMap(({ id }): Array<ContentId> => {
      const spell = slots.spells.spell(id);

      return spell !== undefined && needsAccess(spell.rarity) ? [id] : [];
    }),
  );

  return [...new Set(ids)].slice(0, SPELL_ACCESS_MAX);
}

/** `document` with access to `access` in its build, as the slots read it. */
function withAccess(document: CharacterDocument, access: ReadonlyArray<ContentId>): CharacterDocument {
  const spellAccess = [...new Set([...document.build.spellAccess, ...access])];

  return { ...document, build: { ...document.build, spellAccess } };
}

/**
 * Pathbuilder's spells in `document`'s prepared and repertoire slots (#311). Each caster pairs with the entry of the
 * same tradition and preparation (by name when several share them); each spell it lists, at the rank it lists it,
 * takes the first open slot of that rank that offers it. A spell that matched content but fits no slot is a gap.
 * An uncommon or rare spell the export lists is given access, since the character has it. Names that match no content are in the import report's unmatched list already. Focus spells come from the
 * features that grant them, and `perDay` is compared, never imported.
 */
export function placeSpells(
  plain: CharacterDocument,
  { slots, lookup }: SpellPlacementContent,
  casters: ReadonlyArray<ImportedCaster>,
): SpellPlacement {
  const access = accessNeeded(casters, { slots, lookup });
  const document = withAccess(plain, access);
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
    access,
  };
}
