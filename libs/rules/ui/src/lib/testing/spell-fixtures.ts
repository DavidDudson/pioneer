import { spellAtRank } from '@pioneer/rules/engine';
import { ContentId, contentId, EntrySlug, PackId, SpellData, SpellRank } from '@pioneer/rules/sdk';

import type { SpellDetailLine } from '../spell-list/spell-detail-line';
import { spellDetailLine } from '../spell-list/spell-detail-line-of';
import type { Translate } from '../spell-list/spell-text';

const spellId = (slug: string): ContentId =>
  ContentId.parse(contentId(PackId.parse('player-core'), EntrySlug.parse(`spell:${slug}`)));

const TWO_ACTIONS = { type: 'actions', cost: 'two' };
const BASE = { traditions: ['arcane', 'primal'], damage: [] };

/** Fireball: a 3rd-rank basic Reflex burst, +2d6 per rank above. */
export const FIREBALL = SpellData.parse({
  ...BASE,
  rank: 3,
  time: TWO_ACTIONS,
  range: { type: 'feet', feet: 500 },
  area: { shape: 'burst', size: 20 },
  defense: { save: { statistic: 'save:reflex', basic: true } },
  damage: [{ key: '0', formula: '6d6', damageType: 'fire', kinds: ['damage'] }],
  heightening: { type: 'interval', interval: 1, damage: [{ key: '0', formula: '2d6' }] },
});

/** Heal: one, two or three actions, the variants widening what it reaches. */
export const HEAL = SpellData.parse({
  ...BASE,
  traditions: ['divine', 'primal'],
  rank: 1,
  time: { type: 'actions', cost: 'one', upTo: 'three' },
  targets: { any: [{ count: 1, of: 'creature', qualifiers: ['willing'] }], you: 'or' },
  damage: [{ key: '0', formula: '1d8', kinds: ['damage', 'healing'] }],
  heightening: { type: 'interval', interval: 1, damage: [{ key: '0', formula: '1d8' }] },
  variants: [
    { name: 'One action', time: { type: 'actions', cost: 'one' }, range: { type: 'touch' } },
    { name: 'Two actions', time: TWO_ACTIONS, range: { type: 'feet', feet: 30 } },
  ],
});

/** Dispel Magic: counteracts at 30 feet, a single target. */
export const DISPEL_MAGIC = SpellData.parse({
  ...BASE,
  rank: 2,
  time: TWO_ACTIONS,
  range: { type: 'feet', feet: 120 },
  targets: {
    any: [
      { count: 1, of: 'creature' },
      { count: 1, of: 'object' },
    ],
  },
  counteraction: true,
});

/** Invisibility: lasts ten minutes, a willing target. */
export const INVISIBILITY = SpellData.parse({
  ...BASE,
  rank: 2,
  time: TWO_ACTIONS,
  range: { type: 'touch' },
  targets: { any: [{ count: 1, of: 'creature', qualifiers: ['willing'] }] },
  duration: { type: 'time', count: 10, unit: 'minute' },
});

/** A spell on a list: its slug and name, its data, the rank it is cast at, and its badges as message keys. */
export interface SpellOnList {
  readonly slug: string;
  readonly name: string;
  readonly data: SpellData;
  readonly rank: number;
  readonly tags?: readonly string[];
}

/** The line a list shows for `spell` cast at its rank. */
export function lineOf({ slug, name, data, rank, tags = [] }: SpellOnList, translate: Translate): SpellDetailLine {
  return spellDetailLine({ id: spellId(slug), name, tags }, spellAtRank(data, SpellRank.parse(rank)), translate);
}
