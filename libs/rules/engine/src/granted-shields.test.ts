import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { Hardness, HitPoints } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { shieldsInPlay } from './granted-shields';
import { inPlay } from './testing/builders';

const FACTS = new PredicateFacts([], CORE_NAMESPACES);

const SHIELD = {
  key: 'GrantShield',
  hardness: 5,
  endsOnBlock: true,
  raised: true,
  brackets: [
    { start: 3, hardness: 10 },
    { start: 5, hardness: 15 },
  ],
};
const ARM = {
  key: 'GrantShield',
  hardness: 4,
  hitPoints: 15,
  brokenThreshold: 0,
  endsWhenDestroyed: true,
  brackets: [{ start: 3, hardness: 8, hitPoints: 30 }],
};

function hardnessAt(itemLevel: number | undefined): Hardness | undefined {
  const [shield] = shieldsInPlay({
    rules: [inPlay(SHIELD, 'shield', itemLevel === undefined ? {} : { itemLevel })],
    facts: FACTS,
  });
  return shield?.hardness;
}

describe('shieldsInPlay', () => {
  test('a shield is heightened to the spell rank it was cast at, and is the base without a rank', () => {
    expect(hardnessAt(undefined)).toBe(Hardness.parse(5));
    expect(hardnessAt(2)).toBe(Hardness.parse(5));
    expect(hardnessAt(3)).toBe(Hardness.parse(10));
    expect(hardnessAt(6)).toBe(Hardness.parse(15));
  });

  test('a shield with no Hit Points takes no damage and is never broken', () => {
    const [shield] = shieldsInPlay({ rules: [inPlay(SHIELD, 'shield')], facts: FACTS });

    expect(shield).toMatchObject({ hitPoints: undefined, brokenThreshold: 0, endsOnBlock: true });
  });

  test('a shield the cast raises says so, and one that is not raised does not', () => {
    const [raised] = shieldsInPlay({ rules: [inPlay(SHIELD, 'shield')], facts: FACTS });
    const [lowered] = shieldsInPlay({ rules: [inPlay(ARM, 'arm')], facts: FACTS });

    expect([raised?.raised, lowered?.raised]).toStrictEqual([true, false]);
  });

  test('a bracket changes the Hit Points too, and a Broken Threshold of 0 stays', () => {
    const [shield] = shieldsInPlay({ rules: [inPlay(ARM, 'arm', { itemLevel: 3 })], facts: FACTS });

    expect(shield).toMatchObject({
      hardness: Hardness.parse(8),
      hitPoints: HitPoints.parse(30),
      brokenThreshold: HitPoints.parse(0),
      endsWhenDestroyed: true,
    });
  });

  test('without a Broken Threshold the shield breaks at half its Hit Points', () => {
    const [shield] = shieldsInPlay({
      rules: [inPlay({ key: 'GrantShield', hardness: 5, hitPoints: 20 }, 'plain')],
      facts: FACTS,
    });

    expect(shield?.brokenThreshold).toBe(HitPoints.parse(10));
  });

  test('a shield whose predicate does not hold is not in play', () => {
    const rules = [inPlay({ ...SHIELD, predicate: ['self:effect:rage'] }, 'shield')];

    expect(shieldsInPlay({ rules, facts: FACTS })).toStrictEqual([]);
  });

  test('a battle form carries its own shield beside the effects', () => {
    const form = inPlay({ key: 'BattleForm', form: { shield: { hardness: 15 } } }, 'avatar');
    const shields = shieldsInPlay({ rules: [form, inPlay(SHIELD, 'shield')], facts: FACTS });

    expect(shields.map(({ hardness }) => hardness)).toStrictEqual([Hardness.parse(5), Hardness.parse(15)]);
  });
});
