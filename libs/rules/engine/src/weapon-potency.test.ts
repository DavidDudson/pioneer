import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { contentId, EntrySlug, PackId, Selector, StatisticDefinition, StatisticKind } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';
import { message } from '@pioneer/shared/kernel';

import { LineStatusKind, SuppressionReason } from './breakdown';
import type { BreakdownLine } from './breakdown';
import { deriveStatistics } from './derive-statistics';
import { EngineMessage } from './messages';
import { RuleId, ruleIdOf } from './rule-in-play';
import type { RuleInPlay } from './rule-in-play';
import { StatisticInputsJson } from './statistic-inputs';
import type { StatisticResult } from './statistic-result';
import { flatModifier, inPlay, wielded } from './testing';

const STRIKE = StatisticDefinition.parse({
  slug: 'statistic:strike',
  name: 'strike',
  selector: 'strike',
  domains: ['check', 'attack-roll', 'strike-attack-roll'],
  base: '@weapon.attr + @weapon.prof',
  kind: StatisticKind.Check,
  per: 'weapon',
});

const LONGSWORD = wielded({ slug: 'longsword', category: 'martial', traits: [], potency: 1 });
const POTENCY_ID = RuleId.parse('weapon:longsword#weapon-potency');
/** Strength 4 plus trained 3 at level 1. */
const BASE = 4 + 3;

/** A level 1 character with Strength 4, trained in martial weapons, wielding `weapon`. */
function inputsWith(weapon: object): object {
  return {
    level: 1,
    attributes: { str: 4, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    ranks: { 'attack:martial': 'trained' },
    weapons: [weapon],
  };
}

/** The longsword's Strike. */
function strike(weapon: object, rules: readonly RuleInPlay[] = []): StatisticResult | undefined {
  const inputs = StatisticInputsJson.parse(inputsWith(weapon));
  const content = { definitions: [STRIKE], proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS };
  const facts = new PredicateFacts([], CORE_NAMESPACES);
  return deriveStatistics(content, inputs, { rules, facts }).get(Selector.parse('strike:longsword'));
}

function lines(result: StatisticResult | undefined): readonly BreakdownLine[] {
  return result?.ok === true ? result.lines : [];
}

function lineWithId(result: StatisticResult | undefined, id: RuleId): BreakdownLine | undefined {
  return lines(result).find(({ modifier }) => modifier.id === id);
}

describe('weapon potency', () => {
  test('reaches its Strike as an item line whose origin and label name the weapon', () => {
    const result = strike(LONGSWORD);
    expect(result).toMatchObject({ ok: true, baseValue: BASE, total: BASE + 1 });
    const line: unknown = lineWithId(result, POTENCY_ID);
    expect(line).toStrictEqual({
      modifier: {
        id: POTENCY_ID,
        slug: 'weapon-potency',
        label: {
          message: message(EngineMessage.WeaponPotency, { weapon: 'longsword' }),
          named: { param: 'weapon', origin: LONGSWORD.origin },
        },
        type: 'item',
        targets: ['strike:longsword'],
        predicate: undefined,
        origin: {
          hops: [],
          entry: contentId(PackId.parse('engine-test'), EntrySlug.parse('weapon:longsword')),
          sources: [{ kind: 'book', book: 'player-core', page: 1 }],
        },
      },
      value: 1,
      adjustedBy: [],
      status: { kind: LineStatusKind.Applied },
    });
  });

  test('a weapon without potency has no potency line', () => {
    const { potency: _potency, ...plain } = LONGSWORD;
    const result = strike(plain);
    expect(result).toMatchObject({ ok: true, total: BASE });
    expect(lines(result)).toStrictEqual([]);
  });

  test('potency +1 with a +2 item bonus to strike-attack-roll gives +2, the potency line suppressed', () => {
    const mutagen = inPlay(flatModifier('item', 2, ['strike-attack-roll']), 'mutagen');
    const result = strike(LONGSWORD, [mutagen]);
    expect(result).toMatchObject({ ok: true, total: BASE + 2 });
    expect(lineWithId(result, POTENCY_ID)?.status).toStrictEqual({
      kind: LineStatusKind.Suppressed,
      by: ruleIdOf(mutagen),
      reason: SuppressionReason.Stacking,
    });
  });

  test('a higher potency suppresses a lower item bonus; untyped and status bonuses still add', () => {
    const weaker = inPlay(flatModifier('item', 1, ['attack-roll']), 'weaker');
    const rules = [
      weaker,
      inPlay(flatModifier('untyped', 1, ['strike-attack-roll']), 'untyped'),
      inPlay(flatModifier('status', 1, ['attack-roll']), 'heroism'),
    ];
    const result = strike({ ...LONGSWORD, potency: 2 }, rules);
    expect(result).toMatchObject({ ok: true, total: BASE + 2 + 1 + 1 });
    expect(lineWithId(result, ruleIdOf(weaker))?.status).toStrictEqual({
      kind: LineStatusKind.Suppressed,
      by: POTENCY_ID,
      reason: SuppressionReason.Stacking,
    });
  });

  test('an AdjustModifier finds the line by its slug', () => {
    const upgrade = inPlay(
      { key: 'AdjustModifier', selectors: ['strike-attack-roll'], slug: 'weapon-potency', mode: 'upgrade', value: 2 },
      'upgrade',
    );
    const result = strike(LONGSWORD, [upgrade]);
    expect(result).toMatchObject({ ok: true, total: BASE + 2 });
    expect(lineWithId(result, POTENCY_ID)).toMatchObject({ value: 2, adjustedBy: [ruleIdOf(upgrade)] });
  });

  test('a potency-typed bonus, as Automatic Bonus Progression adds, needs no line and stacks apart from item', () => {
    const { potency: _potency, ...runeless } = LONGSWORD;
    const rules = [
      inPlay(flatModifier('potency', 1, ['strike-attack-roll']), 'attack-potency'),
      inPlay(flatModifier('item', 2, ['strike-attack-roll']), 'mutagen'),
    ];
    const result = strike(runeless, rules);
    expect(result).toMatchObject({ ok: true, total: BASE + 1 + 2 });
    expect(lineWithId(result, POTENCY_ID)).toBeUndefined();
  });

  test('a weapon without an origin is an issue at its origin', () => {
    const { origin: _origin, ...bare } = LONGSWORD;
    const parsed = StatisticInputsJson.safeParse(inputsWith(bare));
    expect(parsed.error?.issues.map(({ path }) => path)).toStrictEqual([['weapons', 0, 'origin']]);
  });
});
