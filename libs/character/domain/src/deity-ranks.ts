import type { GrantResolution } from '@pioneer/rules/grants';
import { ContentKind } from '@pioneer/rules/sdk';
import type { ContentId, SpellRank } from '@pioneer/rules/sdk';

/** A deity's spells by the rank it grants each at (ADR-0048). */
export type DeityRanks = ReadonlyMap<ContentId, SpellRank>;

export const NO_DEITY_SPELLS: DeityRanks = new Map();

/** The spells of the deity on the character, by the rank it grants each at; none without a deity. */
export function deityRanks({ items }: GrantResolution): DeityRanks {
  const deity = items.find(({ entry }) => entry.kind === ContentKind.Deity)?.entry;
  return new Map((deity?.deitySpells ?? []).map(({ spell, rank }) => [spell, rank]));
}
