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

const FORTITUDE = StatisticDefinition.parse({
  slug: 'statistic:fortitude',
  name: 'fortitude',
  selector: 'save:fortitude',
  domains: ['check', 'saving-throw', 'con-based'],
  base: '@attr.con + @prof.save.fortitude',
  kind: StatisticKind.Check,
});

/** A level 1 character with Constitution 2 wearing armour with a resilient rune of `resilient`. */
function fortitude(resilient: number | undefined, rules: readonly RuleInPlay[] = []): StatisticResult | undefined {
  const inputs = StatisticInputsJson.parse({
    level: 1,
    attributes: { str: 0, dex: 0, con: 2, int: 0, wis: 0, cha: 0 },
    ranks: {},
    armor: { bonus: 1, origin: ORIGIN, ...(resilient === undefined ? {} : { resilient }) },
  });
  const content = { definitions: [FORTITUDE], proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS };
  return deriveStatistics(content, inputs, { rules, facts: new PredicateFacts([], CORE_NAMESPACES) }).get(
    Selector.parse('save:fortitude'),
  );
}

function resilientLine(result: StatisticResult | undefined): BreakdownLine | undefined {
  return result?.ok === true ? result.lines.find(({ modifier }) => modifier.slug === 'resilient') : undefined;
}

describe('resilient rune', () => {
  test('reaches every save as an item line named by the armour', () => {
    const result = fortitude(2);
    expect(result).toMatchObject({ ok: true, baseValue: 2, total: 2 + 2 });
    expect(resilientLine(result)).toMatchObject({
      modifier: { label: { entry: LEATHER }, type: 'item', targets: ['saving-throw'], origin: ORIGIN },
      value: 2,
      status: { kind: LineStatusKind.Applied },
    });
  });

  test('no resilient rune adds no line to saves', () => {
    expect(fortitude(undefined)).toMatchObject({ ok: true, total: 2, lines: [] });
  });

  test('stacks as an item bonus: a higher item bonus to the save suppresses it', () => {
    const cloak = inPlay(flatModifier('item', 3, ['save:fortitude']), 'cloak');
    expect(fortitude(1, [cloak])).toMatchObject({ ok: true, total: 2 + 3 });
  });
});

const ATHLETICS = StatisticDefinition.parse({
  slug: 'statistic:athletics',
  name: 'athletics',
  selector: 'skill:athletics',
  domains: ['check', 'skill', 'str-based'],
  base: '@attr.str + @prof.skill.athletics',
  kind: StatisticKind.Check,
});

const DIPLOMACY = StatisticDefinition.parse({
  slug: 'statistic:diplomacy',
  name: 'diplomacy',
  selector: 'skill:diplomacy',
  domains: ['check', 'skill', 'cha-based'],
  base: '@attr.cha + @prof.skill.diplomacy',
  kind: StatisticKind.Check,
});

/** Armour with a check penalty of 2 and a Strength entry of 2. */
const PENALISED = { checkPenalty: 2, strength: 2 };

/** A level 1 character with Strength `str` wearing armour with a check penalty of 2 and a Strength entry of 2. */
function skill(selector: string, str: number, armor: object): StatisticResult | undefined {
  const inputs = StatisticInputsJson.parse({
    level: 1,
    attributes: { str, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    ranks: {},
    armor: { bonus: 1, origin: ORIGIN, ...armor },
  });
  const content = { definitions: [ATHLETICS, DIPLOMACY], proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS };
  return deriveStatistics(content, inputs, { rules: [], facts: new PredicateFacts([], CORE_NAMESPACES) }).get(
    Selector.parse(selector),
  );
}

describe('armour check penalty', () => {
  test('reaches a Strength- or Dexterity-based skill as an item penalty named by the armour', () => {
    const result = skill('skill:athletics', 1, PENALISED);
    expect(result).toMatchObject({ ok: true, baseValue: 1, total: 1 - 2 });
    expect(result).toMatchObject({
      ok: true,
      lines: [
        {
          modifier: { slug: 'check-penalty', label: { entry: LEATHER }, type: 'item', origin: ORIGIN },
          value: -2,
          status: { kind: LineStatusKind.Applied },
        },
      ],
    });
  });

  test('goes away once Strength meets the armour', () => {
    expect(skill('skill:athletics', 2, PENALISED)).toMatchObject({ ok: true, total: 2, lines: [] });
  });

  test('applies at any Strength when the armour names none', () => {
    expect(skill('skill:athletics', 4, { checkPenalty: 2 })).toMatchObject({ ok: true, total: 4 - 2 });
  });

  test('leaves a skill keyed to another attribute alone', () => {
    expect(skill('skill:diplomacy', 0, PENALISED)).toMatchObject({ ok: true, total: 0, lines: [] });
  });

  test('armour with no check penalty adds none', () => {
    expect(skill('skill:athletics', 0, {})).toMatchObject({ ok: true, total: 0, lines: [] });
  });
});
