import { describe, expect, test } from 'bun:test';

import { ranksInPlay } from '@pioneer/rules/engine';
import type { RuleInPlay } from '@pioneer/rules/engine';
import { grantLookup, resolveGrants } from '@pioneer/rules/grants';
import { ContentRegistry, EntrySlug, Level, RuleIndex, Selector, SlotKey } from '@pioneer/rules/sdk';
import type { Proficiency } from '@pioneer/rules/sdk';

import { contentCatalog } from './index';

/**
 * Player Core's class features and feats raise ranks as Foundry's `subfeatures.proficiencies` did (#567): the
 * committed Fighter, resolved through its grants, keeps its 1st-level ranks and gains its later ones.
 */

const registry = new ContentRegistry();
await Promise.all(contentCatalog.map(async (loader) => registry.load(loader)));
const entries = registry.packs.flatMap((pack) => pack.otherEntries);
const FIGHTER = entries.find(({ slug }) => slug === EntrySlug.parse('class:fighter'));

/** The committed Fighter's ranks at `level`, with no picks made. */
function fighterRanksAt(level: number): ReadonlyMap<Selector, Proficiency> {
  if (FIGHTER === undefined) {
    throw new Error('class:fighter is not in the catalog');
  }
  const grants = resolveGrants({
    roots: [{ entry: FIGHTER.id, hop: { kind: 'choice', slot: SlotKey.parse('class') } }],
    lookup: grantLookup(registry),
    level: Level.parse(level),
    situation: [],
    picks: new Map(),
    rootSlots: [],
    toggles: new Map(),
    namespaces: registry.rollOptionNamespaces(),
  });
  const rules: RuleInPlay[] = grants.items.flatMap(({ entry, origin }) =>
    entry.rules.map((element, rule) => ({ element, origin, rule: RuleIndex.parse(rule) })),
  );
  return ranksInPlay({ rules, facts: grants.facts });
}

const ARMOUR = ['defense:unarmored', 'defense:light', 'defense:medium', 'defense:heavy'];

/** The ranks the issue checks, by selector. */
function ranksOf(ranks: ReadonlyMap<Selector, Proficiency>, selectors: readonly string[]): Record<string, string> {
  return Object.fromEntries(
    selectors.map((selector) => [selector, ranks.get(Selector.parse(selector)) ?? 'untrained']),
  );
}

describe('Player Core proficiency increases', () => {
  test("the golden Fighter's 1st-level ranks still hold", () => {
    const ranks = fighterRanksAt(1);

    expect(
      ranksOf(ranks, [
        'perception',
        'save:fortitude',
        'save:reflex',
        'save:will',
        'attack:unarmed',
        'attack:simple',
        'attack:martial',
        'attack:advanced',
        ...ARMOUR,
        'class-dc',
      ]),
    ).toStrictEqual({
      perception: 'expert',
      'save:fortitude': 'expert',
      'save:reflex': 'expert',
      'save:will': 'trained',
      'attack:unarmed': 'expert',
      'attack:simple': 'expert',
      'attack:martial': 'expert',
      'attack:advanced': 'trained',
      'defense:unarmored': 'trained',
      'defense:light': 'trained',
      'defense:medium': 'trained',
      'defense:heavy': 'trained',
      'class-dc': 'trained',
    });
  });

  test('a Fighter with Armor Expertise is expert in every armour category', () => {
    const ranks = fighterRanksAt(11);

    expect(ranksOf(ranks, ARMOUR)).toStrictEqual({
      'defense:unarmored': 'expert',
      'defense:light': 'expert',
      'defense:medium': 'expert',
      'defense:heavy': 'expert',
    });
  });

  test("a Fighter's later features raise Perception, saves and class DC", () => {
    const ranks = fighterRanksAt(20);

    expect(ranksOf(ranks, ['perception', 'save:fortitude', 'save:reflex', 'class-dc'])).toStrictEqual({
      perception: 'master',
      'save:fortitude': 'master',
      'save:reflex': 'master',
      'class-dc': 'master',
    });
  });
});
