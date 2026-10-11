import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { contentId, EntrySlug, PackId, Selector, StatisticDefinition, StatisticKind } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';

import { LineStatusKind, SuppressionReason } from './breakdown';
import type { BreakdownLine } from './breakdown';
import { deriveStatistics } from './derive-statistics';
import { RuleId, ruleIdOf } from './rule-in-play';
import type { RuleInPlay } from './rule-in-play';
import { StatisticInputsJson } from './statistic-inputs';
import type { StatisticResult } from './statistic-result';
import { flatModifier, inPlay } from './testing';

const AC = StatisticDefinition.parse({
  slug: 'statistic:ac',
  name: 'ac',
  selector: 'ac',
  domains: ['dex-based'],
  base: '10 + @attr.dex.capped + @prof.ac',
  kind: StatisticKind.Dc,
});

const LEATHER = contentId(PackId.parse('engine-test'), EntrySlug.parse('armor:leather-armor'));
const ORIGIN = {
  hops: [{ kind: 'inventory', item: '44444444-4444-4444-8444-444444444444', state: 'worn' }],
  entry: LEATHER,
  sources: [{ kind: 'book', book: 'player-core', page: 1 }],
};
const ARMOR_ID = RuleId.parse(`${LEATHER}#armor-bonus`);
/** 10, Dexterity 3 capped at 2, untrained. */
const BASE = 10 + 2;

/** A level 1 character with Dexterity 3 wearing armour of `bonus` with a Dexterity cap of 2. */
function ac(bonus: number | undefined, rules: readonly RuleInPlay[] = []): StatisticResult | undefined {
  const inputs = StatisticInputsJson.parse({
    level: 1,
    attributes: { str: 0, dex: 3, con: 0, int: 0, wis: 0, cha: 0 },
    ranks: {},
    dexterityCap: 2,
    ...(bonus === undefined ? {} : { armor: { bonus, origin: ORIGIN } }),
  });
  const content = { definitions: [AC], proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS };
  return deriveStatistics(content, inputs, { rules, facts: new PredicateFacts([], CORE_NAMESPACES) }).get(
    Selector.parse('ac'),
  );
}

function armorLine(result: StatisticResult | undefined): BreakdownLine | undefined {
  return result?.ok === true ? result.lines.find(({ modifier }) => modifier.id === ARMOR_ID) : undefined;
}

describe('armour bonus', () => {
  test('reaches AC as an item line named by the armour, with its inventory origin', () => {
    const result = ac(1);
    expect(result).toMatchObject({ ok: true, baseValue: BASE, total: BASE + 1 });
    expect(armorLine(result)).toMatchObject({
      modifier: { slug: 'armor-bonus', label: { entry: LEATHER }, type: 'item', targets: ['ac'], origin: ORIGIN },
      value: 1,
      status: { kind: LineStatusKind.Applied },
    });
  });

  test('no armour, or armour with no bonus, adds no line', () => {
    expect(ac(undefined)).toMatchObject({ ok: true, total: BASE, lines: [] });
    expect(ac(0)).toMatchObject({ ok: true, total: BASE, lines: [] });
  });

  test('stacks as an item bonus: a higher item bonus to AC suppresses it', () => {
    const bracers = inPlay(flatModifier('item', 2, ['ac']), 'bracers');
    const result = ac(1, [bracers]);
    expect(result).toMatchObject({ ok: true, total: BASE + 2 });
    expect(armorLine(result)?.status).toStrictEqual({
      kind: LineStatusKind.Suppressed,
      by: ruleIdOf(bracers),
      reason: SuppressionReason.Stacking,
    });
  });

  test('a status bonus still adds', () => {
    const shieldSpell = inPlay(flatModifier('status', 1, ['ac']), 'shield-spell');
    expect(ac(1, [shieldSpell])).toMatchObject({
      ok: true,
      total: BASE + 1 + 1,
    });
  });
});
