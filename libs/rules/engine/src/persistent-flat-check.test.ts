import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { Dc, RollOption } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';

import { DefenceStatusKind, deriveDefences } from './defences';
import type { PersistentFlatCheckLine } from './defences';
import { ruleIdOf } from './rule-in-play';
import type { RuleInPlay } from './rule-in-play';
import { StatisticInputsJson } from './statistic-inputs';
import { inPlay } from './testing';

const inputs = StatisticInputsJson.parse({
  level: 12,
  attributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
  ranks: {},
});
const content = { definitions: [], proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS };
const facts = new PredicateFacts([], CORE_NAMESPACES);
const factsRaging = new PredicateFacts([RollOption.parse('self:effect:rage')], CORE_NAMESPACES);

const QUENCHING_DC = Dc.parse(12);
const QUENCHING_ASSISTED_DC = Dc.parse(7);

function check(fields: object = {}): object {
  return {
    key: 'PersistentFlatCheck',
    damageTypes: ['acid', 'fire'],
    dc: QUENCHING_DC,
    assistedDc: QUENCHING_ASSISTED_DC,
    ...fields,
  };
}

function checks(rules: readonly RuleInPlay[], using: PredicateFacts = facts): readonly PersistentFlatCheckLine[] {
  return deriveDefences(content, inputs, { rules, facts: using }).persistentFlatChecks;
}

describe('PersistentFlatCheck', () => {
  test('a check is a line with its types, DCs, origin and label', () => {
    const rule = inPlay(check(), 'quenching');

    expect(checks([rule])).toStrictEqual([
      {
        id: ruleIdOf(rule),
        label: { entry: rule.origin.entry },
        origin: rule.origin,
        damageTypes: ['acid', 'fire'],
        dc: QUENCHING_DC,
        assistedDc: QUENCHING_ASSISTED_DC,
        status: { kind: DefenceStatusKind.Applied },
      },
    ]);
  });

  test('a check with no assisted DC leaves it undefined: assistance ends the damage', () => {
    const [line] = checks([inPlay(check({ assistedDc: undefined }), 'quenching-true')]);

    expect(line?.assistedDc).toBeUndefined();
  });

  test('a check whose predicate fails is left out, and one that holds applies', () => {
    const gated = inPlay(check({ predicate: ['self:effect:rage'] }), 'quenching');

    expect(checks([gated])).toStrictEqual([]);
    expect(checks([gated], factsRaging).map(({ status }) => status.kind)).toStrictEqual([DefenceStatusKind.Applied]);
  });
});
