import {
  AreaValue,
  castActions,
  ContentId,
  ContentKind,
  defenseValues,
  durationValues,
  rangeBands,
  Rarity,
  targetValues,
  Trait,
} from '@pioneer/rules/sdk';
import type {
  CastActions,
  ChoiceValue,
  ContentRegistry,
  ContentText,
  DefenseValue,
  DurationValue,
  MagicTradition,
  RangeBand,
  SourceRef,
  SpellRank,
  TargetValue,
} from '@pioneer/rules/sdk';

const CANTRIP = Trait.parse('cantrip');
const FOCUS = Trait.parse('focus');

/**
 * A spell as a prepared slot reads it: its id, name, rank, traditions and rarity, and whether it is a cantrip. A
 * cantrip is rank 1 with the `cantrip` trait, as in Foundry pf2e. It also carries what a picker table shows to choose
 * by: the facts the content browser filters on (cast cost, range, area, targets, defence, duration), its traits and
 * where it is printed.
 */
export interface SpellOption {
  readonly id: ContentId;
  readonly name: ContentText;
  readonly rank: SpellRank;
  readonly traditions: readonly MagicTradition[];
  readonly rarity: Rarity;
  readonly cantrip: boolean;
  /** Whether it has the `focus` trait: cast with a Focus Point, never from a slot. */
  readonly focus: boolean;
  /** The actions it takes to cast: one, or each of a variable cost. */
  readonly cast: readonly CastActions[];
  readonly range: readonly RangeBand[];
  /** The shape of its area, or none. */
  readonly area: AreaValue;
  readonly targets: readonly TargetValue[];
  /** What it is rolled against: an attack or a save, or none. */
  readonly defense: readonly DefenseValue[];
  readonly duration: readonly DurationValue[];
  readonly traits: readonly Trait[];
  readonly sources: readonly SourceRef[];
}

/**
 * What prepared slots and spell access are read from: every spell that goes in a slot, by name, and the one a pick
 * names. Focus spells are cast from the focus pool, never a slot, so they are left out of both; `anySpell` finds any
 * spell, focus spells included, for the focus spells a character has (ADR-0050).
 */
export interface SpellContent {
  readonly spells: readonly SpellOption[];
  readonly spell: (pick: ChoiceValue) => SpellOption | undefined;
  readonly anySpell: (id: ContentId) => SpellOption | undefined;
}

/** Whether a spell of `rarity` needs access before it is prepared: every rarity but common does. */
export function needsAccess(rarity: Rarity): boolean {
  return rarity !== Rarity.Common;
}

/** Every spell of the registry's packs that goes in a slot, by name; a later pack's entry with the same id wins. */
export function spellContent(registry: ContentRegistry): SpellContent {
  const all = new Map<ContentId, SpellOption>();
  for (const entry of registry.packs.flatMap((pack) => pack.otherEntries)) {
    if (entry.kind === ContentKind.Spell) {
      all.set(entry.id, {
        id: entry.id,
        name: entry.name,
        rank: entry.data.rank,
        traditions: entry.data.traditions,
        rarity: entry.rarity,
        cantrip: entry.traits.includes(CANTRIP),
        focus: entry.traits.includes(FOCUS),
        cast: castActions(entry.data),
        range: rangeBands(entry.data),
        area: entry.data.area?.shape ?? AreaValue.None,
        targets: targetValues(entry.data),
        defense: defenseValues(entry),
        duration: durationValues(entry.data),
        traits: entry.traits,
        sources: entry.sources,
      });
    }
  }
  const byId = new Map([...all].filter(([, option]) => !option.focus));
  const spells = [...byId.values()].toSorted((left, right) => left.name.localeCompare(right.name));
  const spell = (pick: ChoiceValue): SpellOption | undefined => {
    const id = ContentId.safeParse(pick);
    return id.success ? byId.get(id.data) : undefined;
  };
  return { spells, spell, anySpell: (id: ContentId): SpellOption | undefined => all.get(id) };
}
