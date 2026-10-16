import { RuleElementKey } from '@pioneer/rules/sdk';
import type {
  ContentId,
  FocusSpellsElement,
  GrantedSpell,
  InnateSpellsElement,
  PoolSpellsElement,
  RuleElement,
  RuleSlug,
  Slug,
} from '@pioneer/rules/sdk';

import { addDeityRepertoire, addGrantedSpells, addRepertoireCount } from './spellcasting-granted-spells';
import type { DeityRepertoire } from './spellcasting-granted-spells';
import type { EntryInPlay, PlacedSlots, RankSlots } from './spellcasting-in-play';

/** What the rules in play give, by entry slug, as `spellcastingInPlay` reads them. */
export interface Gathered {
  readonly entries: Map<Slug, EntryInPlay>;
  readonly slots: Map<Slug, PlacedSlots[]>;
  readonly poolSpells: Map<Slug, Map<RuleSlug, ContentId[]>>;
  /** The entries a `DeitySpells` element names. */
  readonly deitySpells: Set<Slug>;
  /** The entries a `SignatureSpells` element names. */
  readonly signatures: Set<Slug>;
  /** The spells the `FocusSpells` elements give, by the entry they name. */
  readonly focusSpells: Map<Slug, ContentId[]>;
  /** The spells the `InnateSpells` elements give, by the entry they name. */
  readonly innateSpells: Map<Slug, GrantedSpell[]>;
  /** The spells the `RepertoireSpells` elements give, by the entry they name. */
  readonly grantedSpells: Map<Slug, GrantedSpell[]>;
  /** The counts the `RepertoireCount` elements give, by the entry they name. */
  readonly repertoireCounts: Map<Slug, RankSlots[]>;
  /** The deity spells the `RepertoireDeitySpells` elements let an entry add, by the entry they name. */
  readonly deityRepertoire: Map<Slug, DeityRepertoire[]>;
}

/** Adds `spells` to what `pool` of `entry` takes, each spell once. */
function addPoolSpells({ poolSpells }: Gathered, { entry, pool, spells }: PoolSpellsElement): void {
  const pools = poolSpells.get(entry) ?? new Map<RuleSlug, ContentId[]>();
  const taken = pools.get(pool) ?? [];
  pools.set(pool, [...taken, ...spells.filter((spell) => !taken.includes(spell))]);
  poolSpells.set(entry, pools);
}

/** Adds the spells of an `InnateSpells` element to those gathered for its entry, each rank and spell once. */
function addInnateSpells({ innateSpells }: Gathered, { entry, spells }: InnateSpellsElement): void {
  const known = innateSpells.get(entry) ?? [];
  const fresh = spells.filter(
    (spell) => !known.some(({ rank, spell: id }) => rank === spell.rank && id === spell.spell),
  );
  innateSpells.set(entry, [...known, ...fresh]);
}

/** Adds `spells` to the focus spells of `entry`, each spell once. */
function addFocusSpells({ focusSpells }: Gathered, { entry, spells }: FocusSpellsElement): void {
  const known = focusSpells.get(entry) ?? [];
  focusSpells.set(entry, [...known, ...spells.filter((spell) => !known.includes(spell))]);
}

/** Adds the repertoire spells and counts an element gives an entry (ADR-0062, ADR-0063). */
function gatherRepertoire({ grantedSpells, repertoireCounts, deityRepertoire }: Gathered, element: RuleElement): void {
  if (element.key === RuleElementKey.RepertoireSpells) {
    addGrantedSpells(grantedSpells, element);
  }
  if (element.key === RuleElementKey.RepertoireCount) {
    addRepertoireCount(repertoireCounts, element);
  }
  if (element.key === RuleElementKey.RepertoireDeitySpells) {
    addDeityRepertoire(deityRepertoire, element);
  }
}

/** Adds the spells an element names an entry: its pool spells, deity spells, signature spells or focus spells. */
export function gatherSpells(gathered: Gathered, element: RuleElement): void {
  if (element.key === RuleElementKey.PoolSpells) {
    addPoolSpells(gathered, element);
  }
  if (element.key === RuleElementKey.DeitySpells) {
    gathered.deitySpells.add(element.entry);
  }
  if (element.key === RuleElementKey.SignatureSpells) {
    gathered.signatures.add(element.entry);
  }
  if (element.key === RuleElementKey.FocusSpells) {
    addFocusSpells(gathered, element);
  }
  if (element.key === RuleElementKey.InnateSpells) {
    addInnateSpells(gathered, element);
  }
  gatherRepertoire(gathered, element);
}
