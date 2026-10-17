import { characterGrants, characterSpellcasting } from '@pioneer/character/domain';
import type { CharacterDocument } from '@pioneer/character/domain';
import type { SpellcastingInPlay } from '@pioneer/rules/engine';
import { SlotRank, SpellPreparation } from '@pioneer/rules/sdk';

import { openPicks, picking } from './choice-search';
import { matchKey } from './content-lookup';
import type { ImportedCaster } from './read-spells';
import { listed, SpellGapReason } from './spell-listing';
import type { Listed, SpellGap, SpellPicks, SpellPlacementContent } from './spell-listing';

/** The picks that make innate entries grant the spells an export lists, and the listed spells no entry grants. */
export interface InnatePlacement {
  readonly choices: SpellPicks;
  readonly gaps: readonly SpellGap[];
}

/** A caster and the spells it lists that matched content. */
interface Wanted {
  readonly caster: ImportedCaster;
  readonly spells: readonly Listed[];
}

/** Placing so far: the document with the picks made, the picks and the gaps. */
interface Placed {
  readonly document: CharacterDocument;
  readonly choices: SpellPicks;
  readonly gaps: readonly SpellGap[];
}

/** Whether the caster's name is the entry's (Fey Influence's `fey-influence`), either way round. */
function sameName(caster: ImportedCaster, entry: SpellcastingInPlay): boolean {
  const casterKey = matchKey(caster.name);
  const entryKey = matchKey(entry.slug);
  return casterKey.includes(entryKey) || entryKey.includes(casterKey);
}

/** The caster's entry in `document`: the innate entry that shares its name. */
function entryOf(
  caster: ImportedCaster,
  document: CharacterDocument,
  content: SpellPlacementContent,
): SpellcastingInPlay | undefined {
  return characterSpellcasting(characterGrants(document, content.slots)).find(
    (entry) => entry.preparation === SpellPreparation.Innate && sameName(caster, entry),
  );
}

/**
 * Whether the entry casts the spell at the listed rank or higher: Pathbuilder lists a spell cast heightened at the rank
 * it is printed at (Grown of Oak's Oaken Resilience at 2nd), a cantrip as a cantrip.
 */
function grants(entry: SpellcastingInPlay, { rank, id }: Listed): boolean {
  return entry.innateSpells.some(
    (each) =>
      each.spell === id &&
      (each.rank === rank || (rank !== SlotRank.Cantrip && each.rank !== SlotRank.Cantrip && each.rank >= rank)),
  );
}

/** The spells the entry does not grant. */
function missing(entry: SpellcastingInPlay | undefined, spells: readonly Listed[]): Listed[] {
  return entry === undefined ? [...spells] : spells.filter((spell) => !grants(entry, spell));
}

function gapsOf({ caster }: Wanted, left: readonly Listed[], reason: SpellGapReason): SpellGap[] {
  return left.map(({ rank, name }) => ({ caster: caster.name, rank, name, reason }));
}

/** One caster placed on top of what is placed so far. */
function placeCaster(placed: Placed, wanted: Wanted, content: SpellPlacementContent): Placed {
  const entry = entryOf(wanted.caster, placed.document, content);
  if (entry === undefined) {
    return { ...placed, gaps: [...placed.gaps, ...gapsOf(wanted, wanted.spells, SpellGapReason.NoEntry)] };
  }
  const left = missing(entry, wanted.spells);
  if (left.length === 0) {
    return placed;
  }
  const pick = openPicks(placed.document, content, (slot) => slot.origin.entry === entry.origin.entry).find(
    (each) => missing(entryOf(wanted.caster, picking(placed.document, each), content), wanted.spells).length === 0,
  );
  if (pick === undefined) {
    return { ...placed, gaps: [...placed.gaps, ...gapsOf(wanted, left, SpellGapReason.NotGranted)] };
  }
  const [key, value] = pick;
  return { ...placed, document: picking(placed.document, pick), choices: { ...placed.choices, [key]: value } };
}

/**
 * Pathbuilder's innate casters on the character (ADR-0067). A caster pairs with the innate entry of the same name (Fey
 * Influence's, Grown of Oak's): the feat that grants it. Nothing is placed in a slot, as innate casting has none; the
 * only thing to set is the feat's own choice (Fey Influence's animal, Dream Magic's spell), which is picked as the
 * option that makes the entry grant what the export lists. A listed spell the entry then still does not grant is a gap,
 * and so is every spell of a caster whose feat the character lacks.
 */
export function placeInnate(
  document: CharacterDocument,
  content: SpellPlacementContent,
  casters: readonly ImportedCaster[],
): InnatePlacement {
  const wanted = casters
    .filter(({ innate }) => innate)
    .map((caster): Wanted => ({ caster, spells: listed(caster, content.lookup) }));
  let placed: Placed = { document, choices: {}, gaps: [] };
  for (const each of wanted) {
    placed = placeCaster(placed, each, content);
  }
  return { choices: placed.choices, gaps: placed.gaps };
}
