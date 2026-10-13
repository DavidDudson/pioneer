import { spellAtRank } from '@pioneer/rules/engine';
import { ContentKind } from '@pioneer/rules/sdk';
import type { ContentId, ContentRegistry, SpellData, SpellRank } from '@pioneer/rules/sdk';
import { spellDetailLine } from '@pioneer/rules/ui';
import type { SpellDetailLine, Translate } from '@pioneer/rules/ui';

/** The spell the list details: which one, at the rank it is cast, and the badges its row carries as message keys. */
export interface SpellOnSheet {
  readonly id: ContentId;
  readonly name: string;
  readonly rank: SpellRank;
  readonly tags: readonly string[];
}

const SPELL_DATA = new WeakMap<ContentRegistry, ReadonlyMap<ContentId, SpellData>>();

/** Every spell's data in the registry's packs by id; a later pack's entry with the same id wins. */
function spellDataIn(registry: ContentRegistry): ReadonlyMap<ContentId, SpellData> {
  const cached = SPELL_DATA.get(registry);
  if (cached !== undefined) {
    return cached;
  }
  const all = new Map<ContentId, SpellData>();
  for (const entry of registry.packs.flatMap((pack) => pack.otherEntries)) {
    if (entry.kind === ContentKind.Spell) {
      all.set(entry.id, entry.data);
    }
  }
  SPELL_DATA.set(registry, all);
  return all;
}

/**
 * A spell worded for the sheet's lists at the rank it is cast (#484): its cost, range, area, targets, defence, damage or
 * healing and duration read from its structured fields and heightened to `spell.rank`. Undefined for a spell the
 * registry doesn't hold.
 */
export function sheetSpellDetail(
  registry: ContentRegistry,
  spell: SpellOnSheet,
  translate: Translate,
): SpellDetailLine | undefined {
  const data = spellDataIn(registry).get(spell.id);
  return data === undefined
    ? undefined
    : spellDetailLine(spell, spellAtRank(data, spell.rank < data.rank ? data.rank : spell.rank), translate);
}
