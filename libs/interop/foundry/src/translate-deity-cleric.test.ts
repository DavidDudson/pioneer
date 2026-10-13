import { describe, expect, test } from 'bun:test';

import { RuleElementKey } from '@pioneer/rules/sdk';

import { rulesIn } from './testing/build-helpers';
import { DEITY_CLERIC, THIRD_DOCTRINE_WARPRIEST } from './testing/deity-fixtures';
import { translate } from './testing/import-fixtures';
import type { DocumentFixture } from './testing/import-fixtures';

const { Proficiency } = RuleElementKey;

function keyed(key: string, name: string, fixture: DocumentFixture): unknown[] {
  return rulesIn(translate([fixture]), name).filter(
    (rule) => typeof rule === 'object' && rule !== null && 'key' in rule && rule.key === key,
  );
}

/** The `key`s of the Foundry elements an entry's import leaves for the backlog. */
function untranslatedKeys(fixture: DocumentFixture): readonly string[] {
  return translate([fixture]).envelopes.untranslatedRules.map(({ key }) => key);
}

describe('translateKindData: the favoured weapon rank', () => {
  test("Deity (Cleric) makes a cleric trained in the deity's favoured weapons", () => {
    expect(keyed(Proficiency, 'deity-cleric', DEITY_CLERIC)).toEqual([
      { key: Proficiency, selector: 'attack:favored-weapon', rank: 'trained', predicate: ['class:cleric'] },
    ]);
    expect(untranslatedKeys(DEITY_CLERIC)).not.toContain('ActiveEffectLike');
  });

  test("a warpriest's doctrine raises it, by Foundry's number for the rank", () => {
    expect(keyed(Proficiency, 'third-doctrine-warpriest', THIRD_DOCTRINE_WARPRIEST)).toEqual([
      { key: Proficiency, selector: 'attack:favored-weapon', rank: 'expert' },
    ]);
  });

  test('a formula for the rank is left for the backlog', () => {
    const formula: DocumentFixture = {
      ...THIRD_DOCTRINE_WARPRIEST,
      system: {
        ...THIRD_DOCTRINE_WARPRIEST.system,
        rules: [
          { key: 'ActiveEffectLike', mode: 'upgrade', path: 'flags.system.favoredWeaponRank', value: '@actor.level' },
        ],
      },
    };
    expect(untranslatedKeys(formula)).toEqual(['ActiveEffectLike']);
  });
});

describe('translateKindData: actor traits', () => {
  test("Deity (Cleric) gives the holy or unholy trait by the cleric's sanctification", () => {
    expect(keyed(RuleElementKey.ActorTraits, 'deity-cleric', DEITY_CLERIC)).toEqual([
      { key: RuleElementKey.ActorTraits, add: ['holy'], predicate: ['sanctification:holy'] },
      { key: RuleElementKey.ActorTraits, add: ['unholy'], predicate: ['sanctification:unholy'] },
    ]);
  });
});

describe('translateKindData: a fist Strike', () => {
  test('Deity (Cleric) gives a fist while the deity favours it, which Foundry writes as Pioneer reads it', () => {
    expect(keyed(RuleElementKey.Strike, 'deity-cleric', DEITY_CLERIC)).toEqual([
      { key: RuleElementKey.Strike, fist: true, predicate: ['deity:primary:favored-weapon:fist'] },
    ]);
    // Left: the deity's ChoiceSet and GrantItem, which the root slot replaces, and the self-guarded sanctification.
    expect(untranslatedKeys(DEITY_CLERIC).toSorted()).toEqual(['ChoiceSet', 'ChoiceSet', 'GrantItem']);
  });
});

const JAWS: DocumentFixture = {
  id: 'jAwS000000000000',
  name: 'Jaws',
  type: 'feat',
  system: {
    rules: [
      {
        key: 'Strike',
        slug: 'jaws',
        label: 'Jaws',
        category: 'unarmed',
        group: 'brawling',
        damage: { base: { damageType: 'piercing', die: 'd8' } },
        traits: ['finesse'],
      },
    ],
    traits: { rarity: 'common', value: [] },
  },
};

describe('translateKindData: a Strike of its own', () => {
  test("reads Foundry's damage.base as damage, one die by default, and the label as its display", () => {
    expect(keyed(RuleElementKey.Strike, 'jaws', JAWS)).toEqual([
      {
        key: RuleElementKey.Strike,
        slug: 'jaws',
        category: 'unarmed',
        group: 'brawling',
        damage: { dice: 1, die: 'd8', damageType: 'piercing' },
        traits: ['finesse'],
        display: { label: 'Jaws' },
      },
    ]);
    expect(untranslatedKeys(JAWS)).toEqual([]);
  });
});
