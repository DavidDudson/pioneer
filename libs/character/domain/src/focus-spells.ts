import type { SpellcastingInPlay } from '@pioneer/rules/engine';
import { FOCUS_POOL_MAX, FocusPoints, SpellPreparation } from '@pioneer/rules/sdk';
import type { ContentId, SpellRank } from '@pioneer/rules/sdk';

import type { CharacterLevel } from './character-fields';
import { cantripRank } from './prepared-spells';
import type { SpellContent, SpellOption } from './spell-content';

/** A focus entry's focus spells as its `FocusSpells` elements name them; one whose content isn't loaded is left out. */
export interface FocusEntrySpells {
  readonly entry: SpellcastingInPlay;
  readonly spells: readonly SpellOption[];
}

/** What the character's focus spells come to (ADR-0048). */
export interface CharacterFocus {
  /** Each focus entry with its spells, in slug order. */
  readonly entries: readonly FocusEntrySpells[];
  /** The rank every focus spell, focus cantrips included, is cast at: half the level, rounded up (Player Core). */
  readonly rank: SpellRank;
  /** The most Focus Points the pool holds: one per focus spell that isn't a cantrip, at most 3 (Player Core). */
  readonly pool: FocusPoints;
}

/**
 * The character's focus spells, by focus entry, the rank they are cast at, and the focus pool they give. A spell two
 * entries name counts once toward the pool, and one whose content isn't loaded counts for nothing, as its traits
 * can't be read.
 */
export function characterFocus(
  entries: readonly SpellcastingInPlay[],
  content: SpellContent,
  level: CharacterLevel,
): CharacterFocus {
  const focusEntries = entries
    .filter((entry) => entry.preparation === SpellPreparation.Focus)
    .map((entry): FocusEntrySpells => ({
      entry,
      spells: entry.focusSpells.flatMap((id) => content.anySpell(id) ?? []),
    }));
  const pointsFrom = new Set<ContentId>(
    focusEntries.flatMap(({ spells }) => spells.filter((spell) => !spell.cantrip).map((spell) => spell.id)),
  );
  return {
    entries: focusEntries,
    rank: cantripRank(level),
    pool: FocusPoints.parse(Math.min(pointsFrom.size, FOCUS_POOL_MAX)),
  };
}
